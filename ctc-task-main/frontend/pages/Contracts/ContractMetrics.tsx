import React from 'react';
import { Briefcase, DollarSign, TrendingUp, WalletCards, AlertCircle } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { fmtMoney } from './contractUtils';

interface ContractMetricsProps {
  filtered: Contract[];
  contracts: Contract[];
  activeTab: string;
  totalPostTax: number;
  totalPaid: number;
  totalDebt: number;
  collectionRate: number;
  isInput?: boolean;
}

export const ContractMetrics: React.FC<ContractMetricsProps> = ({
  filtered, contracts, activeTab, totalPostTax, totalPaid, totalDebt, collectionRate, isInput
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Tổng HĐ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-blue-50/50 group-hover:bg-blue-100/50 transition-colors z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Số lượng Hợp đồng</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Briefcase size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900">{filtered.length}</p>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500" /> Cập nhật liên tục
          </p>
        </div>
      </div>

      {/* Card 2 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full ${isInput ? 'bg-rose-50/50 group-hover:bg-rose-100/50' : 'bg-emerald-50/50 group-hover:bg-emerald-100/50'} transition-colors z-0`}></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{isInput ? 'Tổng Chi phí' : 'Tổng Doanh thu'}</p>
            <div className={`p-2 rounded-xl ${isInput ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}><DollarSign size={20} /></div>
          </div>
          <p className={`text-2xl font-black truncate ${isInput ? 'text-rose-600' : 'text-emerald-600'}`} title={fmtMoney(totalPostTax)}>{fmtMoney(totalPostTax)}</p>
          <p className="text-xs text-gray-400 mt-2">Tổng giá trị sau thuế (VAT)</p>
        </div>
      </div>

      {/* Card 3: Thực thu */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-indigo-50/50 group-hover:bg-indigo-100/50 transition-colors z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{isInput ? 'Đã chi' : 'Đã thanh toán'}</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <WalletCards size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 truncate" title={fmtMoney(totalPaid)}>{fmtMoney(totalPaid)}</p>
          
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${collectionRate}%` }}></div>
            </div>
            <span className="text-xs font-bold text-gray-500">{collectionRate}%</span>
          </div>
        </div>
      </div>

      {/* Card 4: Công nợ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-rose-50/50 group-hover:bg-rose-100/50 transition-colors z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{isInput ? 'Còn phải trả' : 'Còn phải thu'}</p>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 truncate" title={fmtMoney(totalDebt)}>{fmtMoney(totalDebt)}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">{isInput ? 'Còn phải trả NCC' : 'Còn phải thu từ KH'}</p>
        </div>
      </div>

      {/* Card 5: Lợi nhuận */}
      {activeTab !== 'debts' && (() => {
        const outputContracts = contracts.filter(c => (c.contractType || 'output') === 'output');
        if (outputContracts.length === 0) return null;
        
        const inputContracts = contracts.filter(c => c.contractType === 'input');
        const revenue = outputContracts.reduce((s, c) => s + (c.postTaxValue || 0), 0);
        const expense = inputContracts.reduce((s, c) => s + (c.postTaxValue || 0), 0);
        const profit = revenue - expense;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full ${profit >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50'} transition-colors z-0`}></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Lợi nhuận ước tính</p>
                <div className={`p-2 rounded-xl ${profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}><TrendingUp size={20} /></div>
              </div>
              <p className={`text-2xl font-black truncate ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} title={fmtMoney(profit)}>{fmtMoney(profit)}</p>
              <p className="text-xs text-gray-400 mt-2">Doanh thu - Chi phí</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
