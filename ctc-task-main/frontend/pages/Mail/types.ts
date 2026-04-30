export interface Email {
  id: number;
  subject: string;
  from: string;
  fromName: string;
  to?: string;
  toName?: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  folder?: string;
}

export interface FullEmail extends Email {
  html: string;
  attachments: { filename: string; contentType: string; size: number; content: string | null }[];
}

export type FolderKey = 'inbox' | 'sent' | 'starred' | 'trash' | 'drafts';

export interface Contact {
  id: string | null;
  name: string;
  email: string;
  department: string;
  avatar: string;
  source: 'company' | 'external';
}
