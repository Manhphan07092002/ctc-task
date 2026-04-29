import { Router } from 'express';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import multer from 'multer';
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

  // 3. Helper to get SMTP transporter
  const getSmtpTransporter = async (userId: string, defaultEmail: string) => {
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

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // STARTTLS
      auth: { user: email, pass: password },
      tls: {
        rejectUnauthorized: false
      }
    });

    try {
      await transporter.verify();
    } catch (err: any) {
      if (err.message?.includes('Invalid login') || err.message?.includes('AuthError') || err.message?.includes('535')) {
        const usernameOnly = email.split('@')[0];
        console.log(`[SMTP] Full email failed. Retrying with username: ${usernameOnly}`);
        return nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: false,
          auth: { user: usernameOnly, pass: password },
          tls: { rejectUnauthorized: false }
        });
      }
      throw err;
    }
    return transporter;
  };

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
      res.status(500).json({ error: error.message });
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
      const isAuthError = error.message?.includes('No mail credentials') || error.message?.includes('AUTHENTICATE failed');
      res.status(isAuthError ? 401 : 500).json({ error: error.message || 'Failed to fetch folder' });
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

  // 4c. Move to Trash
  router.delete('/message/:uid', requireAuth, async (req: any, res: any) => {
    const { folder = 'INBOX' } = req.query;
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock(folder as string);
      try {
        const uid = req.params.uid;
        await client.messageFlagsAdd(uid, ['\\Deleted'], { uid: true });
        await client.messageMove(uid, 'Trash', { uid: true }).catch(() => { });
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
      const isAuthError = error.message?.includes('No mail credentials') || error.message?.includes('AUTHENTICATE failed');
      res.status(isAuthError ? 401 : 500).json({ error: error.message || 'Failed to fetch message' });
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

      const mailOptions: any = {
        from: fromLabel,
        to,
        subject,
        html: body || '',
        text: body ? body.replace(/<[^>]*>/g, '') : '',
        attachments: mailAttachments
      };
      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;

      const info = await transporter.sendMail(mailOptions);

      console.log(`[SMTP] Response: ${info.response}`);
      console.log(`[SMTP] Accepted: ${JSON.stringify(info.accepted)}`);
      console.log(`[SMTP] Rejected: ${JSON.stringify(info.rejected)}`);
      console.log(`[SMTP] MessageId: ${info.messageId}`);

      // Check if any recipients were rejected
      if (info.rejected && info.rejected.length > 0) {
        return res.status(422).json({
          error: `Không thể gửi đến: ${info.rejected.join(', ')}. SMTP server từ chối người nhận.`,
          rejected: info.rejected,
          accepted: info.accepted,
        });
      }

      // Try to append to Sent folder via IMAP (best-effort)
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

        // Use MailComposer to generate raw RFC2822 message with attachments
        const composer = new (MailComposer as any)(mailOptions);
        const rawMessageBuffer = await composer.compile().build();

        const lock = await client.getMailboxLock(sentFolder);
        try {
          await client.append(sentFolder, rawMessageBuffer, ['\\Seen']);
          console.log(`[Mail] Appended sent message to "${sentFolder}"`);
        } finally {
          lock.release();
          await client.logout();
        }
      } catch (appendErr: any) {
        console.warn('[Mail] Could not append to Sent folder:', appendErr.message);
      }

      res.json({
        success: true,
        message: `Đã gửi kèm ${mailAttachments.length} tệp.`,
        accepted: info.accepted,
        messageId: info.messageId,
      });
    } catch (error: any) {
      console.error('Send email error:', error);
      res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  });

  return router;
}
