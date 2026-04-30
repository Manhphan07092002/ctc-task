import React from 'react';
import { Email } from './types';

export const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-600',
];

export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name?.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || '?';
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}>
      {initials}
    </div>
  );
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return d.toLocaleDateString('vi-VN', { weekday: 'short' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export const normalizeSubject = (subject: string) => {
  if (!subject) return '';
  let s = subject;
  let prev;
  do {
    prev = s;
    s = s.replace(/^(re|fwd|fw|trả lời|chuyển tiếp)\s*:\s*/gi, '').trim();
  } while (s !== prev);
  return s.toLowerCase();
};

export const groupThreads = (emails: Email[]) => {
  const threads = new Map<string, Email[]>();
  emails.forEach(email => {
    const key = normalizeSubject(email.subject) || 'no-subject';
    if (!threads.has(key)) threads.set(key, []);
    threads.get(key)!.push(email);
  });
  return Array.from(threads.values()).sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
};

export const groupEmailsByDate = (items: { representative: Email, thread: Email[] }[]) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const groups: { label: string; items: { representative: Email, thread: Email[] }[] }[] = [
    { label: 'Hôm nay', items: [] },
    { label: 'Hôm qua', items: [] },
    { label: 'Tuần trước', items: [] },
    { label: 'Cũ hơn', items: [] },
  ];
  items.forEach(item => {
    const d = new Date(item.representative.date); d.setHours(0, 0, 0, 0);
    if (d >= today) groups[0].items.push(item);
    else if (d >= yesterday) groups[1].items.push(item);
    else if (d >= weekAgo) groups[2].items.push(item);
    else groups[3].items.push(item);
  });
  return groups.filter(g => g.items.length > 0);
};

export const getSignature = (user: any) => {
  return `<br><br><span style="color: #6b7280; font-family: sans-serif; font-size: 13px;">
--<br>
<strong>Thank and Best Regards!</strong><br>
----------------------------------------------------------------------------------------------------------------------<br>
<strong>${user?.name || ''}</strong> - ${user?.role || ''} - ${user?.department || ''}<br>
<strong>Công Ty CP Xây lắp Bưu điện Miền Trung - CTC</strong><br>
Central VietNam Post and Telecommunication Contruction JSC<br>
Address: 50B Nguyen Du St. - Hai Chau Dist. - Da Nang City - Vietnam.<br>
Mobiphone: ${user?.phone || '[Điền SĐT của bạn]'} &nbsp;&nbsp; - &nbsp;&nbsp; 02363.745678	 &nbsp;&nbsp;&nbsp;&nbsp; MST: 0400458940<br>
<img src="https://ctcdn.vn/Image/logo_rm_bgr.png" alt="CTC Logo" style="height: 80px; margin: 12px 0;" /><br>
Email: ${user?.email || ''} &nbsp;&nbsp; Website: <a href="https://ctcdn.vn" style="color: #2563eb;">https://ctcdn.vn</a><br>
----------------------------------------------------------------------------------------------------------------------
</span>`;
};
