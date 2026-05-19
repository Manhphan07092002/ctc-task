import React, { forwardRef } from 'react';
import { Contract } from '../../services/contractService';
import { User } from '../../types';

interface PrintableQuoteProps {
  contract: Partial<Contract>;
  user: User | null;
}

const fmtMoney = (v: number) => v.toLocaleString('vi-VN');

export const PrintableQuote = forwardRef<HTMLDivElement, PrintableQuoteProps>(({ contract, user }, ref) => {
  const currentDate = new Date();
  
  // Fake company info, ideally from settings
  const companyName = "CÔNG TY TNHH CTC";
  const companyAddress = "Số 123, Đường Mẫu, Phường ABC, TP. XYZ";
  const companyPhone = "0123.456.789";

  return (
    <div ref={ref} className="print-only bg-white text-black p-8 text-[12pt] leading-tight font-serif" style={{ display: 'none' }}>
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 20mm; }
          .print-only { display: block !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 6px; text-align: left; }
          th { text-align: center; font-weight: bold; background-color: #f3f4f6; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .mt-4 { margin-top: 1rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-8 { margin-bottom: 2rem; }
        `}
      </style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
        <div>
          <h2 className="font-bold text-[14pt]">{companyName}</h2>
          <p>Địa chỉ: {companyAddress}</p>
          <p>Điện thoại: {companyPhone}</p>
        </div>
        <div className="text-right">
          <p>Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam</p>
          <p className="font-bold">Độc lập - Tự do - Hạnh phúc</p>
          <p className="mt-4">
            <em>..., ngày {currentDate.getDate()} tháng {currentDate.getMonth() + 1} năm {currentDate.getFullYear()}</em>
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="font-bold text-[18pt] mb-2">BẢNG BÁO GIÁ</h1>
        <p>Kính gửi: <span className="font-bold">{contract.clientName || 'Quý Khách Hàng'}</span></p>
      </div>

      <p className="mb-4">
        {companyName} trân trọng gửi đến quý khách hàng bảng báo giá cho <span className="font-bold">{contract.contractName || 'các sản phẩm/dịch vụ'}</span> như sau:
      </p>

      {/* Table */}
      <table className="mb-4">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>STT</th>
            <th style={{ width: '30%' }}>Tên Sản phẩm / Dịch vụ</th>
            <th style={{ width: '10%' }}>ĐVT</th>
            <th style={{ width: '10%' }}>SL</th>
            <th style={{ width: '15%' }}>Đơn giá (VNĐ)</th>
            <th style={{ width: '10%' }}>Thuế (%)</th>
            <th style={{ width: '20%' }}>Thành tiền (VNĐ)</th>
          </tr>
        </thead>
        <tbody>
          {contract.products?.map((p, idx) => (
            <tr key={idx}>
              <td className="text-center">{idx + 1}</td>
              <td>{p.name}</td>
              <td className="text-center">{p.unit || '-'}</td>
              <td className="text-center">{p.quantity}</td>
              <td className="text-right">{fmtMoney(p.unitPrice)}</td>
              <td className="text-center">{p.vatRate ?? 8}</td>
              <td className="text-right font-bold">{fmtMoney(p.total)}</td>
            </tr>
          ))}
          {(!contract.products || contract.products.length === 0) && (
            <tr>
              <td colSpan={7} className="text-center italic text-gray-500">Chưa có sản phẩm nào</td>
            </tr>
          )}
          <tr>
            <td colSpan={6} className="text-right font-bold">Tổng cộng (chưa VAT):</td>
            <td className="text-right font-bold">{fmtMoney(contract.preTaxValue || 0)}</td>
          </tr>
          {(() => {
            const vatSummary = (contract.products || []).reduce((acc: any, p) => {
              const rate = p.vatRate ?? 8;
              acc[rate] = (acc[rate] || 0) + (p.total * rate) / 100;
              return acc;
            }, {});
            const rates = Object.keys(vatSummary).map(Number).sort((a, b) => a - b);
            if (rates.length === 0) rates.push(8);
            
            return rates.map(rate => (
              <tr key={rate}>
                <td colSpan={6} className="text-right font-bold">Thuế VAT ({rate}%):</td>
                <td className="text-right font-bold">{fmtMoney(vatSummary[rate] || 0)}</td>
              </tr>
            ));
          })()}
          <tr>
            <td colSpan={6} className="text-right font-bold text-[14pt]">Tổng giá trị thanh toán:</td>
            <td className="text-right font-bold text-[14pt]">{fmtMoney(contract.postTaxValue || 0)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-8">
        <p><span className="font-bold">Ghi chú:</span> Báo giá có hiệu lực trong vòng 30 ngày.</p>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
        <div className="text-center" style={{ width: '40%' }}>
          <p className="font-bold mb-16">ĐẠI DIỆN KHÁCH HÀNG</p>
          <p className="italic">(Ký, ghi rõ họ tên)</p>
        </div>
        <div className="text-center" style={{ width: '40%' }}>
          <p className="font-bold mb-16">ĐẠI DIỆN CÔNG TY</p>
          <p className="font-bold">{user?.name || '.......................'}</p>
          <p>{user?.department || ''}</p>
        </div>
      </div>
    </div>
  );
});

PrintableQuote.displayName = 'PrintableQuote';
