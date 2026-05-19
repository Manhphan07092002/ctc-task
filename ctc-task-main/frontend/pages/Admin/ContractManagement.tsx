import React from 'react';
import ContractsPage from '../Contracts/index';

export default function AdminContractManagement() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-screen">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
        <h2 className="text-xl font-bold text-gray-800">Quản lý Hợp đồng Toàn hệ thống</h2>
        <p className="text-sm text-gray-500 mt-1">Giao diện quản trị viên - Cho phép kiểm soát toàn bộ hợp đồng mua bán, công nợ và sản phẩm nâng cao.</p>
      </div>
      <div className="p-4 bg-gray-50/50">
        <ContractsPage />
      </div>
    </div>
  );
}
