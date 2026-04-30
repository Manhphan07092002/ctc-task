import nodemailer from 'nodemailer';
import { decrypt } from '../utils/cryptoUtils.js';

const SMTP_HOST = 'smtp.vnptemail.vn';
const SMTP_PORT = 587; // STARTTLS

export function initMailScheduler(db: any) {
  // Check every 1 minute
  setInterval(async () => {
    try {
      const now = new Date().toISOString();
      const pendingEmails = await db.all(
        'SELECT * FROM scheduled_emails WHERE status = ? AND scheduledAt <= ?',
        ['pending', now]
      );

      if (!pendingEmails || pendingEmails.length === 0) return;

      for (const email of pendingEmails) {
        try {
          // Postgres wrapRow might return lowercase columns, SQLite preserves case or lowercase.
          // Let's use get, if it's PgDb it will match case insensitive.
          const userId = email.userid || email.userId;
          const user = await db.get('SELECT id, name, email, mailPassword FROM users WHERE id = ?', [userId]);
          
          const mailPassRaw = user.mailPassword || user.mailpassword;
          if (!user || !mailPassRaw) {
            await db.run('UPDATE scheduled_emails SET status = ? WHERE id = ?', ['failed', email.id]);
            continue;
          }

          let mailEmail = user.email;
          let mailPass = decrypt(mailPassRaw as string);
          try {
            if (mailPass) {
              const parsed = JSON.parse(mailPass);
              if (parsed.email) mailEmail = parsed.email;
              if (parsed.password) mailPass = parsed.password;
            }
          } catch (_) { }

          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: false,
            auth: { user: mailEmail, pass: mailPass },
            tls: { rejectUnauthorized: false }
          } as any);

          const fromLabel = user.name ? `"${user.name}" <${mailEmail}>` : mailEmail;
          
          let parsedAttachments = [];
          try {
            if (email.attachments) {
              const atts = JSON.parse(email.attachments);
              parsedAttachments = atts.map((a: any) => ({
                filename: a.filename,
                content: Buffer.from(a.content, 'base64'),
                contentType: a.contentType
              }));
            }
          } catch (e) {
            console.error('Failed to parse attachments', e);
          }

          const mailOptions: any = {
            from: fromLabel,
            to: email.to,
            subject: email.subject,
            html: email.body,
            text: email.body.replace(/<[^>]*>/g, ''),
            attachments: parsedAttachments
          };
          if (email.cc) mailOptions.cc = email.cc;
          if (email.bcc) mailOptions.bcc = email.bcc;

          await transporter.sendMail(mailOptions);

          await db.run('UPDATE scheduled_emails SET status = ? WHERE id = ?', ['sent', email.id]);
          console.log(`[MailScheduler] Sent scheduled email ${email.id} to ${email.to}`);
        } catch (err) {
          console.error(`[MailScheduler] Failed to send email ${email.id}:`, err);
          await db.run('UPDATE scheduled_emails SET status = ? WHERE id = ?', ['failed', email.id]);
        }
      }
    } catch (err) {
      console.error('[MailScheduler] Error processing scheduled emails:', err);
    }
  }, 60 * 1000); // 1 minute
}
