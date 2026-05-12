import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Avatar } from '../../components/UI';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PlusCircle, Search, FileText, Pencil, Trash2, X, Save, Building2, DollarSign, Hash, Calendar as CalendarIcon, Filter, Upload, Paperclip, Download, Briefcase, WalletCards, TrendingUp, AlertCircle, Wallet, Printer, PackageMinus } from 'lucide-react';
import { Contract, ContractProduct, ContractType, DocumentChecklist } from '../../services/contractService';
import { apiFetch } from '../../services/api';
import * as XLSX from 'xlsx-js-style';
import * as productService from '../../services/productService';
import { PaymentModal } from './PaymentModal';
import { useReactToPrint } from 'react-to-print';
import { PrintableQuote } from './PrintableQuote';
import { ExportStockModal } from './ExportStockModal';
import { ExportInvoiceModal } from './ExportInvoiceModal';
import { Pagination } from '../../components/Pagination';
import { ContractLinksTab } from './ContractLinksTab';
const fmtMoney = (v: number) => v.toLocaleString('vi-VN') + ' ₫';

const CHECKLIST_ITEMS: { key: keyof DocumentChecklist; label: string; short: string }[] = [
  { key: 'hopDongGoc', label: 'Hợp đồng gốc', short: 'HĐ' },
  { key: 'hoaDon', label: 'Hóa đơn', short: 'HĐn' },
  { key: 'bbbg', label: 'Biên bản bàn giao (BBBG)', short: 'BBBG' },
  { key: 'bbnt', label: 'Biên bản nghiệm thu (BBNT)', short: 'BBNT' },
  { key: 'deNghiTT', label: 'Đề nghị thanh toán', short: 'ĐNTT' },
  { key: 'thanhLy', label: 'Thanh lý hợp đồng', short: 'TL' },
  { key: 'camKetBH', label: 'Cam kết bảo hành', short: 'BH' },
  { key: 'coCq', label: 'CO-CQ', short: 'CO' },
  { key: 'phuluc', label: 'Phụ lục HĐ', short: 'PL' },
];

const readGroup = (group: number): string => {
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  let str = "";
  const h = Math.floor(group / 100);
  const t = Math.floor((group % 100) / 10);
  const u = group % 10;
  if (h > 0) str += digits[h] + " trăm ";
  if (t > 1) str += digits[t] + " mươi ";
  else if (t === 1) str += "mười ";
  else if (h > 0 && u > 0) str += "lẻ ";
  if (u === 1 && t > 1) str += "mốt ";
  else if (u === 5 && t > 0) str += "lăm ";
  else if (u > 0) str += digits[u] + " ";
  return str;
};

const numToVnText = (num: number): string => {
  if (num === 0) return "Không đồng";
  if (num < 0) return "Âm " + numToVnText(Math.abs(num));
  let str = "";
  let groupIdx = 0;
  const units = ["", "nghìn ", "triệu ", "tỷ ", "nghìn tỷ "];
  while (num > 0) {
    const group = num % 1000;
    num = Math.floor(num / 1000);
    if (group > 0) str = readGroup(group) + units[groupIdx] + str;
    groupIdx++;
  }
  str = str.trim().replace(/\s+/g, ' ');
  return str.charAt(0).toUpperCase() + str.slice(1) + " đồng";
  return str.charAt(0).toUpperCase() + str.slice(1) + " đồng";
};

