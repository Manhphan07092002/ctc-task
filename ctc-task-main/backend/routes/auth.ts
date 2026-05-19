import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
});

const ChangePasswordSchema = z.object({
  userId: z.string(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Mật khẩu mới phải ít nhất 6 ký tự'),
});



export function authRoutes(db: any) {
  const router = Router();
  const getSecret = () => process.env.JWT_SECRET as string;

  const generateToken = (userPayload: any) => {
    return jwt.sign(userPayload, getSecret(), { expiresIn: '7d' });
  };

  router.post('/login', validate(LoginSchema), async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE lower(email) = lower(?)', [email]);
      
      if (!user) {
        try {
          await db.run(
            `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), 'system', 'Đăng nhập thất bại', null, 'user', `Cố gắng đăng nhập với email không tồn tại: ${email}`, new Date().toISOString()]
          );
        } catch (e) {}
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.isLocked) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin để được hỗ trợ.' });
      }

      if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
        const lockTime = new Date(user.lockedUntil).toLocaleTimeString('vi-VN');
        return res.status(403).json({ error: `Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${lockTime}.` });
      }

      if (!user.password || !password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        const newFailed = (user.failedLogins || 0) + 1;
        let lockUntil = null;
        let isLocked = 0;
        let lockMessage = '';
        let errorMessage = 'Invalid credentials';
        
        if (newFailed >= 15) {
          isLocked = 1;
          lockMessage = 'Khóa tài khoản do nhập sai mật khẩu 15 lần';
          errorMessage = 'Tài khoản đã bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng liên hệ Admin để mở tài khoản.';
        } else if (newFailed >= 10) {
          lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          lockMessage = 'Khóa tài khoản 30 phút do nhập sai mật khẩu 10 lần';
          errorMessage = 'Tài khoản đã bị khóa 30 phút do nhập sai mật khẩu quá nhiều lần.';
        } else if (newFailed >= 7) {
          lockUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          lockMessage = 'Khóa tài khoản 10 phút do nhập sai mật khẩu 7 lần';
          errorMessage = 'Tài khoản đã bị khóa 10 phút do nhập sai mật khẩu quá nhiều lần.';
        } else if (newFailed >= 5) {
          lockUntil = new Date(Date.now() + 1 * 60 * 1000).toISOString();
          lockMessage = 'Khóa tài khoản 1 phút do nhập sai mật khẩu 5 lần';
          errorMessage = 'Tài khoản đã bị khóa 1 phút do nhập sai mật khẩu quá nhiều lần.';
        }

        if (lockUntil || isLocked) {
          await db.run('UPDATE users SET failedLogins = ?, lockedUntil = ?, isLocked = ? WHERE id = ?', [newFailed, lockUntil, isLocked, user.id]);
          try {
            await db.run(
              `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), user.id, 'Khóa tài khoản', user.id, 'user', lockMessage, new Date().toISOString()]
            );
          } catch (e) {}
          return res.status(403).json({ error: errorMessage });
        } else {
          await db.run('UPDATE users SET failedLogins = ? WHERE id = ?', [newFailed, user.id]);
          try {
            await db.run(
              `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), user.id, 'Đăng nhập thất bại', user.id, 'user', `Nhập sai mật khẩu lần ${newFailed}`, new Date().toISOString()]
            );
          } catch (e) {}
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      }

      if ((user.failedLogins && user.failedLogins > 0) || user.lockedUntil || user.isLocked) {
        await db.run('UPDATE users SET failedLogins = 0, lockedUntil = NULL, isLocked = 0 WHERE id = ?', [user.id]);
      }

      const role = await db.get('SELECT permissions FROM roles WHERE name = ?', [user.role]);
      
      const userClientData = {
        id: user.id, name: user.name, email: user.email, role: user.role, 
        department: user.department, avatar: user.avatar, 
        permissions: role?.permissions ? JSON.parse(role.permissions) : []
      };
      const jwtPayload = { ...userClientData };
      const token = generateToken(jwtPayload);
      
      try {
        await db.run(
          `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), user.id, 'Đăng nhập', user.id, 'user', 'Người dùng đăng nhập thành công qua Email', new Date().toISOString()]
        );
      } catch (logErr) {
        console.error('Failed to log login activity', logErr);
      }

      return res.json({ token, user: userClientData });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/change-password', validate(ChangePasswordSchema), async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    try {
      const user = await db.get('SELECT id, password FROM users WHERE id = ?', [userId]);
      if (!user || !user.password) return res.status(404).json({ error: 'User not found' });
      const isMatch = await bcrypt.compare(currentPassword || '', user.password);
      if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password = ?, failedLogins = 0, lockedUntil = NULL WHERE id = ?', [hashedPassword, userId]);
      return res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });


  return router;
}

