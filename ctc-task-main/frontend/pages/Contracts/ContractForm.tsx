import React from 'react';
import { Printer, Pencil, Trash2, X, PlusCircle, Paperclip, FileText, Upload, Save, Package } from 'lucide-react';
import { Contract, ContractProduct } from '../../services/contractService';
import { WarehousePickerModal } from './WarehousePickerModal';
import { Task } from '../../types';
import { CHECKLIST_ITEMS, numToVnText } from './contractUtils';
import { InputContractPickerModal } from './InputContractPickerModal';

interface ContractFormProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  editingContract: Contract | null;
  tasks: Task[];
  contracts: Contract[];
  clients: { name: string }[];
  projects: any[];
  catalogProducts: any[];
  canApproveContract: boolean;
  newProduct: any;
  setNewProduct: React.Dispatch<React.SetStateAction<any>>;
  editingProductIdx: number | null;
  setEditingProductIdx: React.Dispatch<React.SetStateAction<number | null>>;
  hasInvoice: boolean;
  setHasInvoice: React.Dispatch<React.SetStateAction<boolean>>;
  uploading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (idx: number) => void;
  handlePreTaxChange: (val: number) => void;
  handleVatChange: (val: number) => void;
  handleEditProduct: (idx: number) => void;
  handleRemoveProduct: (idx: number) => void;
  handleAddProduct: () => void;
  handlePrint: () => void;
  handleSave: () => void;
  setActiveTab: (tab: 'output' | 'input' | 'debts' | 'links' | 'create') => void;
  readOnly?: boolean;
}

