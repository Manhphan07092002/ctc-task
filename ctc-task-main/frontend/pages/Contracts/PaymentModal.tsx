import React, { useState, useEffect } from 'react';
import { X, Wallet, TrendingUp, AlertCircle, Save } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { Button } from '../../components/UI';

interface PaymentModalProps {
  contract: Contract | null;
  onClose: () => void;
  onSave: (contractId: string, additionalAmount: number) => Promise<void>;
}

const fmtMoney = (v: number) => v.toLocaleString('vi-VN') + ' ₫';

export const PaymentModal: React.FC<PaymentModalProps> = ({ contract, onClose, onSave }) => {
  const [amount, setAmount] = useState<string>('');
  const [percentage, setPercentage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAmount('');
    setPercentage('');
  }, [contract]);

  if (!contract) return null;

  const pTax = contract.postTaxValue || 0;
  const paid = contract.paidAmount || 0;
  const debt = Math.max(0, pTax - paid);

  const handleAmountChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    const num = Number(raw) || 0;
    
    // Auto-correct if amount exceeds debt
    const finalNum = num > debt ? debt : num;
    
    setAmount(finalNum === 0 ? '' : finalNum.toLocaleString('vi-VN'));
    
    if (pTax > 0) {
      const pct = (finalNum / pTax) * 100;
      setPercentage(pct === 0 ? '' : pct % 1 === 0 ? pct.toString() : pct.toFixed(2));
    }
  };

  const handlePercentageChange = (val: string) => {
    // Allow numbers and one decimal point
    const raw = val.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = raw.split('.');
    let cleanVal = raw;
    if (parts.length > 2) {
      cleanVal = parts[0] + '.' + parts.slice(1).join('');
    }

    let num = Number(cleanVal) || 0;
    
    // Auto-correct if percentage exceeds remaining debt percentage
    const maxPct = pTax > 0 ? (debt / pTax) * 100 : 0;
    if (num > maxPct) num = maxPct;

    setPercentage(cleanVal === '' ? '' : cleanVal);

    if (pTax > 0 && cleanVal !== '') {
      const calculatedAmount = Math.round((num / 100) * pTax);
      setAmount(calculatedAmount === 0 ? '' : calculatedAmount.toLocaleString('vi-VN'));
    } else {
      setAmount('');
    }
  };

  const handleQuickPercent = (pct: number) => {
    const calculatedAmount = Math.round((pct / 100) * pTax);
    
    // Prevent exceeding debt
    const finalAmount = calculatedAmount > debt ? debt : calculatedAmount;
    
    setAmount(finalAmount.toLocaleString('vi-VN'));
    
    if (pTax > 0) {
      const actualPct = (finalAmount / pTax) * 100;
      setPercentage(actualPct % 1 === 0 ? actualPct.toString() : actualPct.toFixed(2));
    }
  };

  const handleQuickFull = () => {
    setAmount(debt.toLocaleString('vi-VN'));
    if (pTax > 0) {
      setPercentage(((debt / pTax) * 100).toFixed(2).replace(/\.00$/, ''));
    }
  };

  const handleSubmit = async () => {
    const numAmount = Number(amount.replace(/\D/g, '')) || 0;
    if (numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onSave(contract.id, numAmount);
      onClose();
    } catch (error) {
      console.error('Failed to save payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const numAmount = Number(amount.replace(/\D/g, '')) || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-100" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-lg">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Thu tiền hợp đồng</h2>
              <p className="text-xs text-emerald-100 font-medium">{contract.contractNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Giá trị (Sau thuế)</span>
              <span className="text-sm font-bold text-gray-900">{fmtMoney(pTax)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Đã thanh toán trước đó</span>
              <span className="text-sm font-bold text-blue-600">{fmtMoney(paid)}</span>
            </div>
            <div className="h-px bg-gray-200 w-full my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">Công nợ hiện tại</span>
              <span className="text-base font-black text-rose-600">{fmtMoney(debt)}</span>
            </div>
          </div>

          {/* Input Form */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp size={12} className="text-emerald-500" /> Tỷ lệ thu
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={percentage} 
                    onChange={e => handlePercentageChange(e.target.value)}
                    placeholder="VD: 50"
                    className="w-full pl-4 pr-8 py-2.5 text-base font-bold text-emerald-700 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                </div>
              </div>
              
              <div className="flex-[2]">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Số tiền thu đợt này (VNĐ)
                </label>
                <input 
                  type="text" 
                  value={amount} 
                  onChange={e => handleAmountChange(e.target.value)}
                  placeholder="Nhập số tiền..."
                  className="w-full px-4 py-2.5 text-base font-bold text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Chọn nhanh tỷ lệ thu</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleQuickPercent(30)} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/50 shadow-sm">Thu 30%</button>
                <button onClick={() => handleQuickPercent(50)} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/50 shadow-sm">Thu 50%</button>
                <button onClick={() => handleQuickPercent(70)} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/50 shadow-sm">Thu 70%</button>
                <button onClick={handleQuickFull} className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200/50 shadow-sm flex-1 text-center">Thu hết công nợ</button>
              </div>
            </div>

            {/* Info Message */}
            {numAmount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
                <p className="text-xs font-medium leading-relaxed">
                  Bạn đang thu <strong>{fmtMoney(numAmount)}</strong>. Công nợ của hợp đồng sau khi thu sẽ còn lại <strong>{fmtMoney(Math.max(0, debt - numAmount))}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={numAmount <= 0 || isSubmitting} 
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {isSubmitting ? 'Đang lưu...' : (
              <>
                <Save size={16} /> Xác nhận Thu tiền
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