const getStatusBadge = (status: string = 'draft') => {
  const s = {
    draft: { label: 'Bản nháp', classes: 'bg-gray-100 text-gray-700 border-gray-200' },
    pending: { label: 'Chờ duyệt', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
    in_progress: { label: 'Đang thực hiện', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
    completed: { label: 'Đã hoàn thành', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Đã hủy', classes: 'bg-red-100 text-red-700 border-red-200' },
  }[status] || { label: 'Bản nháp', classes: 'bg-gray-100 text-gray-700 border-gray-200' };

  return <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${s.classes}`}>{s.label}</span>;
};

const ContractsPage: React.FC = () => {
  const { user } = useAuth();
  const { contracts, clients, users, departments, tasks, projects, saveContract, deleteContract } = useData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDebt, setFilterDebt] = useState('all');
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'debts' | 'links' | 'create'>('output');
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [paymentContract, setPaymentContract] = useState<Contract | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '' });
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(null);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [exportStockContract, setExportStockContract] = useState<Contract | null>(null);
  const [exportInvoiceContract, setExportInvoiceContract] = useState<Contract | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterDebt, activeTab]);

  // Form state
  const emptyChecklist: DocumentChecklist = {};
  const [form, setForm] = useState<{ contractNumber: string, clientName: string, contractName: string, preTaxValue: number, vatRate: number, postTaxValue: number, invoiceDate: string, invoiceNumber: string, products: ContractProduct[], status: string, attachments: string[], paidAmount: number, projectId: string, contractType: ContractType, supplierName: string, documentChecklist: DocumentChecklist }>({ contractNumber: '', clientName: '', contractName: '', preTaxValue: 0, vatRate: 10, postTaxValue: 0, invoiceDate: '', invoiceNumber: '', products: [], status: 'draft', attachments: [], paidAmount: 0, projectId: '', contractType: 'output', supplierName: '', documentChecklist: {} });
  const [uploading, setUploading] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<productService.Product[]>([]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bao_Gia_${form.clientName || 'Khach_Hang'}`,
  });

  useEffect(() => {
    productService.getProducts().then(setCatalogProducts).catch(console.error);
  }, []);

  const perms = user?.permissions || [];
  const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel');
  const canApproveContract = canViewAll || perms.includes('approve_dept_reports') || user?.role === 'Manager';
  const userDept = user?.department || '';

  const filtered = useMemo(() => {
    let list = contracts;

    // Filter by contract type for output/input tabs
    if (activeTab === 'output' || activeTab === 'create') {
      list = list.filter(c => (c.contractType || 'output') === (activeTab === 'create' ? form.contractType : 'output'));
      if (filterStatus !== 'all') {
        list = list.filter(c => c.status === filterStatus);
      }
    } else if (activeTab === 'input') {
      list = list.filter(c => c.contractType === 'input');
      if (filterStatus !== 'all') {
        list = list.filter(c => c.status === filterStatus);
      }
    } else if (activeTab === 'debts') {
      if (filterDebt !== 'all') {
        list = list.filter(c => {
          const pTax = c.postTaxValue || 0;
          const paid = c.paidAmount || 0;
          const debt = Math.max(0, pTax - paid);
          if (filterDebt === 'unpaid') return paid === 0 && pTax > 0;
          if (filterDebt === 'partial') return paid > 0 && debt > 0;
          if (filterDebt === 'paid') return debt === 0 && pTax > 0;
          return true;
        });
      }
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.contractNumber.toLowerCase().includes(q) || c.clientName.toLowerCase().includes(q) || c.contractName.toLowerCase().includes(q) || (c.supplierName || '').toLowerCase().includes(q));
    }
    return list;
  }, [contracts, search, filterStatus, filterDebt, activeTab, form.contractType, canViewAll, userDept]);

  const totalValue = useMemo(() => filtered.reduce((s, c) => s + (c.preTaxValue || 0), 0), [filtered]);
  const totalPostTax = useMemo(() => filtered.reduce((s, c) => s + (c.postTaxValue || 0), 0), [filtered]);
  const totalPaid = useMemo(() => filtered.reduce((s, c) => s + (c.paidAmount || 0), 0), [filtered]);
  const totalDebt = Math.max(0, totalPostTax - totalPaid);
  const collectionRate = totalPostTax > 0 ? Math.round((totalPaid / totalPostTax) * 100) : 0;

  const openCreate = (type?: ContractType) => {
    setEditingContract(null);
    const ct = type || (activeTab === 'input' ? 'input' : 'output');
    setForm({ contractNumber: '', clientName: '', contractName: '', preTaxValue: 0, vatRate: 10, postTaxValue: 0, invoiceDate: '', invoiceNumber: '', products: [], status: 'draft', attachments: [], paidAmount: 0, projectId: '', contractType: ct, supplierName: '', documentChecklist: {} });
    setNewProduct({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '' });
    setEditingProductIdx(null);
    setHasInvoice(false);
    setActiveTab('create');
  };

  const openEdit = (c: Contract) => {
    setEditingContract(c);
    setForm({ contractNumber: c.contractNumber, clientName: c.clientName, contractName: c.contractName, preTaxValue: c.preTaxValue, vatRate: c.vatRate || 10, postTaxValue: c.postTaxValue || 0, invoiceDate: c.invoiceDate || '', invoiceNumber: c.invoiceNumber || '', products: c.products || [], status: c.status || 'draft', attachments: c.attachments || [], paidAmount: c.paidAmount || 0, projectId: c.projectId || '', contractType: c.contractType || 'output', supplierName: c.supplierName || '', documentChecklist: c.documentChecklist || {} });
    setNewProduct({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '' });
    setEditingProductIdx(null);
    setHasInvoice(!!c.invoiceDate || !!c.invoiceNumber);
    setActiveTab('create');
  };

  const handleEditProduct = (idx: number) => {
    const p = form.products[idx];
    setNewProduct({ name: p.name, unit: p.unit || '', quantity: String(p.quantity), origin: p.origin || '', unitPrice: String(p.unitPrice) });
    setEditingProductIdx(idx);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.unitPrice) return;
    const unitPrice = Number(newProduct.unitPrice.replace(/\D/g, '')) || 0;
    const qty = Number(newProduct.quantity) || 1;
    const total = unitPrice * qty;
    
    setForm(f => {
      const newList = [...f.products];
      if (editingProductIdx !== null) {
        const oldTotal = newList[editingProductIdx].total;
        newList[editingProductIdx] = { name: newProduct.name, unit: newProduct.unit, quantity: qty, origin: newProduct.origin, unitPrice, total };
        const newPreTax = f.preTaxValue - oldTotal + total;
        return { ...f, products: newList, preTaxValue: newPreTax, postTaxValue: newPreTax + (newPreTax * f.vatRate / 100) };
      } else {
        const newPreTax = f.preTaxValue + total;
        return { ...f, products: [...newList, { name: newProduct.name, unit: newProduct.unit, quantity: qty, origin: newProduct.origin, unitPrice, total }], preTaxValue: newPreTax, postTaxValue: newPreTax + (newPreTax * f.vatRate / 100) };
      }
    });
    setNewProduct({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '' });
    setEditingProductIdx(null);
  };

  const handleRemoveProduct = (idx: number) => {
    setForm(f => {
      const list = [...f.products];
      const p = list[idx];
      list.splice(idx, 1);
      const newPreTax = Math.max(0, f.preTaxValue - p.total);
      return { ...f, products: list, preTaxValue: newPreTax, postTaxValue: newPreTax + (newPreTax * f.vatRate / 100) };
    });
  };

  const handleVatChange = (rate: number) => {
    setForm(f => ({ ...f, vatRate: rate, postTaxValue: f.preTaxValue + (f.preTaxValue * rate / 100) }));
  };

  const handlePreTaxChange = (val: number) => {
    setForm(f => ({ ...f, preTaxValue: val, postTaxValue: val + (val * f.vatRate / 100) }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const formData = new FormData();
    Array.from(e.target.files).forEach(f => formData.append('files', f));
    
    try {
      setUploading(true);
      const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const newUrls = data.files.map((f: any) => f.url);
      setForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...newUrls] }));
    } catch (err) {
      alert('Lỗi khi tải file lên!');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (idx: number) => {
    setForm(prev => {
      const list = [...(prev.attachments || [])];
      list.splice(idx, 1);
      return { ...prev, attachments: list };
    });
  };

  const handleSave = async () => {
    if (!form.contractNumber.trim()) {
      alert("Vui lòng nhập Số hợp đồng!");
      return;
    }
    
    const isDuplicate = contracts.some(c => 
      c.contractNumber.trim().toLowerCase() === form.contractNumber.trim().toLowerCase() &&
      c.id !== editingContract?.id
    );

    if (isDuplicate) {
      alert("Lỗi: Số hợp đồng này đã tồn tại trong hệ thống! Vui lòng kiểm tra lại.");
      return;
    }

    const contract: Contract & { _isNew?: boolean } = {
      _isNew: !editingContract,
      id: editingContract?.id || Math.random().toString(36).slice(2, 9),
      contractNumber: form.contractNumber,
      clientName: form.clientName,
      contractName: form.contractName,
      products: form.products,
      preTaxValue: Number(form.preTaxValue) || 0,
      vatRate: Number(form.vatRate) || 0,
      postTaxValue: Number(form.postTaxValue) || 0,
      invoiceDate: form.invoiceDate || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      status: form.status,
      attachments: form.attachments,
      paidAmount: Number(form.paidAmount) || 0,
      department: user?.department || '',
      createdBy: user?.id || '',
      createdAt: editingContract?.createdAt || new Date().toISOString(),
      contractType: form.contractType || 'output',
      supplierName: form.supplierName || undefined,
      documentChecklist: form.documentChecklist || {},
    };
    await saveContract(contract);
    setActiveTab(form.contractType === 'input' ? 'input' : 'output');
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteContract(deleteId); setDeleteId(null); }
  };

  const handleQuickStatusChange = async (c: Contract, newStatus: string) => {
    try {
      await saveContract({ ...c, status: newStatus, _isNew: false });
    } catch (e) {
      alert("Lỗi khi cập nhật trạng thái!");
    }
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    
    const dataToExport = filtered.map((c, i) => ({
      'STT': i + 1,
      'Số hợp đồng': c.contractNumber,
      'Chủ đầu tư': c.clientName,
      'Tên hợp đồng': c.contractName,
      'Trạng thái': { draft: 'Bản nháp', pending: 'Chờ duyệt', in_progress: 'Đang thực hiện', completed: 'Đã hoàn thành', cancelled: 'Đã hủy' }[c.status || 'draft'],
      'Giá trị trước thuế': c.preTaxValue,
      'Thuế VAT (%)': c.vatRate,
      'Tổng sau thuế': c.postTaxValue,
      'Đã thanh toán': c.paidAmount || 0,
      'Công nợ': Math.max(0, (c.postTaxValue || 0) - (c.paidAmount || 0)),
      'Ngày xuất HĐ': c.invoiceDate ? new Date(c.invoiceDate).toLocaleDateString('vi-VN') : '',
      'Số hóa đơn': c.invoiceNumber || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hop_Dong");
    XLSX.writeFile(wb, `Danh_Sach_Hop_Dong_${new Date().getTime()}.xlsx`);
  };

  const handleSaveExportStock = async (contractId: string, updatedProducts: ContractProduct[]) => {
    const targetContract = contracts.find(c => c.id === contractId);
    if (!targetContract) return;
    const newContract = { ...targetContract, products: updatedProducts };
    await saveContract(newContract);
  };

  const handleSaveExportInvoice = async (contractId: string, updatedProducts: ContractProduct[], invNumber: string, invDate: string) => {
    const targetContract = contracts.find(c => c.id === contractId);
    if (!targetContract) return;
    const newContract = { 
      ...targetContract, 
      products: updatedProducts, 
      invoiceNumber: invNumber, 
      invoiceDate: invDate,
      status: targetContract.status === 'draft' ? 'pending' : targetContract.status
    };
    await saveContract(newContract);
  };

  const handlePaymentSave = async (contractId: string, additionalAmount: number) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    const currentPaid = contract.paidAmount || 0;
    const newPaidAmount = currentPaid + additionalAmount;
    await saveContract({ ...contract, paidAmount: newPaidAmount, _isNew: false });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <FileText size={20} className="text-white"/>
            </div>
            Quản lý Hợp đồng
          </h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi và quản lý hợp đồng kinh doanh</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab !== 'create' && (
            <Button variant="secondary" onClick={handleExportExcel} size="sm" className="gap-1">
              <Download size={14}/> Xuất Excel
            </Button>
          )}
          <Button variant={activeTab === 'output' ? 'primary' : 'secondary'} onClick={() => setActiveTab('output')} size="sm">📤 HĐ Đầu ra</Button>
          <Button variant={activeTab === 'input' ? 'primary' : 'secondary'} onClick={() => setActiveTab('input')} size="sm">📥 HĐ Đầu vào</Button>
          <Button variant={activeTab === 'links' ? 'primary' : 'secondary'} onClick={() => setActiveTab('links')} size="sm">🔗 Liên kết</Button>
          <Button variant={activeTab === 'debts' ? 'primary' : 'secondary'} onClick={() => setActiveTab('debts')} size="sm">Công nợ</Button>
          <Button variant={activeTab === 'create' ? 'primary' : 'secondary'} onClick={() => openCreate()} size="sm" className="gap-1">
            <PlusCircle size={14}/> Thêm HĐ
          </Button>
        </div>
      </div>

      {/* Links Tab */}
      {activeTab === 'links' && (
        <ContractLinksTab contracts={contracts} />
      )}

      {activeTab !== 'create' && activeTab !== 'links' && (
        <div className="space-y-6 animate-in fade-in duration-300">

      {/* Dashboard Metrics */}
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
          <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full ${activeTab === 'input' ? 'bg-rose-50/50 group-hover:bg-rose-100/50' : 'bg-emerald-50/50 group-hover:bg-emerald-100/50'} transition-colors z-0`}></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{activeTab === 'input' ? 'Tổng Chi phí' : 'Tổng Doanh thu'}</p>
              <div className={`p-2 rounded-xl ${activeTab === 'input' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}><DollarSign size={20} /></div>
            </div>
            <p className={`text-2xl font-black truncate ${activeTab === 'input' ? 'text-rose-600' : 'text-emerald-600'}`} title={fmtMoney(totalPostTax)}>{fmtMoney(totalPostTax)}</p>
            <p className="text-xs text-gray-400 mt-2">Tổng giá trị sau thuế (VAT)</p>
          </div>
        </div>

        {/* Card 3: Thực thu */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-indigo-50/50 group-hover:bg-indigo-100/50 transition-colors z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{activeTab === 'input' ? 'Đã chi' : 'Đã thanh toán'}</p>
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
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{activeTab === 'input' ? 'Còn phải trả' : 'Còn phải thu'}</p>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle size={20} />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600 truncate" title={fmtMoney(totalDebt)}>{fmtMoney(totalDebt)}</p>
            <p className="text-xs text-gray-400 mt-2 font-medium">{activeTab === 'input' ? 'Còn phải trả NCC' : 'Còn phải thu từ KH'}</p>
          </div>
        </div>

        {/* Card 5: Lợi nhuận */}
        {activeTab !== 'debts' && (() => {
          const outputContracts = contracts.filter(c => (c.contractType || 'output') === 'output');
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

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Tìm số HĐ, chủ đầu tư, tên HĐ..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"/>
        </div>
        {activeTab !== 'debts' ? (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm min-w-[150px]">
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="pending">Chờ duyệt</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        ) : (
          <select value={filterDebt} onChange={e => setFilterDebt(e.target.value)}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm min-w-[150px]">
            <option value="all">Tất cả công nợ</option>
            <option value="unpaid">Chưa thu đồng nào</option>
            <option value="partial">Đang thu dở (Còn nợ)</option>
            <option value="paid">Đã thu đủ</option>
          </select>
        )}
      </div>

      {/* Tables */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {(activeTab === 'output' || activeTab === 'input') && (() => {
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
              <>
                <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Hợp đồng</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                {canViewAll && <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Phòng ban</th>}
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Giá trị / Công nợ</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Người tạo</th>
                <th className="text-right py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.map(c => {
                const debt = Math.max(0, (c.postTaxValue || 0) - (c.paidAmount || 0));
                return (
                  <tr key={c.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-gray-800">{c.contractNumber}</p>
                          {c.attachments && c.attachments.length > 0 && <Paperclip size={12} className="text-emerald-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]" title={c.contractName}>{c.contractName}</p>
                        <div className="flex items-center">
                          {c.invoiceNumber ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                              Hóa đơn số: {c.invoiceNumber} {c.invoiceDate ? `- ${new Date(c.invoiceDate).toLocaleDateString('vi-VN')}` : ''}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">Chưa có hóa đơn</span>
                          )}
                        </div>
                        {/* Document Checklist Mini */}
                        {(() => {
                          const cl = c.documentChecklist || {};
                          const done = CHECKLIST_ITEMS.filter(item => cl[item.key]).length;
                          const total = CHECKLIST_ITEMS.length;
                          if (done === 0) return null;
                          return (
                            <div className="flex items-center gap-1 mt-1" title={`Hồ sơ: ${done}/${total} - ${CHECKLIST_ITEMS.filter(item => cl[item.key]).map(i => i.short).join(', ')}`}>
                              {CHECKLIST_ITEMS.map(item => (
                                <div key={item.key} className={`w-2 h-2 rounded-full ${cl[item.key] ? 'bg-emerald-500' : 'bg-gray-200'}`} title={item.label}></div>
                              ))}
                              <span className={`text-[9px] font-bold ml-1 ${done === total ? 'text-emerald-600' : 'text-amber-600'}`}>{done}/{total}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700">{c.clientName}</td>
                    {canViewAll && (
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="flex items-center gap-1.5 text-gray-500 text-xs"><Building2 size={12} />{c.department || '-'}</span>
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.postTaxValue || 0)}</p>
                      {debt > 0 ? (
                        <p className="text-xs font-bold text-rose-500">Nợ: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debt)}</p>
                      ) : (
                        <p className="text-xs text-gray-400">Đã thu đủ</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {canApproveContract ? (
                        <select
                          value={c.status || 'draft'}
                          onChange={(e) => handleQuickStatusChange(c, e.target.value)}
                          className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 border outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 shadow-sm ${
                            c.status === 'draft' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                            c.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            c.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            c.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            'bg-red-100 text-red-700 border-red-200'
                          }`}
                        >
                          <option value="draft" className="text-gray-700 bg-white">Bản nháp</option>
                          <option value="pending" className="text-amber-700 bg-white">Chờ duyệt</option>
                          <option value="in_progress" className="text-blue-700 bg-white">Đang thực hiện</option>
                          <option value="completed" className="text-emerald-700 bg-white">Đã hoàn thành</option>
                          <option value="cancelled" className="text-red-700 bg-white">Đã hủy</option>
                        </select>
                      ) : (
                        getStatusBadge(c.status)
                      )}
                    </td>
                    <td className="py-3.5 px-4 hidden lg:table-cell">
                      <span className="text-gray-500 text-xs">{getUserName(c.createdBy)}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setExportStockContract(c); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xuất kho"><PackageMinus size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setExportInvoiceContract(c); }} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Xuất hóa đơn"><FileText size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Chỉnh sửa"><Pencil size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400">
                  <FileText size={44} className="mx-auto mb-3 opacity-20"/>
                  <p className="font-medium">Chưa có hợp đồng nào</p>
                </td></tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} />
            </div>
          )}
          </>
          );
          })()}

          {activeTab === 'debts' && (() => {
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
              <>
                <table className="w-full text-sm">
                  <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider w-12">STT</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Số hợp đồng</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Chủ đầu tư</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Giá trị (Sau thuế)</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Đã thanh toán</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Công nợ</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Tỷ lệ thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentData.map((c, idx) => {
                  const pTax = c.postTaxValue || 0;
                  const paid = c.paidAmount || 0;
                  const debt = Math.max(0, pTax - paid);
                  const rate = pTax > 0 ? Math.round((paid / pTax) * 100) : 0;
                  return (
                    <tr key={c.id} onClick={() => setPaymentContract(c)} className="hover:bg-emerald-50/50 transition-colors group cursor-pointer">
                      <td className="px-4 py-3 text-gray-500 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{c.contractNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{c.clientName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmtMoney(pTax)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600">{fmtMoney(paid)}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">{fmtMoney(debt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${rate === 100 ? 'bg-emerald-500' : rate >= 50 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${rate}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 w-6 text-right">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-16 text-center text-gray-400">
                    <FileText size={44} className="mx-auto mb-3 opacity-20"/>
                    <p className="font-medium">Chưa có hợp đồng nào</p>
                  </td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-rose-50 border-t-2 border-rose-200">
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-rose-800 text-sm">Tổng cộng (Theo bộ lọc):</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">{fmtMoney(totalPostTax)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">{fmtMoney(totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-black text-rose-600 text-base">{fmtMoney(totalDebt)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} />
              </div>
            )}
            </>
            );
          })()}
          </div>
        </div>
      </div>
      )}

      {/* CREATE / EDIT VIEW */}
      {activeTab === 'create' && (
        <div className="print-area bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <h2 className="text-lg font-bold">{editingContract ? 'Sửa hợp đồng' : 'Thêm hợp đồng mới'}</h2>
            <div className="flex gap-2">
              <button onClick={() => handlePrint()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors text-sm">
                <Printer size={16} /> In báo giá
              </button>
            </div>
          </div>
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
                <input type="radio" name="contractType" value="output" checked={form.contractType === 'output'} onChange={() => setForm({...form, contractType: 'output'})} className="sr-only" />
                📤 HĐ Đầu ra (Bán)
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-bold text-sm transition-all ${form.contractType === 'input' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="contractType" value="input" checked={form.contractType === 'input'} onChange={() => setForm({...form, contractType: 'input'})} className="sr-only" />
                📥 HĐ Đầu vào (Mua)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Số hợp đồng *</label>
                <input 
                  list="contract-number-suggestions"
                  value={form.contractNumber} 
                  onChange={e => setForm({...form, contractNumber: e.target.value})} 
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
                  onChange={e => form.contractType === 'input' ? setForm({...form, supplierName: e.target.value, clientName: e.target.value}) : setForm({...form, clientName: e.target.value})} 
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
                  onChange={e => setForm({...form, contractName: e.target.value})} 
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
                <select value={form.projectId || ''} onChange={e => setForm({...form, projectId: e.target.value})}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="">-- Không thuộc dự án nào --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} - {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Trạng thái *</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
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
              <label className="block text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">Chi tiết sản phẩm / Dịch vụ</label>
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
                      <th className="p-3 font-bold border-b border-gray-200 w-36 text-right">Thành tiền (VNĐ)</th>
                      <th className="p-3 font-bold border-b border-gray-200 w-24 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {form.products.map((p, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-sm text-gray-500 font-medium text-center">{idx + 1}</td>
                        <td className="p-3 text-sm font-bold text-gray-800">{p.name}</td>
                        <td className="p-3 text-sm text-gray-600">{p.unit || '-'}</td>
                        <td className="p-3 text-sm text-gray-600">{p.origin || '-'}</td>
                        <td className="p-3 text-sm font-semibold text-gray-700 text-center">{p.quantity}</td>
                        <td className="p-3 text-sm font-medium text-gray-600 text-right">{p.unitPrice.toLocaleString('vi-VN')}</td>
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
                        <td colSpan={8} className="p-6 text-sm text-gray-400 italic text-center border-b border-gray-100">
                          Chưa có sản phẩm nào. Vui lòng nhập thông tin bên dưới để thêm.
                        </td>
                      </tr>
                    )}
                  </tbody>
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
                  <tbody className="bg-emerald-50/30 border-t-2 border-emerald-200">
                    <tr>
                      <td colSpan={5} className="p-3 text-right text-emerald-800 uppercase text-xs font-bold align-middle">Tổng giá trị (Trước thuế)</td>
                      <td colSpan={2} className="p-2">
                        <input type="text" value={form.preTaxValue ? form.preTaxValue.toLocaleString('vi-VN') : ''} 
                          onChange={e => { const raw = e.target.value.replace(/\D/g, ''); handlePreTaxChange(Number(raw) || 0); }}
                          className="w-full px-3 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-bold text-emerald-700 text-right"/>
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="p-3 text-right text-emerald-800 uppercase text-xs font-bold align-middle">Thuế VAT (%)</td>
                      <td colSpan={2} className="p-2">
                        <input type="number" min="0" max="100" value={form.vatRate} onChange={e => handleVatChange(Number(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 text-sm border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-bold text-emerald-700 text-right"/>
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="p-3 text-right text-emerald-800 uppercase text-xs font-bold align-middle">Tổng cộng (Sau thuế)</td>
                      <td colSpan={2} className="p-2">
                        <input type="text" value={form.postTaxValue ? form.postTaxValue.toLocaleString('vi-VN') : ''} readOnly disabled
                          className="w-full px-3 py-1.5 text-sm border border-transparent rounded-md bg-emerald-200/50 font-extrabold text-emerald-900 text-right cursor-not-allowed"/>
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={8} className="p-3 pt-1 border-t border-emerald-100">
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
                      if (!e.target.checked) setForm({...form, invoiceDate: '', invoiceNumber: ''});
                    }}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"/>
                  Hợp đồng này đã xuất hóa đơn?
                </label>
                
                {hasInvoice && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Ngày xuất hóa đơn</label>
                      <input type="date" value={form.invoiceDate} onChange={e => setForm({...form, invoiceDate: e.target.value})}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Số hóa đơn</label>
                      <input value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})} placeholder="VD: 0001234"
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
                    {form.attachments.map((url, idx) => (
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
                  {CHECKLIST_ITEMS.filter(item => form.documentChecklist[item.key]).length}/{CHECKLIST_ITEMS.length} hoàn thành
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-amber-100 rounded-full h-2 mb-4 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(CHECKLIST_ITEMS.filter(item => form.documentChecklist[item.key]).length / CHECKLIST_ITEMS.length) * 100}%` }}></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CHECKLIST_ITEMS.map(item => (
                  <label key={item.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${form.documentChecklist[item.key] ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'}`}>
                    <input
                      type="checkbox"
                      checked={!!form.documentChecklist[item.key]}
                      onChange={() => setForm(f => ({ ...f, documentChecklist: { ...f.documentChecklist, [item.key]: !f.documentChecklist[item.key] } }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${form.documentChecklist[item.key] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                      {form.documentChecklist[item.key] && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                    <span className={`text-sm font-medium ${form.documentChecklist[item.key] ? 'text-emerald-700' : 'text-gray-600'}`}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <button onClick={() => setActiveTab('output')} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">← Quay lại</button>
            <div className="flex gap-3">
              {editingContract && (
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
              <button onClick={() => setActiveTab('output')} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">Hủy</button>
              <button onClick={handleSave} disabled={!form.contractNumber || !form.clientName || !form.contractName}
                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <Save size={16}/> {editingContract ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} title="Xóa hợp đồng" message="Bạn có chắc muốn xóa hợp đồng này?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} type="danger" confirmText="Xóa" cancelText="Hủy"/>

      <PaymentModal 
        contract={paymentContract} 
        onClose={() => setPaymentContract(null)} 
        onSave={handlePaymentSave} 
      />

      <ExportStockModal 
        contract={exportStockContract}
        onClose={() => setExportStockContract(null)}
        onSave={handleSaveExportStock}
      />

      <ExportInvoiceModal 
        contract={exportInvoiceContract}
        onClose={() => setExportInvoiceContract(null)}
        onSave={handleSaveExportInvoice}
      />

      <PrintableQuote ref={printRef} contract={form} user={user} />
    </div>
  );
};

export default ContractsPage;