export const ContractForm: React.FC<ContractFormProps> = ({
  form, setForm, editingContract, tasks, contracts, clients, projects, catalogProducts,
  canApproveContract, newProduct, setNewProduct, editingProductIdx, setEditingProductIdx,
  hasInvoice, setHasInvoice, uploading, handleFileUpload, removeAttachment,
  handlePreTaxChange, handleVatChange, handleEditProduct, handleRemoveProduct, handleAddProduct,
  handlePrint, handleSave, setActiveTab, readOnly
}) => {
  const [showWarehousePicker, setShowWarehousePicker] = React.useState(false);
  const [showInputPicker, setShowInputPicker] = React.useState(false);

  const handleSelectFromInputContract = (products: ContractProduct[], contractId: string) => {
    const newProducts = products.map(p => ({
      name: p.name,
      unit: p.unit || '',
      origin: p.origin || '',
      quantity: p.quantity || 1,
      unitPrice: p.unitPrice || 0,
      total: (p.quantity || 1) * (p.unitPrice || 0),
      exportedQuantity: p.quantity || 1,
    }));

    setForm((f: any) => {
      const currentLinked = f.linkedInputContractIds || [];
      const newLinked = currentLinked.includes(contractId) ? currentLinked : [...currentLinked, contractId];
      return {
        ...f,
        products: [...f.products, ...newProducts],
        linkedInputContractIds: newLinked
      };
    });

    // Auto update totals
    const preTax = [...form.products, ...newProducts].reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    handlePreTaxChange(preTax);
  };

  const handleSelectFromWarehouse = (selectedItems: { product: any; quantity: number }[]) => {
    const newProducts = selectedItems.map(item => ({
      name: item.product.name,
      unit: item.product.unit || '',
      origin: item.product.origin || '',
      quantity: item.quantity,
      unitPrice: item.product.salePrice || item.product.defaultPrice || 0,
      total: item.quantity * (item.product.salePrice || item.product.defaultPrice || 0),
      exportedQuantity: item.quantity,
      sourceProductId: item.product.id,
      sourceProductName: item.product.name
    }));

    setForm((f: any) => ({
      ...f,
      products: [...f.products, ...newProducts],
      preTaxValue: f.preTaxValue + newProducts.reduce((sum, p) => sum + p.total, 0)
    }));
  };

  return (
    <div className="print-area bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <h2 className="text-lg font-bold">{readOnly ? 'Chi tiết Hợp đồng' : editingContract ? 'Sửa hợp đồng' : 'Thêm hợp đồng mới'}</h2>
        <div className="flex gap-2">
          <button onClick={() => handlePrint()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors text-sm">
            <Printer size={16} /> In báo giá
          </button>
        </div>
      </div>
      <fieldset disabled={readOnly} className="group-disabled">
        <div className="p-6 space-y-5">
          {editingContract && tasks && (
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-6">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                Tiến độ thực hiện ({tasks.filter(t => t.contractId === editingContract.id && t.status === 'Done').length}/{tasks.filter(t => t.contractId === editingContract.id).length} Task)
              </h3>
              <span className="text-lg font-black text-emerald-600">
                {tasks.filter(t => t.contractId === editingContract.id).length > 0 ? Math.round((tasks.filter(t => t.contractId === editingContract.id && t.status === 'Done').length / tasks.filter(t => t.contractId === editingContract.id).length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${tasks.filter(t => t.contractId === editingContract.id).length > 0 ? Math.round((tasks.filter(t => t.contractId === editingContract.id && t.status === 'Done').length / tasks.filter(t => t.contractId === editingContract.id).length) * 100) : 0}%` }}></div>
            </div>
            {tasks.filter(t => t.contractId === editingContract.id).length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tasks.filter(t => t.contractId === editingContract.id).map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border border-emerald-50 shadow-sm">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'Done' ? 'bg-emerald-500' : t.status === 'In Progress' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className={`truncate flex-1 font-medium ${t.status === 'Done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{t.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!editingContract && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 border-dashed mb-6 text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-1">Tiến độ công việc</h3>
            <p className="text-xs text-gray-500">Vui lòng <span className="font-bold text-emerald-600">Lưu hợp đồng</span> lần đầu để có thể theo dõi và gán công việc.</p>
          </div>
        )}
        
        {/* Contract Type Selector */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 mb-2">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Loại HĐ:</span>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-bold text-sm transition-all ${form.contractType === 'output' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" name="contractType" value="output" checked={form.contractType === 'output'} onChange={() => setForm((f: any) => ({...f, contractType: 'output'}))} className="sr-only" />
            📤 Hợp đồng Bán
          </label>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-bold text-sm transition-all ${form.contractType === 'input' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" name="contractType" value="input" checked={form.contractType === 'input'} onChange={() => setForm((f: any) => ({...f, contractType: 'input'}))} className="sr-only" />
            📥 Hợp đồng Mua
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Số hợp đồng *</label>
            <input 
              list="contract-number-suggestions"
              value={form.contractNumber} 
              onChange={e => setForm((f: any) => ({...f, contractNumber: e.target.value}))} 
              placeholder="VD: HD 02-2026/VTKH-CTC"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            />
            <datalist id="contract-number-suggestions">
              {Array.from(new Set(contracts.map(c => c.contractNumber?.trim()).filter(Boolean))).sort().map(num => (
                <option key={num} value={num} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">{form.contractType === 'input' ? 'Nhà cung cấp *' : 'Khách hàng / Chủ đầu tư *'}</label>
            <input 
              list="client-suggestions"
              value={form.contractType === 'input' ? form.supplierName : form.clientName} 
              onChange={e => form.contractType === 'input' ? setForm((f: any) => ({...f, supplierName: e.target.value, clientName: e.target.value})) : setForm((f: any) => ({...f, clientName: e.target.value}))} 
              placeholder={form.contractType === 'input' ? 'VD: Công ty ABC' : 'VD: Viễn thông Khánh Hòa'}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            />
            <datalist id="client-suggestions">
              {Array.from(new Set([
                ...clients.map(c => c.name),
                ...contracts.map(c => c.clientName?.trim()),
                ...contracts.filter(c => c.supplierName).map(c => c.supplierName!.trim())
              ].filter(Boolean))).sort().map(client => (
                <option key={client} value={client} />
              ))}
            </datalist>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Tên hợp đồng / Mô tả chung *</label>
            <input 
              list="contract-name-suggestions"
              value={form.contractName} 
              onChange={e => setForm((f: any) => ({...f, contractName: e.target.value}))} 
              placeholder="VD: Cung cấp thiết bị mạng"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            />
            <datalist id="contract-name-suggestions">
              {Array.from(new Set(contracts.map(c => c.contractName?.trim()).filter(Boolean))).sort().map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Thuộc Dự án (Tùy chọn)</label>
            <select value={form.projectId || ''} onChange={e => setForm((f: any) => ({...f, projectId: e.target.value}))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="">-- Không thuộc dự án nào --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} - {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Trạng thái *</label>
            <select value={form.status} onChange={e => setForm((f: any) => ({...f, status: e.target.value}))}
              className="w-full px-4 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="draft">Bản nháp</option>
              <option value="pending">Chờ duyệt</option>
              {(canApproveContract || form.status === 'in_progress') && <option value="in_progress">Đang thực hiện</option>}
              {(canApproveContract || form.status === 'completed') && <option value="completed">Đã hoàn thành</option>}
              {(canApproveContract || form.status === 'cancelled') && <option value="cancelled">Đã hủy</option>}
            </select>
          </div>
        </div>

        {/* Chi tiết sản phẩm */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Chi tiết sản phẩm / Dịch vụ</label>
            {form.contractType === 'output' && !readOnly && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowInputPicker(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                >
                  <FileText size={14} /> Chọn từ HĐ Mua vào
                </button>
                <button 
                  onClick={() => setShowWarehousePicker(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors border border-emerald-200"
                >
                  <Package size={14} /> Chọn từ kho
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto mb-4 border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-[11px] uppercase tracking-wider">
                  <th className="p-3 font-bold border-b border-gray-200 text-center w-12">STT</th>
                  <th className="p-3 font-bold border-b border-gray-200 min-w-[200px]">Tên sản phẩm *</th>
                  <th className="p-3 font-bold border-b border-gray-200 w-24">ĐVT</th>
                  <th className="p-3 font-bold border-b border-gray-200 w-32">Xuất xứ</th>
                  <th className="p-3 font-bold border-b border-gray-200 w-20 text-center">SL *</th>
                  <th className="p-3 font-bold border-b border-gray-200 w-36 text-right">Đơn giá (VNĐ) *</th>
                  <th className="p-3 font-bold border-b border-gray-200 w-20 text-center">Thuế (%)</th>
                  <th className="p-3 font-bold border-b border-gray-200 w-36 text-right">Thành tiền (VNĐ)</th>
                  <th className="p-3 font-bold border-b border-gray-200 w-24 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {form.products.map((p: ContractProduct, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm text-gray-500 font-medium text-center">{idx + 1}</td>
                    <td className="p-3 text-sm font-bold text-gray-800">
                      {p.name}
                      {p.sourceProductId && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          <Package size={10} /> Kho
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{p.unit || '-'}</td>
                    <td className="p-3 text-sm text-gray-600">{p.origin || '-'}</td>
                    <td className="p-3 text-sm font-semibold text-gray-700 text-center">{p.quantity}</td>
                    <td className="p-3 text-sm font-medium text-gray-600 text-right">{p.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-sm font-medium text-gray-600 text-center">{p.vatRate ?? 8}</td>
                    <td className="p-3 text-sm font-bold text-emerald-600 text-right">{p.total.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEditProduct(idx)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                          <Pencil size={16}/>
                        </button>
                        <button onClick={() => handleRemoveProduct(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {form.products.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-sm text-gray-400 italic text-center border-b border-gray-100">
                      Chưa có sản phẩm nào. Vui lòng nhập thông tin bên dưới để thêm.
                    </td>
                  </tr>
                )}
              </tbody>
              {!readOnly && (
                <tbody className="bg-emerald-50/30">
                  <tr>
                    <td className="p-2 text-center text-xs font-bold text-emerald-600">*</td>
                    <td className="p-2">
                    <input value={newProduct.name} onChange={e => {
                      const val = e.target.value;
                      const updates: any = { name: val };
                      if (val) {
                        const catalogMatch = catalogProducts.find(p => p.name.trim().toLowerCase() === val.trim().toLowerCase());
                        const historyMatch = contracts.flatMap(c => c.products || []).find(p => p.name?.trim().toLowerCase() === val.trim().toLowerCase());
                        const match = catalogMatch || historyMatch;
                        if (match) {
                          if (!newProduct.unit) updates.unit = match.unit || '';
                          if (!newProduct.origin) updates.origin = match.origin || '';
                          if (!newProduct.unitPrice) {
                            if ('importPrice' in match || 'salePrice' in match) {
                              if (form.contractType === 'input' && match.importPrice) updates.unitPrice = String(match.importPrice);
                              else if (form.contractType !== 'input' && match.salePrice) updates.unitPrice = String(match.salePrice);
                              else if (match.defaultPrice !== undefined) updates.unitPrice = String(match.defaultPrice);
                            } else if ('unitPrice' in match) {
                              updates.unitPrice = String(match.unitPrice);
                            }
                          }
                        }
                      }
                      setNewProduct({...newProduct, ...updates});
                    }} placeholder="Nhập tên SP..."
                      list="product-name-suggestions"
                      className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"/>
                    <datalist id="product-name-suggestions">
                      {Array.from(new Set([
                        ...catalogProducts.map(p => p.name.trim()),
                        ...contracts.flatMap(c => c.products || []).map(p => p.name?.trim())
                      ].filter(Boolean))).sort().map(val => (
                        <option key={val} value={val} />
                      ))}
                    </datalist>
                  </td>
                  <td className="p-2">
                    <input value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} placeholder="VD: Cái"
                      list="product-unit-suggestions"
                      className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"/>
                    <datalist id="product-unit-suggestions">
                      {Array.from(new Set([
                        ...catalogProducts.filter(p => !newProduct.name || p.name.trim().toLowerCase() === newProduct.name.trim().toLowerCase()).map(p => p.unit?.trim()),
                        ...contracts.flatMap(c => c.products || []).filter(p => !newProduct.name || p.name?.trim().toLowerCase() === newProduct.name.trim().toLowerCase()).map(p => p.unit?.trim())
                      ].filter(Boolean))).sort().map(val => (
                        <option key={val} value={val} />
                      ))}
                    </datalist>
                  </td>
                  <td className="p-2">
                    <input value={newProduct.origin} onChange={e => setNewProduct({...newProduct, origin: e.target.value})} placeholder="VD: VN"
                      list="product-origin-suggestions"
                      className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"/>
                    <datalist id="product-origin-suggestions">
                      {Array.from(new Set([
                        ...catalogProducts.filter(p => !newProduct.name || p.name.trim().toLowerCase() === newProduct.name.trim().toLowerCase()).map(p => p.origin?.trim()),
                        ...contracts.flatMap(c => c.products || []).filter(p => !newProduct.name || p.name?.trim().toLowerCase() === newProduct.name.trim().toLowerCase()).map(p => p.origin?.trim())
                      ].filter(Boolean))).sort().map(val => (
                        <option key={val} value={val} />
                      ))}
                    </datalist>
                  </td>
                  <td className="p-2">
                    <input type="number" min="1" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} placeholder="1"
                      className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-center"/>
                  </td>
                  <td className="p-2">
                    <input type="text" value={newProduct.unitPrice ? Number(newProduct.unitPrice.replace(/\D/g, '')).toLocaleString('vi-VN') : ''} 
                      onChange={e => setNewProduct({...newProduct, unitPrice: e.target.value})} placeholder="1.000.000"
                      list="product-price-suggestions"
                      className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-right"/>
                    <datalist id="product-price-suggestions">
                      {Array.from(new Set(contracts.flatMap(c => c.products || [])
                        .filter(p => !newProduct.name || p.name?.trim().toLowerCase() === newProduct.name.trim().toLowerCase())
                        .map(p => Number(p.unitPrice)).filter(v => !isNaN(v) && v > 0)
                      )).sort((a, b) => a - b).map(val => (
                        <option key={val} value={val.toLocaleString('vi-VN')} />
                      ))}
                    </datalist>
                  </td>
                  <td className="p-2">
                    <input type="number" min="0" max="100" value={newProduct.vatRate} onChange={e => setNewProduct({...newProduct, vatRate: e.target.value})} placeholder="8"
                      className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-center"/>
                  </td>
                  <td className="p-2">
                    <input type="text" readOnly disabled
                      value={((Number(newProduct.quantity) || 1) * (Number(newProduct.unitPrice.replace(/\D/g, '')) || 0)).toLocaleString('vi-VN')}
                      className="w-full px-2 py-1.5 text-sm border border-transparent rounded-md bg-emerald-100 font-bold text-emerald-800 text-right cursor-not-allowed"/>
                  </td>
                  <td className="p-2 text-center">
                    {editingProductIdx !== null ? (
                      <div className="flex gap-1">
                        <button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.unitPrice}
                          className="flex-1 py-1.5 text-sm font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm" title="Cập nhật">
                          Lưu
                        </button>
                        <button onClick={() => { setNewProduct({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '' }); setEditingProductIdx(null); }}
                          className="py-1.5 px-2 text-sm font-bold text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center shadow-sm" title="Hủy">
                          <X size={14}/>
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.unitPrice}
                        className="w-full py-1.5 text-sm font-bold text-white bg-emerald-500 rounded-md hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1 shadow-sm">
                        <PlusCircle size={14}/> Thêm
                      </button>
                    )}
                  </td>
                </tr>
              </tbody>
              )}
              <tbody className="bg-emerald-50/30 border-t-2 border-emerald-200">
                <tr>
                  <td colSpan={6} className="p-3 text-right text-emerald-800 uppercase text-xs font-bold align-middle">Tổng giá trị (Trước thuế)</td>
                  <td colSpan={2} className="p-2">
                    <input type="text" value={form.preTaxValue ? form.preTaxValue.toLocaleString('vi-VN') : ''} 
                      onChange={e => { const raw = e.target.value.replace(/\D/g, ''); handlePreTaxChange(Number(raw) || 0); }}
                      className="w-full px-3 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-bold text-emerald-700 text-right"/>
                  </td>
                  <td></td>
                </tr>
                {(() => {
                  const vatSummary = form.products.reduce((acc: any, p: ContractProduct) => {
                    const rate = p.vatRate ?? 8;
                    acc[rate] = (acc[rate] || 0) + (p.total * rate) / 100;
                    return acc;
                  }, {});
                  const rates = Object.keys(vatSummary).map(Number).sort((a, b) => a - b);
                  if (rates.length === 0) rates.push(8);
                  
                  return rates.map(rate => (
                    <tr key={rate}>
                      <td colSpan={6} className="p-3 text-right text-emerald-800 uppercase text-xs font-bold align-middle">Thuế VAT ({rate}%)</td>
                      <td colSpan={2} className="p-2">
                        <input type="text" value={(vatSummary[rate] || 0).toLocaleString('vi-VN')} readOnly disabled
                          className="w-full px-3 py-1.5 text-sm border border-transparent rounded-md bg-white font-bold text-emerald-700 text-right cursor-not-allowed"/>
                      </td>
                      <td></td>
                    </tr>
                  ));
                })()}
                <tr>
                  <td colSpan={6} className="p-3 text-right text-emerald-800 uppercase text-xs font-bold align-middle">Tổng cộng (Sau thuế)</td>
                  <td colSpan={2} className="p-2">
                    <input type="text" value={form.postTaxValue ? form.postTaxValue.toLocaleString('vi-VN') : ''} readOnly disabled
                      className="w-full px-3 py-1.5 text-sm border border-transparent rounded-md bg-emerald-200/50 font-extrabold text-emerald-900 text-right cursor-not-allowed"/>
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={9} className="p-3 pt-1 border-t border-emerald-100">
                    <p className="text-sm font-medium text-emerald-800 text-right pr-[104px]">
                      <span className="italic text-gray-500 mr-2">Viết bằng chữ:</span>
                      {numToVnText(form.postTaxValue)}
                    </p>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3 mt-1 cursor-pointer w-max">
              <input type="checkbox" checked={hasInvoice} 
                onChange={e => {
                  setHasInvoice(e.target.checked);
                  if (!e.target.checked) setForm((f: any) => ({...f, invoiceDate: '', invoiceNumber: ''}));
                }}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"/>
              Hợp đồng này đã xuất hóa đơn?
            </label>
            
            {hasInvoice && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Ngày xuất hóa đơn</label>
                  <input type="date" value={form.invoiceDate} onChange={e => setForm((f: any) => ({...f, invoiceDate: e.target.value}))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Số hóa đơn</label>
                  <input value={form.invoiceNumber} onChange={e => setForm((f: any) => ({...f, invoiceNumber: e.target.value}))} placeholder="VD: 0001234"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"/>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Đính kèm file */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <label className="block text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Paperclip size={14} /> Tài liệu đính kèm
          </label>
          
          <div className="space-y-3">
            {form.attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {form.attachments.map((url: string, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm group hover:border-emerald-300 transition-colors">
                    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 truncate" title={url.split('/').pop()}>
                      <FileText size={14} className="flex-shrink-0" />
                      <span className="truncate">{url.split('/').pop()}</span>
                    </a>
                    <button onClick={() => removeAttachment(idx)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" />
              <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${uploading ? 'bg-gray-100 border-gray-300' : 'bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'}`}>
                {uploading ? (
                  <div className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    Đang tải lên...
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-emerald-500 mb-2" />
                    <p className="text-sm font-bold text-gray-700">Kéo thả hoặc Click để chọn file đính kèm</p>
                    <p className="text-xs text-gray-500 mt-1">Hỗ trợ PDF, Excel, Word, Ảnh (Max 10MB/file)</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Hồ sơ HĐ */}
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
              📋 Checklist hồ sơ hợp đồng
            </label>
            <span className="text-xs font-bold text-amber-600">
              {CHECKLIST_ITEMS.filter(item => form.documentChecklist && form.documentChecklist[item.key]).length}/{CHECKLIST_ITEMS.length} hoàn thành
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-amber-100 rounded-full h-2 mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(CHECKLIST_ITEMS.filter(item => form.documentChecklist && form.documentChecklist[item.key]).length / CHECKLIST_ITEMS.length) * 100}%` }}></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CHECKLIST_ITEMS.map(item => {
              const isChecked = !!(form.documentChecklist && form.documentChecklist[item.key]);
              return (
                <div 
                  key={item.key} 
                  onClick={() => {
                    if (readOnly) return;
                    setForm((f: any) => {
                      const currentList = f.documentChecklist || {};
                      return { ...f, documentChecklist: { ...currentList, [item.key]: !currentList[item.key] } };
                    });
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border ${readOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${isChecked ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                    {isChecked && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                  <span className={`text-sm font-medium ${isChecked ? 'text-emerald-700' : 'text-gray-600'}`}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      </fieldset>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        <button onClick={() => setActiveTab('output')} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">← Quay lại</button>
        <div className="flex gap-3">
          {editingContract && !readOnly && (
            <button onClick={() => {
              const style = document.createElement('style');
              style.innerHTML = `@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; } }`;
              document.head.appendChild(style);
              window.print();
              setTimeout(() => document.head.removeChild(style), 1000);
            }} className="px-5 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2">
              <FileText size={16}/> In HĐ
            </button>
          )}
          <button onClick={() => setActiveTab('output')} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors pointer-events-auto">
            {readOnly ? 'Đóng' : 'Hủy'}
          </button>
          {!readOnly && (
            <button onClick={handleSave} disabled={!form.contractNumber || !form.clientName || !form.contractName}
              className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Save size={16}/> {editingContract ? 'Cập nhật' : 'Lưu Hợp đồng'}
            </button>
          )}
        </div>
      </div>

      <WarehousePickerModal
        isOpen={showWarehousePicker}
        onClose={() => setShowWarehousePicker(false)}
        products={catalogProducts}
        contracts={contracts}
        onSelect={handleSelectFromWarehouse}
      />
      <InputContractPickerModal
        isOpen={showInputPicker}
        onClose={() => setShowInputPicker(false)}
        contracts={contracts}
        onSelect={handleSelectFromInputContract}
      />
    </div>
  );
};