export function forgotPasswordRoutes(db: any, mailer: any) {
  const router = Router();

  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await db.get('SELECT id, email, isLocked FROM users WHERE lower(email) = lower(?)', [email]);
      if (!user) return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });

      if (user.isLocked) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Không thể sử dụng tính năng quên mật khẩu. Vui lòng liên hệ Admin.' });
      }

      const recentPending = await db.get("SELECT id, createdAt FROM password_reset_requests WHERE userId = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1", [user.id]);
      if (recentPending) {
        const elapsed = Date.now() - new Date(recentPending.createdAt).getTime();
        if (elapsed < 10 * 60 * 1000) return res.status(429).json({ error: 'Bạn vừa yêu cầu gần đây. Vui lòng đợi vài phút rồi thử lại.' });
      }

      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const appBaseUrl = process.env.APP_BASE_URL || 'https://ai.hieuhomecloud.online';
      const resetLink = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      await db.run('DELETE FROM password_reset_tokens WHERE userId = ? AND usedAt IS NULL', [user.id]);
      await db.run('INSERT INTO password_reset_tokens (id, userId, email, token, expiresAt, usedAt) VALUES (?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), user.id, user.email, token, expiresAt, null]);

      if (recentPending) {
        await db.run('UPDATE password_reset_requests SET email = ?, emailStatus = ?, emailSentAt = ?, createdAt = ? WHERE id = ?', [user.email, 'pending', null, new Date().toISOString(), recentPending.id]);
      } else {
        await db.run("INSERT INTO password_reset_requests (id, userId, email, status, emailStatus, emailSentAt, createdAt) VALUES (?, ?, ?, 'pending', 'pending', NULL, ?)", [crypto.randomUUID(), user.id, user.email, new Date().toISOString()]);
      }

      let emailSent = false;
      let message = 'Đã tạo link đặt lại mật khẩu.';
      try {
        emailSent = await mailer.sendResetLinkEmail(user.email, resetLink);
        message = emailSent ? 'Đã gửi link đặt lại mật khẩu qua email.' : 'Đã tạo link đặt lại mật khẩu nhưng chưa gửi được email.';
      } catch (mailError: any) {
        console.error('forgot-password mail error', mailError);
        message = mailError?.message || 'Đã tạo link đặt lại mật khẩu nhưng gửi email thất bại.';
      }

      await db.run("UPDATE password_reset_requests SET emailStatus = ?, emailSentAt = ? WHERE userId = ? AND status = 'pending'", [emailSent ? 'sent' : 'failed', emailSent ? new Date().toISOString() : null, user.id]);
      return res.json({ success: true, emailSent, message, resetLink, expiresAt });
    } catch (e) { console.error('forgot-password error', e); res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/reset-password/:token', async (req, res) => {
    try {
      const rt = await db.get('SELECT userId, email, expiresAt, usedAt FROM password_reset_tokens WHERE token = ?', [req.params.token]);
      if (!rt) return res.status(404).json({ error: 'Link đặt lại mật khẩu không tồn tại' });
      if (rt.usedAt) return res.status(400).json({ error: 'Link này đã được sử dụng' });
      if (new Date(rt.expiresAt).getTime() < Date.now()) return res.status(400).json({ error: 'Link đặt lại mật khẩu đã hết hạn' });
      return res.json({ success: true, email: rt.email });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      if (!newPassword || String(newPassword).trim().length < 6) return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      const rt = await db.get('SELECT userId, email, expiresAt, usedAt FROM password_reset_tokens WHERE token = ?', [token]);
      if (!rt) return res.status(404).json({ error: 'Link đặt lại mật khẩu không tồn tại' });
      if (rt.usedAt) return res.status(400).json({ error: 'Link này đã được sử dụng' });
      if (new Date(rt.expiresAt).getTime() < Date.now()) return res.status(400).json({ error: 'Link đặt lại mật khẩu đã hết hạn' });
      const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);
      await db.run('UPDATE users SET password = ?, failedLogins = 0, lockedUntil = NULL WHERE id = ?', [hashedPassword, rt.userId]);
      const now = new Date().toISOString();
      await db.run('UPDATE password_reset_tokens SET usedAt = ? WHERE token = ?', [now, token]);
      await db.run("UPDATE password_reset_requests SET status = 'resolved', emailStatus = 'reset_done', emailSentAt = COALESCE(emailSentAt, ?) WHERE userId = ? AND status = 'pending'", [now, rt.userId]);
      return res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
