# Đổi Sách Lấy Cây 2026

## Cấu trúc

- `app/tnv`: Đăng nhập, điểm danh, minh chứng và giấy chứng nhận.
- `app/admin`: Toàn bộ chức năng quản trị.
- `lib/api.ts`: URL Google Apps Script dùng chung cho toàn hệ thống.

Không còn file HTML nghiệp vụ trong dự án.

## Chạy trên Visual Studio Code

1. Mở thư mục này trong Visual Studio Code.
2. Mở Terminal và chạy `npm install`.
3. Chạy `npm run dev`.
4. Truy cập `http://localhost:3000`.

Nếu PowerShell báo chặn `npm.ps1`, hãy dùng `npm.cmd install` và `npm.cmd run dev`.

## Đổi logo và favicon

- Thay favicon: đổi file `app/icon.svg`. Nếu dùng PNG, đặt `app/icon.png` và xóa `app/icon.svg`.
- Logo sidebar hiện là chữ DS trong `components/AppShell.tsx`. Thay phần `<span>DS</span>` bằng `<img src="/logo.svg" alt="Đổi Sách Lấy Cây" />`, rồi đặt file logo tại `public/logo.svg`.
