import React, { useState, useEffect, useMemo } from 'react';
import { Link2, Plus, Trash2, X, ArrowRight, Package, Search, AlertCircle, Pencil } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { ContractLink, getContractLinks, createContractLink, deleteContractLink } from '../../services/contractLinkService';
import { Button, Card } from '../../components/UI';

interface Props {
  contracts: Contract[];
}

const fmtMoney = (v: number) => (v / 1000000).toFixed(1) + 'tr';

const LINK_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'procurement', label: 'Mua hàng cho HĐ', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'subcontract', label: 'Thuê ngoài / Thầu phụ', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'related', label: 'Liên quan khác', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export const ContractLinksTab: React.FC<Props> = ({ contracts }) => {
  const [links, setLinks] = useState<ContractLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState('');
  const [selectedInput, setSelectedInput] = useState('');
  const [linkType, setLinkType] = useState('procurement');
  const [linkDesc, setLinkDesc] = useState('');
  const [searchOut, setSearchOut] = useState('');
  const [searchIn, setSearchIn] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const outputContracts = useMemo(() => contracts.filter(c => (c.contractType || 'output') === 'output'), [contracts]);
  const inputContracts = useMemo(() => contracts.filter(c => c.contractType === 'input'), [contracts]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const data = await getContractLinks();
      setLinks(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLinks(); }, []);

  const getContract = (id: string) => contracts.find(c => c.id === id);

  const handleCreate = async () => {
    if (!selectedOutput || !selectedInput) return;
    try {
      await createContractLink({ outputContractId: selectedOutput, inputContractId: selectedInput, linkType, description: linkDesc || undefined });
      await loadLinks();
      setShowModal(false);
      setSelectedOutput(''); setSelectedInput(''); setLinkDesc(''); setLinkType('procurement');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi tạo liên kết!');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa liên kết này?')) return;
    await deleteContractLink(id);
    await loadLinks();
  };

  const openEdit = (link: ContractLink) => {
    setEditingLinkId(link.id);
    setLinkType(link.linkType || 'procurement');
    setLinkDesc(link.description || '');
  };

  const handleUpdate = async () => {
    if (!editingLinkId) return;
    try {
      await import('../../services/contractLinkService').then(m => m.updateContractLink(editingLinkId, { linkType, description: linkDesc || undefined }));
      await loadLinks();
      setEditingLinkId(null);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi cập nhật liên kết!');
    }
  };

  // Build relationship map for visualization
  const relationshipMap = useMemo(() => {
    const map = new Map<string, { outputs: Set<string>; inputs: Set<string> }>();
    links.forEach(l => {
      if (!map.has(l.outputContractId)) map.set(l.outputContractId, { outputs: new Set(), inputs: new Set() });
      if (!map.has(l.inputContractId)) map.set(l.inputContractId, { outputs: new Set(), inputs: new Set() });
      map.get(l.outputContractId)!.inputs.add(l.inputContractId);
      map.get(l.inputContractId)!.outputs.add(l.outputContractId);
    });
    return map;
  }, [links]);

  // Group links by output contract for better visualization
  const groupedByOutput = useMemo(() => {
    const groups = new Map<string, ContractLink[]>();
    links.forEach(l => {
      if (!groups.has(l.outputContractId)) groups.set(l.outputContractId, []);
      groups.get(l.outputContractId)!.push(l);
    });
    return groups;
  }, [links]);

  // Stats
  const stats = useMemo(() => {
    const linkedOutputIds = new Set(links.map(l => l.outputContractId));
    const linkedInputIds = new Set(links.map(l => l.inputContractId));
    const oneToOne = [...linkedOutputIds].filter(id => {
      const outLinks = links.filter(l => l.outputContractId === id);
      return outLinks.length === 1 && links.filter(l => l.inputContractId === outLinks[0].inputContractId).length === 1;
    }).length;
    const oneToN = [...linkedOutputIds].filter(id => links.filter(l => l.outputContractId === id).length > 1).length;
    const nToOne = [...linkedInputIds].filter(id => links.filter(l => l.inputContractId === id).length > 1).length;
    
    const totalOutputLinked = outputContracts.reduce((s, c) => s + (linkedOutputIds.has(c.id) ? (c.postTaxValue || 0) : 0), 0);
    const totalInputLinked = inputContracts.reduce((s, c) => s + (linkedInputIds.has(c.id) ? (c.postTaxValue || 0) : 0), 0);
    
    return { linkedOutputIds, linkedInputIds, oneToOne, oneToN, nToOne, totalOutputLinked, totalInputLinked, profit: totalOutputLinked - totalInputLinked };
  }, [links, outputContracts, inputContracts]);

  const getLinkTypeBadge = (type: string) => {
    const t = LINK_TYPES.find(lt => lt.value === type) || LINK_TYPES[2];
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.color}`}>{t.label}</span>;
  };

  const filteredOutputs = outputContracts.filter(c => 
    !searchOut || c.contractNumber.toLowerCase().includes(searchOut.toLowerCase()) || c.clientName.toLowerCase().includes(searchOut.toLowerCase())
  );
  const filteredInputs = inputContracts.filter(c => 
    !searchIn || c.contractNumber.toLowerCase().includes(searchIn.toLowerCase()) || (c.supplierName || c.clientName).toLowerCase().includes(searchIn.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Liên kết</p>
          <p className="text-2xl font-black text-gray-900">{links.length}</p>
          <p className="text-[11px] text-gray-400 mt-1">{stats.linkedOutputIds.size} HĐ ra ↔ {stats.linkedInputIds.size} HĐ vào</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kiểu quan hệ</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {stats.oneToOne > 0 && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">1:1 ({stats.oneToOne})</span>}
            {stats.oneToN > 0 && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">1:N ({stats.oneToN})</span>}
            {stats.nToOne > 0 && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">N:1 ({stats.nToOne})</span>}
            {links.length === 0 && <span className="text-xs text-gray-400">Chưa có</span>}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Doanh thu liên kết</p>
          <p className="text-lg font-black text-emerald-600">{fmtMoney(stats.totalOutputLinked)}</p>
          <p className="text-[11px] text-gray-400">Chi phí: <span className="text-rose-600 font-bold">{fmtMoney(stats.totalInputLinked)}</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lợi nhuận liên kết</p>
          <p className={`text-lg font-black ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(stats.profit)}</p>
          <p className="text-[11px] text-gray-400">{stats.totalOutputLinked > 0 ? Math.round((stats.profit / stats.totalOutputLinked) * 100) : 0}% margin</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
          <Link2 size={16} className="text-brand-500" /> Sơ đồ liên kết HĐ
        </h3>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="gap-1">
          <Plus size={14} /> Tạo liên kết
        </Button>
      </div>

      {/* Visual Relationship Diagram */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : links.length === 0 ? (
        <Card className="p-12 text-center">
          <Link2 size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="font-bold text-gray-600 mb-2">Chưa có liên kết nào</p>
          <p className="text-sm text-gray-400 mb-4">Tạo liên kết để trực quan hóa mối quan hệ giữa HĐ mua & HĐ bán</p>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="gap-1 mx-auto">
            <Plus size={14} /> Tạo liên kết đầu tiên
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {[...groupedByOutput.entries()].map(([outputId, groupLinks]) => {
            const outContract = getContract(outputId);
            if (!outContract) return null;
            const outRelCount = groupLinks.length;
            
            return (
              <Card key={outputId} className="p-0 overflow-hidden">
                {/* Output contract header */}
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/30 px-5 py-4 border-b border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                        <span className="text-xs font-black">📤</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{outContract.contractNumber}</p>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">BÁN</span>
                          {outRelCount > 1 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">1:{outRelCount}</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{outContract.clientName} • <span className="font-bold text-emerald-600">{fmtMoney(outContract.postTaxValue || 0)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked input contracts */}
                <div className="divide-y divide-gray-50">
                  {groupLinks.map(link => {
                    const inContract = getContract(link.inputContractId);
                    if (!inContract) return null;
                    const inRelCount = links.filter(l => l.inputContractId === link.inputContractId).length;

                    return (
                      <div key={link.id} className="flex items-center gap-0 hover:bg-gray-50/80 transition-colors group">
                        {/* Connection line */}
                        <div className="w-16 flex-shrink-0 flex items-center justify-center relative">
                          <div className="w-full h-px bg-gradient-to-r from-emerald-300 via-blue-300 to-blue-400"></div>
                          <ArrowRight size={14} className="absolute text-blue-400 right-0" />
                        </div>

                        {/* Input contract card */}
                        <div className="flex-1 py-3 pr-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <span className="text-xs font-black">📥</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-700 text-sm">{inContract.contractNumber}</p>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200">MUA</span>
                                  {inRelCount > 1 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200">{inRelCount}:1</span>}
                                  {getLinkTypeBadge(link.linkType)}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {inContract.supplierName || inContract.clientName} • <span className="font-bold text-rose-500">{fmtMoney(inContract.postTaxValue || 0)}</span>
                                  {link.description && <span className="ml-2 italic text-gray-400">— {link.description}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(link)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Sửa liên kết">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDelete(link.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa liên kết">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Profit summary for this output */}
                {(() => {
                  const totalInput = groupLinks.reduce((s, l) => {
                    const c = getContract(l.inputContractId);
                    return s + (c?.postTaxValue || 0);
                  }, 0);
                  const profit = (outContract.postTaxValue || 0) - totalInput;
                  return (
                    <div className={`px-5 py-2.5 text-xs font-bold flex items-center justify-between border-t ${profit >= 0 ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' : 'bg-rose-50/50 text-rose-700 border-rose-100'}`}>
                      <span>Lợi nhuận HĐ: {fmtMoney(profit)} ({(outContract.postTaxValue || 0) > 0 ? Math.round((profit / (outContract.postTaxValue || 1)) * 100) : 0}%)</span>
                      <span className="text-gray-400 font-medium">Doanh thu {fmtMoney(outContract.postTaxValue || 0)} − Chi phí {fmtMoney(totalInput)}</span>
                    </div>
                  );
                })()}
              </Card>
            );
          })}

          {/* Unlinked contracts */}
          {(() => {
            const unlinkedOutputs = outputContracts.filter(c => !stats.linkedOutputIds.has(c.id));
            const unlinkedInputs = inputContracts.filter(c => !stats.linkedInputIds.has(c.id));
            if (unlinkedOutputs.length === 0 && unlinkedInputs.length === 0) return null;
            return (
              <Card className="p-5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertCircle size={14} /> HĐ chưa liên kết ({unlinkedOutputs.length + unlinkedInputs.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {unlinkedOutputs.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100 text-sm">
                      <span className="text-xs">📤</span>
                      <span className="font-bold text-gray-700 truncate flex-1">{c.contractNumber}</span>
                      <span className="text-emerald-600 font-bold text-xs">{fmtMoney(c.postTaxValue || 0)}</span>
                    </div>
                  ))}
                  {unlinkedInputs.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 rounded-lg border border-blue-100 text-sm">
                      <span className="text-xs">📥</span>
                      <span className="font-bold text-gray-700 truncate flex-1">{c.contractNumber}</span>
                      <span className="text-rose-500 font-bold text-xs">{fmtMoney(c.postTaxValue || 0)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Create Link Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><Link2 size={20} /> Tạo liên kết HĐ</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Output Contract Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">📤 Hợp đồng Bán</label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={searchOut} onChange={e => setSearchOut(e.target.value)} placeholder="Tìm số HĐ, khách hàng..." className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
                  {filteredOutputs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Không có HĐ Bán</p>
                  ) : filteredOutputs.map(c => (
                    <button key={c.id} onClick={() => setSelectedOutput(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${selectedOutput === c.id ? 'bg-emerald-100 border-2 border-emerald-300 font-bold' : 'hover:bg-gray-50 border border-transparent'}`}>
                      <span className="truncate"><span className="font-bold">{c.contractNumber}</span> — {c.clientName}</span>
                      <span className="text-emerald-600 font-bold text-xs flex-shrink-0 ml-2">{fmtMoney(c.postTaxValue || 0)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <div className="h-px flex-1 bg-gradient-to-r from-emerald-200 to-blue-200"></div>
                <ArrowRight size={20} className="text-blue-400" />
                <div className="h-px flex-1 bg-blue-200"></div>
              </div>

              {/* Input Contract Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">📥 Hợp đồng Mua</label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={searchIn} onChange={e => setSearchIn(e.target.value)} placeholder="Tìm số HĐ, nhà cung cấp..." className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
                  {filteredInputs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Không có HĐ Mua. Hãy tạo HĐ Mua trước.</p>
                  ) : filteredInputs.map(c => (
                    <button key={c.id} onClick={() => setSelectedInput(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${selectedInput === c.id ? 'bg-blue-100 border-2 border-blue-300 font-bold' : 'hover:bg-gray-50 border border-transparent'}`}>
                      <span className="truncate"><span className="font-bold">{c.contractNumber}</span> — {c.supplierName || c.clientName}</span>
                      <span className="text-rose-500 font-bold text-xs flex-shrink-0 ml-2">{fmtMoney(c.postTaxValue || 0)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Link type & description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Loại liên kết</label>
                  <select value={linkType} onChange={e => setLinkType(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium">
                    {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Ghi chú (tùy chọn)</label>
                  <input value={linkDesc} onChange={e => setLinkDesc(e.target.value)} placeholder="VD: Mua thiết bị switch cho HĐ..." className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Hủy</button>
              <button onClick={handleCreate} disabled={!selectedOutput || !selectedInput}
                className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <Link2 size={14} /> Tạo liên kết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Link Modal */}
      {editingLinkId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingLinkId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2"><Pencil size={20} /> Cập nhật liên kết</h2>
              <button onClick={() => setEditingLinkId(null)} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Loại liên kết</label>
                  <select value={linkType} onChange={e => setLinkType(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium">
                    {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Ghi chú (tùy chọn)</label>
                  <input value={linkDesc} onChange={e => setLinkDesc(e.target.value)} placeholder="VD: Mua thiết bị switch cho HĐ..." className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditingLinkId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Hủy</button>
              <button onClick={handleUpdate}
                className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
                <Pencil size={14} /> Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
