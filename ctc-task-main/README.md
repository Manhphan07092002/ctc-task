<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CTC Task Management & Collaboration Platform

Hệ thống **CTC Task** là một giải pháp quản lý công việc và cộng tác nội bộ toàn diện được xây dựng trên nền tảng web hiện đại. Hệ thống tích hợp nhiều module mạnh mẽ từ quản lý tiến độ, ghi chú, đặt phòng họp, lịch biểu, đến quản lý email nội bộ và Trợ lý ảo AI.

## ✨ Tính năng nổi bật

- **Quản lý công việc (Task Management):** Hỗ trợ Kanban Board, List View, Calendar View. Tính năng giao việc, gắn thẻ, cập nhật tiến độ (Todo, In Progress, Review, Done).
- **Lịch & Phòng họp (Calendar & Meetings):** Đặt lịch họp, quản lý phòng họp theo thời gian thực (Socket.io).
- **Danh bạ Đội ngũ (Team Directory):** Hiển thị hồ sơ chi tiết nhân sự bao gồm Email, Số điện thoại, Ngày sinh, Quê quán, CCCD và Giới tính. Tích hợp Click-to-Call và Click-to-Email.
- **Hệ thống Mail (IMAP/SMTP):** Đọc, soạn thảo và gửi email nội bộ/ngoại bộ trực tiếp từ nền tảng. Hỗ trợ chữ ký tự động, lưu nháp, đính kèm tệp.
- **Báo cáo & Phân tích (Reports & Dashboard):** Theo dõi hiệu suất cá nhân và phòng ban thông qua các biểu đồ trực quan.
- **Quản trị viên (Admin Panel):** Quản lý người dùng, phân quyền (Roles & Permissions), thiết lập hệ thống.
- **Trợ lý AI (Gemini Assistant):** Hỗ trợ tư vấn, tạo mẫu task tự động, gợi ý công việc tích hợp ngay trong hệ thống.
- **Real-time Collaboration:** Đồng bộ hóa dữ liệu thời gian thực cho mọi thay đổi thông qua Socket.io.

## 💻 Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React (Icons), React Router v6.
- **Backend:** Node.js, Express.js, SQLite (hoặc PostgreSQL), Prisma/Knex (Tùy chọn).
- **Real-time:** Socket.io (Hỗ trợ chat, meeting room, cập nhật dữ liệu realtime).
- **Khác:** Nodemailer & node-imap (Hệ thống Mail), Google Gemini API (AI).

---

## 🚀 Hướng dẫn cài đặt (Run Locally)

**Yêu cầu hệ thống (Prerequisites):** 
- [Node.js](https://nodejs.org/en/) (phiên bản v18 trở lên)
- Npm hoặc Yarn

### Bước 1: Cài đặt Dependencies

Hệ thống được thiết kế theo dạng **Monorepo** (gồm cả frontend và backend). Từ thư mục gốc (root directory), hãy chạy lệnh sau để cài đặt toàn bộ gói thư viện cần thiết:

```bash
npm install
```

### Bước 2: Thiết lập biến môi trường (Environment Variables)

Hệ thống đi kèm với các file `.env` mặc định để phục vụ cho việc phát triển (Development). Tuy nhiên, để cấu hình AI hoặc database tùy chỉnh, bạn có thể thiết lập:

- **Frontend:** Đặt `GEMINI_API_KEY` trong file `.env.local` nếu bạn muốn tích hợp Trợ lý AI.
- **Backend:** Cơ sở dữ liệu mặc định là `SQLite` lưu tại thư mục `backend/database.sqlite`.

### Bước 3: Khởi chạy hệ thống

Chạy lệnh sau tại thư mục gốc. Lệnh này sẽ tự động khởi động đồng thời cả Backend (Port 3000) và Frontend (Port 5173).

```bash
npm run dev
```

### Bước 4: Đăng nhập

Mở trình duyệt và truy cập `http://localhost:5173`. 
Hệ thống đã được tự động tạo dữ liệu mẫu (Seed Data). Bạn có thể đăng nhập bằng tài khoản quản trị viên:



---

## 🛠 Cấu trúc thư mục

- `/frontend`: Chứa toàn bộ mã nguồn React, Components, Contexts, Pages.
- `/backend`: Mã nguồn Node.js Server, API Routes (users, tasks, mail, auth, reports), Database Schema & Migrations.
- `package.json`: Chứa các script `concurrently` để chạy hệ thống.

## 🤝 Hỗ trợ

Nếu gặp bất kỳ khó khăn nào trong quá trình cài đặt và vận hành, vui lòng kiểm tra logs terminal hoặc liên hệ với đội ngũ phát triển. Chúc bạn có trải nghiệm tuyệt vời với CTC Task!
