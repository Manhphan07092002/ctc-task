import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/UI';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PlusCircle, Search, FileText, Filter, Download } from 'lucide-react';
import { Contract, ContractProduct, ContractType, DocumentChecklist } from '../../services/contractService';
import { apiFetch } from '../../services/api';
import * as XLSX from 'xlsx-js-style';
import * as productService from '../../services/productService';
import { PaymentModal } from './PaymentModal';
import { useReactToPrint } from 'react-to-print';
import { PrintableQuote } from './PrintableQuote';
import { ExportStockModal } from './ExportStockModal';
import { ExportInvoiceModal } from './ExportInvoiceModal';
import { ContractLinksTab } from './ContractLinksTab';
import { InventoryTab } from './InventoryTab';

// Sub-components
import { ContractMetrics } from './ContractMetrics';
import { ContractTable } from './ContractTable';
import { ContractDebtTable } from './ContractDebtTable';
import { ContractForm } from './ContractForm';

const ContractsPage: React.FC = () => {
  const { user } = useAuth();
  const { contracts, clients, users, departments, tasks, projects, saveContract, deleteContract } = useData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDebt, setFilterDebt] = useState('all');
  const [debtType, setDebtType] = useState<'output' | 'input'>('output');
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'debts' | 'links' | 'inventory' | 'create'>('output');
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [paymentContract, setPaymentContract] = useState<Contract | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '', vatRate: '8' });
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(null);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [exportStockContract, setExportStockContract] = useState<Contract | null>(null);
  const [exportInvoiceContract, setExportInvoiceContract] = useState<Contract | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [readOnlyContract, setReadOnlyContract] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterDebt, debtType, activeTab]);

  // Form state
  const [form, setForm] = useState<{ contractNumber: string, clientName: string, contractName: string, preTaxValue: number, vatRate: number, postTaxValue: number, invoiceDate: string, invoiceNumber: string, products: ContractProduct[], status: string, attachments: string[], paidAmount: number, projectId: string, contractType: ContractType, supplierName: string, documentChecklist: DocumentChecklist, linkedInputContractIds?: string[] }>({ contractNumber: '', clientName: '', contractName: '', preTaxValue: 0, vatRate: 10, postTaxValue: 0, invoiceDate: '', invoiceNumber: '', products: [], status: 'draft', attachments: [], paidAmount: 0, projectId: '', contractType: 'output', supplierName: '', documentChecklist: {} });
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
  const canEditContract = (c: Contract) => c.createdBy === user?.id || user?.role === 'Manager' || perms.includes('admin_panel') || perms.includes('director_feedback');

  const filtered = useMemo(() => {
    let list = contracts;

    if (activeTab === 'output' || activeTab === 'create') {
      list = list.filter(c => (c.contractType || 'output') === (activeTab === 'create' ? form.contractType : 'output'));
      if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus);
    } else if (activeTab === 'input') {
      list = list.filter(c => c.contractType === 'input');
      if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus);
    } else if (activeTab === 'debts') {
      list = list.filter(c => (c.contractType || 'output') === debtType);
      
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
  }, [contracts, search, filterStatus, filterDebt, debtType, activeTab, form.contractType, canViewAll, userDept]);

  const totalPostTax = useMemo(() => filtered.reduce((s, c) => s + (c.postTaxValue || 0), 0), [filtered]);
  const totalPaid = useMemo(() => filtered.reduce((s, c) => s + (c.paidAmount || 0), 0), [filtered]);
  const totalDebt = Math.max(0, totalPostTax - totalPaid);
  const collectionRate = totalPostTax > 0 ? Math.round((totalPaid / totalPostTax) * 100) : 0;

  const openCreate = (type?: ContractType) => {
    setEditingContract(null);
    const ct = type || (activeTab === 'input' ? 'input' : 'output');
    setForm({ contractNumber: '', clientName: '', contractName: '', preTaxValue: 0, vatRate: 10, postTaxValue: 0, invoiceDate: '', invoiceNumber: '', products: [], status: 'draft', attachments: [], paidAmount: 0, projectId: '', contractType: ct, supplierName: '', documentChecklist: {}, linkedInputContractIds: [] });
    setNewProduct({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '', vatRate: '8' });
    setEditingProductIdx(null);
    setHasInvoice(false);
    setReadOnlyContract(false);
    setActiveTab('create');
  };

  const openEdit = (c: Contract, readOnly = false) => {
    setEditingContract(c);
    setForm({ contractNumber: c.contractNumber, clientName: c.clientName, contractName: c.contractName, preTaxValue: c.preTaxValue, vatRate: c.vatRate || 10, postTaxValue: c.postTaxValue || 0, invoiceDate: c.invoiceDate || '', invoiceNumber: c.invoiceNumber || '', products: c.products || [], status: c.status || 'draft', attachments: c.attachments || [], paidAmount: c.paidAmount || 0, projectId: c.projectId || '', contractType: c.contractType || 'output', supplierName: c.supplierName || '', documentChecklist: c.documentChecklist || {}, linkedInputContractIds: [] });
    setNewProduct({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '', vatRate: '8' });
    setEditingProductIdx(null);
    setHasInvoice(!!c.invoiceDate || !!c.invoiceNumber);
    setReadOnlyContract(readOnly);
    setActiveTab('create');
  };

  const handleEditProduct = (idx: number) => {
    const p = form.products[idx];
    setNewProduct({ name: p.name, unit: p.unit || '', quantity: String(p.quantity), origin: p.origin || '', unitPrice: String(p.unitPrice), vatRate: String(p.vatRate ?? 8) });
    setEditingProductIdx(idx);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.unitPrice) return;
    const unitPrice = Number(newProduct.unitPrice.replace(/\D/g, '')) || 0;
    const qty = Number(newProduct.quantity) || 1;
    const total = unitPrice * qty;
    const vatRate = Number(newProduct.vatRate) || 0;
    
    setForm(f => {
      const newList = [...f.products];
      if (editingProductIdx !== null) {
        const oldTotal = newList[editingProductIdx].total;
        newList[editingProductIdx] = { ...newList[editingProductIdx], name: newProduct.name, unit: newProduct.unit, quantity: qty, origin: newProduct.origin, unitPrice, total, vatRate };
        const newPreTax = f.preTaxValue - oldTotal + total;
        const totalTax = newList.reduce((sum, p) => sum + (p.total * (p.vatRate ?? 8) / 100), 0);
        return { ...f, products: newList, preTaxValue: newPreTax, postTaxValue: newPreTax + totalTax };
      } else {
        const newPreTax = f.preTaxValue + total;
        const updatedList = [...newList, { name: newProduct.name, unit: newProduct.unit, quantity: qty, origin: newProduct.origin, unitPrice, total, vatRate }];
        const totalTax = updatedList.reduce((sum, p) => sum + (p.total * (p.vatRate ?? 8) / 100), 0);
        return { ...f, products: updatedList, preTaxValue: newPreTax, postTaxValue: newPreTax + totalTax };
      }
    });
    setNewProduct({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '', vatRate: '8' });
    setEditingProductIdx(null);
  };

  const handleRemoveProduct = (idx: number) => {
    setForm(f => {
      const list = [...f.products];
      const p = list[idx];
      list.splice(idx, 1);
      const newPreTax = Math.max(0, f.preTaxValue - p.total);
      const totalTax = list.reduce((sum, p) => sum + (p.total * (p.vatRate ?? 8) / 100), 0);
      return { ...f, products: list, preTaxValue: newPreTax, postTaxValue: newPreTax + totalTax };
    });
  };

  const handleVatChange = (rate: number) => {
    // Only used if they change the contract-level vat (legacy support)
    setForm(f => ({ ...f, vatRate: rate, postTaxValue: f.preTaxValue + (f.preTaxValue * rate / 100) }));
  };

  const handlePreTaxChange = (val: number) => {
    setForm(f => {
      const totalTax = f.products.reduce((sum, p) => sum + (p.total * (p.vatRate ?? 8) / 100), 0);
      return { ...f, preTaxValue: val, postTaxValue: val + totalTax };
    });
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
          <Button variant={activeTab === 'output' ? 'primary' : 'secondary'} onClick={() => setActiveTab('output')} size="sm">📤 HĐ Bán</Button>
          <Button variant={activeTab === 'input' ? 'primary' : 'secondary'} onClick={() => setActiveTab('input')} size="sm">📥 HĐ Mua</Button>
          <Button variant={activeTab === 'links' ? 'primary' : 'secondary'} onClick={() => setActiveTab('links')} size="sm">🔗 Liên kết</Button>
          <Button variant={activeTab === 'inventory' ? 'primary' : 'secondary'} onClick={() => setActiveTab('inventory')} size="sm">📦 Hàng phân bổ</Button>
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

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <InventoryTab contracts={contracts} products={catalogProducts} />
      )}

      {activeTab !== 'create' && activeTab !== 'links' && activeTab !== 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <ContractMetrics 
            filtered={filtered}
            contracts={contracts}
            activeTab={activeTab}
            totalPostTax={totalPostTax}
            totalPaid={totalPaid}
            totalDebt={totalDebt}
            collectionRate={collectionRate}
            isInput={activeTab === 'input' || (activeTab === 'debts' && debtType === 'input')}
          />

          {/* List & Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4 bg-gray-50/50">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Tìm theo số HĐ, tên khách hàng..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                />
              </div>
              
              <div className="flex gap-2">
                {activeTab === 'debts' ? (
                  <>
                    <div className="flex bg-white border border-gray-200 p-0.5 rounded-xl shadow-sm">
                      <button 
                        onClick={() => setDebtType('output')} 
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${debtType === 'output' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Phải thu (Bán)
                      </button>
                      <button 
                        onClick={() => setDebtType('input')} 
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${debtType === 'input' ? 'bg-rose-50 text-rose-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Phải trả (Mua)
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter size={16} className="text-gray-400"/>
                      <select value={filterDebt} onChange={e => setFilterDebt(e.target.value)} className="bg-white border border-gray-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-600">
                        <option value="all">Tất cả công nợ</option>
                        <option value="unpaid">Chưa thanh toán</option>
                        <option value="partial">Thanh toán một phần</option>
                        <option value="paid">Đã thanh toán đủ</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400"/>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-gray-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-600">
                      <option value="all">Tất cả trạng thái</option>
                      <option value="draft">Bản nháp</option>
                      <option value="pending">Chờ duyệt</option>
                      <option value="in_progress">Đang thực hiện</option>
                      <option value="completed">Đã hoàn thành</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'debts' ? (
                <ContractDebtTable 
                  filtered={filtered}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  totalPostTax={totalPostTax}
                  totalPaid={totalPaid}
                  totalDebt={totalDebt}
                  onPayment={(c) => setPaymentContract(c)}
                />
              ) : (
                <ContractTable 
                  filtered={filtered}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  canViewAll={canViewAll}
                  canApproveContract={canApproveContract}
                  canEditContract={canEditContract}
                  getUserName={getUserName}
                  onEdit={openEdit}
                  onDelete={(id) => setDeleteId(id)}
                  onQuickStatusChange={handleQuickStatusChange}
                  onExportStock={(c) => setExportStockContract(c)}
                  onExportInvoice={(c) => setExportInvoiceContract(c)}
                  onPayment={(c) => setPaymentContract(c)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <ContractForm 
          form={form}
          setForm={setForm}
          editingContract={editingContract}
          tasks={tasks}
          contracts={contracts}
          clients={clients}
          projects={projects}
          catalogProducts={catalogProducts}
          canApproveContract={canApproveContract}
          newProduct={newProduct}
          setNewProduct={setNewProduct}
          editingProductIdx={editingProductIdx}
          setEditingProductIdx={setEditingProductIdx}
          hasInvoice={hasInvoice}
          setHasInvoice={setHasInvoice}
          uploading={uploading}
          handleFileUpload={handleFileUpload}
          removeAttachment={removeAttachment}
          handlePreTaxChange={handlePreTaxChange}
          handleVatChange={handleVatChange}
          handleEditProduct={handleEditProduct}
          handleRemoveProduct={handleRemoveProduct}
          handleAddProduct={handleAddProduct}
          handlePrint={handlePrint}
          handleSave={handleSave}
          setActiveTab={setActiveTab}
          readOnly={readOnlyContract}
        />
      )}

      <ConfirmDialog isOpen={!!deleteId} title="Xóa hợp đồng" message="Bạn có chắc muốn xóa hợp đồng này?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} type="danger" confirmText="Xóa" cancelText="Hủy"/>

      <PaymentModal contract={paymentContract} onClose={() => setPaymentContract(null)} onSave={handlePaymentSave} />
      <ExportStockModal contract={exportStockContract} onClose={() => setExportStockContract(null)} onSave={handleSaveExportStock} />
      <ExportInvoiceModal contract={exportInvoiceContract} onClose={() => setExportInvoiceContract(null)} onSave={handleSaveExportInvoice} />

      <PrintableQuote ref={printRef} contract={form} user={user} />
    </div>
  );
};

export default ContractsPage;
