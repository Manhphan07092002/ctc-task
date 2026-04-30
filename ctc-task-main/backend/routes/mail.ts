import { Router } from 'express';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import multer from 'multer';
// @ts-ignore
import MailComposer from 'nodemailer/lib/mail-composer';
import tls from 'tls';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';
import { requireAuth } from '../middleware/auth.js';

export function mailRoutes(db: any) {
  const router = Router();

  const IMAP_HOST = 'imap.vnptemail.vn';
  const IMAP_PORT = 993;
  const SMTP_HOST = 'smtp.vnptemail.vn';
  const SMTP_PORT = 587; // STARTTLS

  // 1. Connect and Save Credentials
  router.post('/connect', requireAuth, async (req: any, res: any) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    console.log(`[IMAP Connect] Vừa nhận yêu cầu đăng nhập từ tài khoản: "${email}"`);

    try {
      const authResult = await new Promise<{ success: boolean, reason?: string }>((resolve, reject) => {
        const socket = tls.connect(IMAP_PORT, IMAP_HOST, { rejectUnauthorized: false });

        // Timeout after 15s
        const timer = setTimeout(() => {
          socket.destroy();
          resolve({ success: false, reason: 'Connection timeout' });
        }, 15000);

        let buffer = '';
        let loginAttempt = 1; // 1 = full email, 2 = username only
        let greetingReceived = false;

        socket.on('data', (data: any) => {
          buffer += data.toString();
          console.log('[IMAP RAW]', data.toString().trim());

          // Wait for greeting
          if (!greetingReceived && buffer.includes('* OK')) {
            greetingReceived = true;
            socket.write(`A1 LOGIN "${email}" "${password}"\r\n`);
          }

          if (greetingReceived) {
            if (buffer.includes('A1 OK') || buffer.includes('A2 OK')) {
              clearTimeout(timer);
              socket.write('A3 LOGOUT\r\n');
              resolve({ success: true });
            } else if (buffer.includes('A1 NO') || buffer.includes('A1 BAD')) {
              if (loginAttempt === 1) {
                // Try just the username part
                loginAttempt = 2;
                const usernameOnly = email.split('@')[0];
                console.log(`[IMAP Connect] Full email failed. Trying username only: ${usernameOnly}`);
                socket.write(`A2 LOGIN "${usernameOnly}" "${password}"\r\n`);
              }
            } else if (buffer.includes('A2 NO') || buffer.includes('A2 BAD')) {
              clearTimeout(timer);
              socket.destroy();
              resolve({ success: false, reason: buffer });
            }
          }
        });

        socket.on('error', (err: any) => {
          clearTimeout(timer);
          resolve({ success: false, reason: err.message });
        });
      });

      if (!authResult.success) {
        console.error('Raw TLS Login failed:', authResult.reason);
        throw new Error('AUTHENTICATE failed');
      }

      // If successful, encrypt and save both email and password
      const mailAuthData = JSON.stringify({ email, password });
      const encryptedData = encrypt(mailAuthData);
      await db.run('UPDATE users SET mailPassword = ? WHERE id = ?', [encryptedData, req.user.id]);

      res.json({ success: true, message: 'Connected successfully' });
    } catch (error: any) {
      console.error('Mail connect error:', error);
      let errMsg = error.message || 'Lỗi không xác định';
      if (errMsg.includes('AUTHENTICATE failed')) {
        errMsg = 'Tài khoản Email hoặc Mật khẩu VNPT không chính xác. Vui lòng kiểm tra lại!';
      }
      res.status(401).json({ error: errMsg });
    }
  });

  // 2. Helper to get IMAP client
  const getImapClient = async (userId: string, defaultEmail: string) => {
    const user = await db.get('SELECT mailPassword FROM users WHERE id = ?', [userId]);
    if (!user || !user.mailPassword) throw new Error('No mail credentials found');

    const decryptedStr = decrypt(user.mailPassword);
    if (!decryptedStr) throw new Error('Failed to decrypt password');

    let email = defaultEmail;
    let password = decryptedStr;
    try {
      const parsed = JSON.parse(decryptedStr);
      if (parsed.email && parsed.password) {
        email = parsed.email;
        password = parsed.password;
      }
    } catch (e) {
      // It's a raw password from old format
    }

    let client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: email, pass: password },
      logger: false as any,
      tls: {
        rejectUnauthorized: false
      }
    });

    try {
      await client.connect();
    } catch (err: any) {
      if (err.message?.includes('AUTHENTICATE failed')) {
        // Retry with just the username
        const usernameOnly = email.split('@')[0];
        console.log(`[ImapFlow] Full email failed. Retrying with username: ${usernameOnly}`);
        client = new ImapFlow({
          host: IMAP_HOST,
          port: IMAP_PORT,
          secure: true,
          auth: { user: usernameOnly, pass: password },
          logger: false as any,
          tls: { rejectUnauthorized: false }
        });
        await client.connect();
      } else {
        throw err;
      }
    }
    return client;
  };

  // 3. Helper to get SMTP transporter (cached per user for performance)
  const smtpCache = new Map<string, any>();

  const getSmtpTransporter = async (userId: string, defaultEmail: string) => {
    // Return cached transporter if available
    if (smtpCache.has(userId)) {
      return smtpCache.get(userId);
    }

    const user = await db.get('SELECT mailPassword FROM users WHERE id = ?', [userId]);
    if (!user || !user.mailPassword) throw new Error('No mail credentials found');

    const decryptedStr = decrypt(user.mailPassword);
    if (!decryptedStr) throw new Error('Failed to decrypt password');

    let email = defaultEmail;
    let password = decryptedStr;
    try {
      const parsed = JSON.parse(decryptedStr);
      if (parsed.email && parsed.password) {
        email = parsed.email;
        password = parsed.password;
      }
    } catch (e) {
      // It's a raw password from old format
    }

    const makeTransporter = (user: string) => nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: { user, pass: password },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 60000,
      greetingTimeout: 60000,
      socketTimeout: 60000,
    });

    let transporter = makeTransporter(email);

    // Verify connection once; retry with username only if auth fails
    try {
      await transporter.verify();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login') || msg.includes('AuthError') || msg.includes('535')) {
        const usernameOnly = email.split('@')[0];
        console.log(`[SMTP] Retrying with username only: ${usernameOnly}`);
        transporter = makeTransporter(usernameOnly);
        await transporter.verify();
      } else {
        throw err;
      }
    }

    // Cache for future sends (invalidate after 10 minutes)
    smtpCache.set(userId, transporter);
    setTimeout(() => smtpCache.delete(userId), 10 * 60 * 1000);

    return transporter;
  };

  // Helper: detect IMAP/SMTP auth errors (ImapFlow throws 'Command failed' with authenticationFailed=true)
  const isMailAuthError = (error: any): boolean => {
    if (!error) return false;
    if (error.authenticationFailed === true) return true;
    const msg = (error.message || '').toLowerCase();
    const responseText = (error.responseText || '').toLowerCase();
    const response = (error.response || '').toLowerCase();
    return (
      msg.includes('no mail credentials') ||
      msg.includes('authenticate failed') ||
      msg.includes('authentication failed') ||
      responseText.includes('authenticate failed') ||
      response.includes('authenticate failed') ||
      msg.includes('invalid login') ||
      msg.includes('autherror')
    );
  };

  // 3a. Fetch company contacts (all users in DB + IMAP history)
  router.get('/contacts', requireAuth, async (req: any, res: any) => {
    try {
      // 1) Get all company users from DB
      const dbUsers = await db.all('SELECT id, name, email, department, avatar FROM users ORDER BY name ASC');
      
      // 2) Try to get recent IMAP contacts (best-effort)
      let imapContacts: { email: string; name: string; source: string }[] = [];
      try {
        const client = await getImapClient(req.user.id, req.user.email);
        const contactSet = new Map<string, { email: string; name: string; count: number }>();

        // Scan sent folder
        const sentCandidates = ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent'];
        let sentFolder = '';
        for (const name of sentCandidates) {
          try { const l = await client.getMailboxLock(name); l.release(); sentFolder = name; break; } catch (_) {}
        }

        if (sentFolder) {
          const lock = await client.getMailboxLock(sentFolder);
          try {
            const mailbox = client.mailbox;
            if (mailbox !== false && (mailbox as any).exists > 0) {
              const count = (mailbox as any).exists as number;
              const start = Math.max(1, count - 199);
              for await (const msg of client.fetch(`${start}:${count}`, { envelope: true })) {
                const toList = [...(msg.envelope?.to || []), ...(msg.envelope?.cc || [])];
                for (const addr of toList) {
                  if (!addr.address) continue;
                  const key = addr.address.toLowerCase();
                  const existing = contactSet.get(key);
                  if (existing) existing.count++;
                  else contactSet.set(key, { email: addr.address, name: addr.name || '', count: 1 });
                }
              }
            }
          } finally { lock.release(); }
        }

        // Scan inbox (From addresses)
        const inboxLock = await client.getMailboxLock('INBOX');
        try {
          const mailbox = client.mailbox;
          if (mailbox !== false && (mailbox as any).exists > 0) {
            const count = (mailbox as any).exists as number;
            const start = Math.max(1, count - 199);
            for await (const msg of client.fetch(`${start}:${count}`, { envelope: true })) {
              const fromList = msg.envelope?.from || [];
              for (const addr of fromList) {
                if (!addr.address) continue;
                const key = addr.address.toLowerCase();
                const existing = contactSet.get(key);
                if (existing) existing.count++;
                else contactSet.set(key, { email: addr.address, name: addr.name || '', count: 1 });
              }
            }
          }
        } finally { inboxLock.release(); await client.logout(); }

        imapContacts = Array.from(contactSet.values())
          .sort((a, b) => b.count - a.count)
          .map(c => ({ email: c.email, name: c.name, source: 'imap' }));
      } catch (imapErr: any) {
        console.warn('[Contacts] IMAP scan skipped:', imapErr.message);
      }

      // 3) Build response: company users first, then external IMAP contacts not already in company
      const companyEmails = new Set(dbUsers.map((u: any) => u.email?.toLowerCase()));
      
      const companyContacts = dbUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department || '',
        avatar: u.avatar || '',
        source: 'company',
      }));

      const externalContacts = imapContacts
        .filter(c => !companyEmails.has(c.email.toLowerCase()))
        .slice(0, 50)
        .map(c => ({ id: null, name: c.name, email: c.email, department: '', avatar: '', source: 'external' }));

      res.json({ company: companyContacts, external: externalContacts });
    } catch (error: any) {
      console.error('Contacts error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3b. Fetch recent recipients (for autocomplete)
  router.get('/recipients', requireAuth, async (req: any, res: any) => {
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      // Try to open Sent folder
      const sentCandidates = ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent'];
      let sentFolder = '';
      for (const name of sentCandidates) {
        try {
          const testLock = await client.getMailboxLock(name);
          testLock.release();
          sentFolder = name;
          break;
        } catch (_) { /* try next */ }
      }
      if (!sentFolder) {
        await client.logout();
        return res.json([]);
      }

      const lock = await client.getMailboxLock(sentFolder);
      try {
        const recipientSet = new Map<string, { email: string; name: string; count: number }>();
        const mailbox = client.mailbox;
        if (mailbox !== false) {
          const count = mailbox.exists || 0;
          const start = Math.max(1, count - 99); // last 100 sent
          const seq = count > 0 ? `${start}:${count}` : '1:*';
          if (count > 0) {
            for await (const msg of client.fetch(seq, { envelope: true, uid: true })) {
              const toList = msg.envelope?.to || [];
              for (const addr of toList) {
                if (!addr.address) continue;
                const key = addr.address.toLowerCase();
                if (recipientSet.has(key)) {
                  recipientSet.get(key)!.count++;
                } else {
                  recipientSet.set(key, {
                    email: addr.address,
                    name: addr.name || '',
                    count: 1
                  });
                }
              }
            }
          }
        }
        // Sort by frequency, return top 30
        const sorted = Array.from(recipientSet.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 30);
        res.json(sorted);
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('Fetch recipients error:', error);
      res.json([]); // Return empty on error, not 500
    }
  });

  // Disconnect mail - clear saved credentials
  router.post('/disconnect', requireAuth, async (req: any, res: any) => {
    try {
      await db.run('UPDATE users SET mailPassword = NULL WHERE id = ?', [req.user.id]);
      res.json({ success: true, message: 'Đã ngắt kết nối email.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // IMAP folder name resolver
  const resolveFolder = async (client: any, folderKey: string): Promise<string> => {
    // Try to list mailboxes to find real folder names
    const folderMap: Record<string, string[]> = {
      sent: ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent'],
      trash: ['Trash', 'Deleted Items', 'Deleted Messages', 'INBOX.Trash'],
      starred: ['Starred', 'Flagged', 'INBOX.Starred'],
      inbox: ['INBOX'],
    };
    const candidates = folderMap[folderKey] || ['INBOX'];
    for (const name of candidates) {
      try {
        const lock = await client.getMailboxLock(name);
        lock.release();
        return name;
      } catch (_) { /* try next */ }
    }
    return 'INBOX';
  };

  // 3b. Get total unread count for INBOX
  router.get('/unread-count', requireAuth, async (req: any, res: any) => {
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const folderName = await resolveFolder(client, 'inbox');
      const lock = await client.getMailboxLock(folderName);
      try {
        const uids = await client.search({ seen: false }, { uid: true });
        res.json({ count: uids ? uids.length : 0 });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      res.status(isMailAuthError(error) ? 401 : 500).json({ error: error.message });
    }
  });

  // 3c. Check for new unseen mail globally
  router.get('/check-new', requireAuth, async (req: any, res: any) => {
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const folderName = await resolveFolder(client, 'inbox');
      const lock = await client.getMailboxLock(folderName);
      try {
        const mailbox = client.mailbox;
        if (mailbox !== false && mailbox.exists > 0) {
          const count = mailbox.exists;
          for await (let msg of client.fetch(count.toString(), { envelope: true, flags: true, uid: true })) {
            const isRead = msg.flags ? msg.flags.has('\\Seen') : false;
            return res.json({ 
              uid: msg.uid, 
              subject: msg.envelope?.subject, 
              fromName: msg.envelope?.from?.[0]?.name,
              from: msg.envelope?.from?.[0]?.address,
              isRead 
            });
          }
        }
        res.json({ uid: null });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      res.status(isMailAuthError(error) ? 401 : 500).json({ error: error.message });
    }
  });

  // 4. Fetch Folder (inbox / sent / trash / starred)

  router.get('/inbox', requireAuth, async (req: any, res: any) => {
    const folderKey = (req.query.folder as string || 'inbox').toLowerCase();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const folderName = await resolveFolder(client, folderKey);
      const lock = await client.getMailboxLock(folderName);

      try {
        const messages: any[] = [];
        const seenMessageIds = new Set<string>();
        const mailbox = client.mailbox;
        if (mailbox !== false) {
          const count = mailbox.exists || 0;
          const end = count - (page - 1) * limit;
          const start = Math.max(1, end - limit + 1);

          if (end > 0) {
            const seq = `${start}:${end}`;
            for await (let msg of client.fetch(seq, { envelope: true, flags: true, uid: true })) {
              const envelope = msg.envelope;
              const flags = msg.flags ? Array.from(msg.flags) : [];
              const isRead = msg.flags ? msg.flags.has('\\Seen') : false;
              const isStarred = msg.flags ? msg.flags.has('\\Flagged') : false;

              if (folderKey === 'starred' && !isStarred) continue;

              // Deduplicate by Message-ID to fix duplicate email display issue
              const msgId = envelope?.messageId || msg.uid.toString();
              if (seenMessageIds.has(msgId)) continue;
              seenMessageIds.add(msgId);

              const fromAddress = envelope?.from?.[0]?.address || envelope?.from?.[0]?.name || 'Unknown';
              const fromName = envelope?.from?.[0]?.name || '';
              const toAddress = envelope?.to?.[0]?.address || '';
              const toName = envelope?.to?.[0]?.name || '';

              messages.push({
                id: msg.uid,
                subject: envelope?.subject || '',
                from: fromAddress,
                fromName: fromName,
                to: toAddress,
                toName: toName,
                date: envelope?.date || new Date(),
                flags,
                isRead,
                isStarred,
                folder: folderName,
              });
            }
          }
        }
        res.json(messages.reverse());
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('Fetch folder error:', error);
      res.status(isMailAuthError(error) ? 401 : 500).json({ error: error.message || 'Failed to fetch folder' });
    }
  });

  // 4b. Star / Unstar email
  router.patch('/message/:uid/star', requireAuth, async (req: any, res: any) => {
    const { folder = 'INBOX', starred } = req.body;
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock(folder);
      try {
        const uid = req.params.uid;
        if (starred) {
          await client.messageFlagsAdd(uid, ['\\Flagged'], { uid: true });
        } else {
          await client.messageFlagsRemove(uid, ['\\Flagged'], { uid: true });
        }
        res.json({ success: true });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4b2. Mark read / unread
  router.patch('/message/:uid/read', requireAuth, async (req: any, res: any) => {
    const { folder = 'INBOX', isRead } = req.body;
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock(folder);
      try {
        const uid = req.params.uid;
        if (isRead) {
          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
        } else {
          await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
        }
        res.json({ success: true });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4c. Move to Trash or Permanent Delete
  router.delete('/message/:uid', requireAuth, async (req: any, res: any) => {
    const { folder = 'INBOX' } = req.query;
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const actualTrashName = await resolveFolder(client, 'trash');
      const lock = await client.getMailboxLock(folder as string);
      
      try {
        const uid = req.params.uid;
        
        // If the email is already in the Trash folder, delete it permanently
        if (folder.toLowerCase() === actualTrashName.toLowerCase() || folder.toLowerCase() === 'trash') {
          await client.messageDelete(uid, { uid: true });
        } else {
          // Otherwise, move it to the Trash folder
          await client.messageMove(uid, actualTrashName, { uid: true }).catch(() => {
            // Fallback: If MOVE command fails or isn't supported, just mark as deleted
            client.messageFlagsAdd(uid, ['\\Deleted'], { uid: true });
          });
        }
        res.json({ success: true });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4d. Bulk Actions (Delete / Restore)
  router.post('/bulk', requireAuth, async (req: any, res: any) => {
    const { uids, action, folder = 'INBOX', allInFolder = false } = req.body;
    if (!allInFolder && (!uids || !Array.isArray(uids) || uids.length === 0)) {
      return res.status(400).json({ error: 'uids array is required' });
    }
    
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const actualTrashName = await resolveFolder(client, 'trash');
      const lock = await client.getMailboxLock(folder as string);
      
      try {
        // If allInFolder, use 1:* to target every message in the mailbox
        const sequence = allInFolder ? '1:*' : uids.join(',');
        const useUid = !allInFolder; // 1:* is a seq range, not UID
        
        if (action === 'delete') {
          if (folder.toLowerCase() === actualTrashName.toLowerCase() || folder.toLowerCase() === 'trash') {
            await client.messageDelete(sequence, { uid: useUid });
          } else {
            await client.messageMove(sequence, actualTrashName, { uid: useUid }).catch(() => {
              client.messageFlagsAdd(sequence, ['\\Deleted'], { uid: useUid });
            });
          }
        } else if (action === 'restore') {
          // Restore to Inbox
          const actualInboxName = await resolveFolder(client, 'inbox');
          await client.messageMove(sequence, actualInboxName, { uid: useUid }).catch(() => {
            throw new Error('Move to Inbox failed');
          });
        } else {
          return res.status(400).json({ error: 'Invalid action' });
        }
        
        res.json({ success: true });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Read Single Email (folder-aware)
  router.get('/message/:uid', requireAuth, async (req: any, res: any) => {
    const folder = (req.query.folder as string) || 'INBOX';
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock(folder);

      try {
        const uid = parseInt(req.params.uid, 10);
        const msg = await client.fetchOne(uid.toString(), { source: true }, { uid: true });

        if (!msg || !msg.source) return res.status(404).json({ error: 'Message not found' });

        const parsed = await simpleParser(msg.source);

        // Mark as read
        await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });

        res.json({
          id: uid,
          subject: parsed.subject,
          from: parsed.from?.text,
          to: Array.isArray(parsed.to) ? parsed.to.map((a: any) => a.text).join(', ') : (parsed.to as any)?.text,
          date: parsed.date,
          html: parsed.html || parsed.textAsHtml || parsed.text,
          attachments: parsed.attachments.map((a: any) => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size,
            content: a.size < 5 * 1024 * 1024 ? a.content.toString('base64') : null
          }))
        });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('Fetch message error:', error);
      res.status(isMailAuthError(error) ? 401 : 500).json({ error: error.message || 'Failed to fetch message' });
    }
  });

  // Setup multer for file uploads in memory
  const upload = multer({ storage: multer.memoryStorage() });

  // 6. Send Email + Save to Sent folder
  router.post('/send', requireAuth, upload.array('attachments', 10), async (req: any, res: any) => {
    const { to, subject, body, cc, bcc } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'To and Subject are required' });

    try {
      // Fetch full user from DB (name for display) + VNPT email from mailPassword
      const dbUser = await db.get('SELECT id, name, mailPassword FROM users WHERE id = ?', [req.user.id]);
      if (!dbUser || !dbUser.mailPassword) return res.status(400).json({ error: 'Chưa cấu hình tài khoản mail VNPT. Vui lòng vào Cài đặt → Mail để kết nối.' });

      // Extract VNPT email from encrypted mailPassword JSON
      let mailEmail = req.user.email;
      try {
        const decrypted = decrypt(dbUser.mailPassword);
        if (decrypted) {
          const parsed = JSON.parse(decrypted);
          if (parsed.email) mailEmail = parsed.email;
        }
      } catch (_) { }

      const transporter = await getSmtpTransporter(req.user.id, mailEmail);

      const fromLabel = dbUser.name
        ? `"${dbUser.name}" <${mailEmail}>`
        : mailEmail;

      // Also pass mailEmail to IMAP appender later
      const senderEmail = mailEmail;

      console.log(`[SMTP] Sending email from: ${fromLabel} → to: ${to}`);

      // Map multer files to nodemailer attachments
      let totalSize = 0;
      console.log(`[SMTP] Received files: ${req.files ? (req.files as any[]).length : 0}`);
      const mailAttachments = req.files ? (req.files as any[]).map(f => {
        totalSize += f.size;
        console.log(`[SMTP] Attachment: ${f.originalname} (${f.size} bytes)`);
        return {
          filename: f.originalname,
          content: f.buffer,
          contentType: f.mimetype
        };
      }) : [];

      if (totalSize > 25 * 1024 * 1024) {
        return res.status(400).json({ error: 'Tổng dung lượng đính kèm không được vượt quá 25MB.' });
      }

      let finalHtml = body || '';
      let trackingId = null;
      if (req.body.track === 'true' || req.body.track === true) {
        trackingId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        const trackingUrl = `${req.protocol}://${req.get('host')}/api/mail/track/${trackingId}.gif`;
        finalHtml += `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
        
        await db.run(
          'INSERT INTO mail_tracking (id, userId, messageId, subject, "to", opens, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)',
          [trackingId, req.user.id, '', subject, to, new Date().toISOString()]
        );
      }

      const mailOptions: any = {
        from: fromLabel,
        to,
        subject,
        html: finalHtml,
        text: body ? body.replace(/<[^>]*>/g, '') : '',
        attachments: mailAttachments
      };
      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;

      // Return response immediately for instant UI feedback
      res.json({
        success: true,
        message: `Đang gửi email...`,
      });

      // Run SMTP send and IMAP append in background
      transporter.sendMail(mailOptions).then(async (info: any) => {
        if (trackingId && info.messageId) {
          await db.run('UPDATE mail_tracking SET messageId = ? WHERE id = ?', [info.messageId, trackingId]);
        }

        console.log(`[SMTP] Response: ${info.response}`);
        console.log(`[SMTP] Accepted: ${JSON.stringify(info.accepted)}`);
        console.log(`[SMTP] Rejected: ${JSON.stringify(info.rejected)}`);
        console.log(`[SMTP] MessageId: ${info.messageId}`);

        if (info.rejected && info.rejected.length > 0) {
          console.warn(`[SMTP] Partially rejected by server: ${info.rejected.join(', ')}`);
        }

        // Try to append to Sent folder via IMAP
        try {
          const client = await getImapClient(req.user.id, senderEmail);
          const sentFolderCandidates = ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent'];
          let sentFolder = 'Sent';
          for (const name of sentFolderCandidates) {
            try {
              const lock = await client.getMailboxLock(name);
              lock.release();
              sentFolder = name;
              break;
            } catch (_) { /* try next */ }
          }

          const composer = new (MailComposer as any)(mailOptions);
          const rawMessageBuffer = await composer.compile().build();

          const lock = await client.getMailboxLock(sentFolder);
          try {
            await client.append(sentFolder, rawMessageBuffer, ['\\Seen']);
            console.log('[IMAP] Background appended to Sent folder');
          } finally {
            lock.release();
            await client.logout();
          }
        } catch (imapErr: any) {
          console.error('[IMAP] Background append failed:', imapErr.message);
        }
      }).catch((err: any) => {
        console.error(`[SMTP] Background send failed:`, err.message);
      });

    } catch (error: any) {
      console.error('Send email error:', error);
      res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  });

  // 7. Schedule Email
  router.post('/schedule', requireAuth, upload.array('attachments', 10), async (req: any, res: any) => {
    const { to, subject, body, cc, bcc, scheduledAt } = req.body;
    if (!to || !subject || !scheduledAt) return res.status(400).json({ error: 'To, Subject and ScheduledAt are required' });

    try {
      const dbUser = await db.get('SELECT id, mailPassword FROM users WHERE id = ?', [req.user.id]);
      if (!dbUser || !dbUser.mailPassword) return res.status(400).json({ error: 'Chưa cấu hình tài khoản mail VNPT.' });

      const mailAttachments = req.files ? (req.files as any[]).map(f => ({
        filename: f.originalname,
        content: f.buffer.toString('base64'),
        contentType: f.mimetype
      })) : [];

      const id = Math.random().toString(36).substr(2, 9);
      await db.run(
        'INSERT INTO scheduled_emails (id, userId, "to", cc, bcc, subject, body, attachments, scheduledAt, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, req.user.id, to, cc || null, bcc || null, subject, body || '', JSON.stringify(mailAttachments), scheduledAt, 'pending', new Date().toISOString()]
      );

      res.json({ success: true, message: 'Đã lên lịch gửi email.' });
    } catch (error: any) {
      console.error('Schedule email error:', error);
      res.status(500).json({ error: error.message || 'Failed to schedule email' });
    }
  });

  // 8. Tracking Pixel Route
  router.get('/track/:trackingId.gif', async (req: any, res: any) => {
    const { trackingId } = req.params;
    try {
      await db.run(
        'UPDATE mail_tracking SET opens = opens + 1, lastOpen = ? WHERE id = ?',
        [new Date().toISOString(), trackingId]
      );
    } catch (err) {
      console.error('Tracking error:', err);
    }
    // 1x1 transparent GIF
    const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': img.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(img);
  });

  // 9. Get Tracking Stats
  router.get('/tracking-stats', requireAuth, async (req: any, res: any) => {
    try {
      const stats = await db.all(
        'SELECT id, subject, "to", opens, lastOpen, createdAt FROM mail_tracking WHERE userId = ? ORDER BY createdAt DESC',
        [req.user.id]
      );
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
