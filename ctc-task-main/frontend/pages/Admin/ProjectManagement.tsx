import React from 'react';
import ProjectsPage from '../Projects/index';

export default function AdminProjectManagement() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-screen">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
        <h2 className="text-xl font-bold text-gray-800">Quản lý Dự án Toàn hệ thống</h2>
        <p className="text-sm text-gray-500 mt-1">Giao diện quản trị viên - Cho phép xem, sửa và xóa tất cả dự án không phụ thuộc phòng ban.</p>
      </div>
      <div className="p-4 bg-gray-50/50">
        <ProjectsPage />
      </div>
    </div>
  );
}
