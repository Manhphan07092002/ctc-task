import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || 'ctc_default_secret_change_me';

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}
