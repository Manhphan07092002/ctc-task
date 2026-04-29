import { Router } from 'express';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';
import { requireAuth } from '../middleware/auth.js';

export function mailRoutes(db: any) {
  const router = Router();

  const IMAP_HOST = 'imap.vnptemail.vn';
  const IMAP_PORT = 993;
  const SMTP_HOST = 'smtp.vnptemail.vn';
  const SMTP_PORT = 465; // SSL

  // 1. Connect and Save Credentials
  router.post('/connect', requireAuth, async (req: any, res: any) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    console.log(`[IMAP Connect] Vừa nhận yêu cầu đăng nhập từ tài khoản: "${email}"`);

    try {
      const tls = require('tls');
      const authResult = await new Promise<{success: boolean, reason?: string}>((resolve, reject) => {
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
      secure: true,
      auth: { user: email, pass: password },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    try {
      await transporter.verify();
    } catch (err: any) {
      if (err.message?.includes('Invalid login') || err.message?.includes('AuthError')) {
        const usernameOnly = email.split('@')[0];
        console.log(`[SMTP] Full email failed. Retrying with username: ${usernameOnly}`);
        return nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: true,
          auth: { user: usernameOnly, pass: password },
          tls: { rejectUnauthorized: false }
        });
      }
      throw err;
    }
    return transporter;
  };

  // 4. Fetch Inbox
  router.get('/inbox', requireAuth, async (req: any, res: any) => {
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock('INBOX');
      
      try {
        const messages = [];
        // Fetch last 30 messages
        const mailbox = client.mailbox;
        if (mailbox !== false) {
          const count = mailbox.exists || 0;
          const start = Math.max(1, count - 29);
          const seq = count > 0 ? `${start}:${count}` : '1:*';
          
          if (count > 0) {
            for await (let msg of client.fetch(seq, { envelope: true, flags: true, uid: true })) {
              const envelope = msg.envelope;
              const flags = msg.flags ? Array.from(msg.flags) : [];
              const isRead = msg.flags ? msg.flags.has('\\Seen') : false;
              const fromAddress = envelope?.from?.[0]?.address || envelope?.from?.[0]?.name || 'Unknown';
              const fromName = envelope?.from?.[0]?.name || '';
              
              messages.push({
                id: msg.uid,
                subject: envelope?.subject || '',
                from: fromAddress,
                fromName: fromName,
                date: envelope?.date || new Date(),
                flags: flags,
                isRead: isRead
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
      console.error('Fetch inbox error:', error);
      const isAuthError = error.message?.includes('No mail credentials') || error.message?.includes('AUTHENTICATE failed');
      res.status(isAuthError ? 401 : 500).json({ error: error.message || 'Failed to fetch inbox' });
    }
  });

  // 5. Read Single Email
  router.get('/message/:uid', requireAuth, async (req: any, res: any) => {
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock('INBOX');
      
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
          date: parsed.date,
          html: parsed.html || parsed.textAsHtml || parsed.text,
          attachments: parsed.attachments.map((a: any) => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size,
            // Only return small attachments inline as base64, otherwise just metadata
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

  // 6. Send Email
  router.post('/send', requireAuth, async (req: any, res: any) => {
    const { to, subject, body } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'To and Subject are required' });

    try {
      const transporter = await getSmtpTransporter(req.user.id, req.user.email);
      await transporter.sendMail({
        from: req.user.email,
        to,
        subject,
        html: body
      });
      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
      console.error('Send email error:', error);
      res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  });

  return router;
}
