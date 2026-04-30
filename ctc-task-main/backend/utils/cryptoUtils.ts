import crypto from 'crypto';

const DEFAULT_KEY = 'CTC-Task-Secure-Key-123456789012';
const ENCRYPTION_KEY = process.env.MAIL_ENCRYPTION_KEY || DEFAULT_KEY;
const IV_LENGTH = 16;

if (!process.env.MAIL_ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.error('[SECURITY] MAIL_ENCRYPTION_KEY is not set. Using the default insecure key. Set this env var immediately to protect stored mail credentials.');
}

export function encrypt(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed', error);
    return null;
  }
}
