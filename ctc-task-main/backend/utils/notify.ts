import { getIO } from '../socket.js';
import { randomUUID } from 'crypto';

export const sendNotification = async (
  db: any,
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedId?: string
) => {
  try {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    
    // 1. Insert into database
    await db.run(
      'INSERT INTO notifications (id, userId, type, title, message, relatedId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
      [id, userId, type, title, message, relatedId || null, createdAt]
    );

    // 2. Emit to socket
    const io = getIO();
    io.to(userId).emit('new_notification', {
      id,
      userId,
      type,
      title,
      message,
      relatedId,
      isRead: 0,
      createdAt
    });

  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};
