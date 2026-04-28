import React, { useState, useMemo } from 'react';
import { Note } from '../../types';
import {
  PlusCircle, Search, StickyNote, Pin, Clock,
  MoreVertical, Edit3, Trash2, Grid3X3, List
} from 'lucide-react';

interface NotesPageProps {
  t: (key: string) => string;
  filteredNotes: Note[];
  openCreateNoteModal: () => void;
  openEditNoteModal: (note: Note) => void;
}

// Map bg color class → richer card style tokens
const COLOR_MAP: Record<string, {
  card: string; title: string; text: string; meta: string; border: string; dot: string;
}> = {
  'bg-yellow-100': { card: 'bg-gradient-to-br from-yellow-50 to-amber-50',   title: 'text-amber-900',  text: 'text-amber-800/80',  meta: 'text-amber-600/70',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  'bg-blue-100':   { card: 'bg-gradient-to-br from-blue-50 to-sky-50',       title: 'text-blue-900',   text: 'text-blue-800/80',   meta: 'text-blue-600/70',   border: 'border-blue-200',   dot: 'bg-blue-400' },
  'bg-green-100':  { card: 'bg-gradient-to-br from-green-50 to-emerald-50',  title: 'text-green-900',  text: 'text-green-800/80',  meta: 'text-green-600/70',  border: 'border-green-200',  dot: 'bg-green-400' },
  'bg-pink-100':   { card: 'bg-gradient-to-br from-pink-50 to-rose-50',      title: 'text-pink-900',   text: 'text-pink-800/80',   meta: 'text-pink-600/70',   border: 'border-pink-200',   dot: 'bg-pink-400' },
  'bg-purple-100': { card: 'bg-gradient-to-br from-purple-50 to-violet-50',  title: 'text-purple-900', text: 'text-purple-800/80', meta: 'text-purple-600/70', border: 'border-purple-200', dot: 'bg-purple-400' },
  'bg-orange-100': { card: 'bg-gradient-to-br from-orange-50 to-amber-50',   title: 'text-orange-900', text: 'text-orange-800/80', meta: 'text-orange-600/70', border: 'border-orange-200', dot: 'bg-orange-400' },
  'bg-white':      { card: 'bg-white',                                        title: 'text-gray-900',   text: 'text-gray-600',      meta: 'text-gray-400',      border: 'border-gray-200',   dot: 'bg-gray-400' },
};

const DEFAULT_STYLE = COLOR_MAP['bg-white'];

const getStyle = (colorClass: string) => COLOR_MAP[colorClass] ?? DEFAULT_STYLE;

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
};

const getWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export default function NotesPage({
  t, filteredNotes, openCreateNoteModal, openEditNoteModal
}: NotesPageProps) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const displayed = useMemo(() => {
    if (!search.trim()) return filteredNotes;
    const q = search.toLowerCase();
    return filteredNotes.filter(n =>
      n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
    );
  }, [filteredNotes, search]);

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-300">

      {/* ===== Header ===== */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <StickyNote size={22} className="text-brand-500" />
            Ghi chú
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">{filteredNotes.length} ghi chú</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm ghi chú..."
              className="pl-8 pr-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-400 rounded-xl border border-transparent focus:border-brand-300 outline-none transition-all w-52"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
            ><Grid3X3 size={15}/></button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
            ><List size={15}/></button>
          </div>
          {/* Add button */}
          <button
            onClick={openCreateNoteModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-brand-200 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <PlusCircle size={16}/> Thêm ghi chú
          </button>
        </div>
      </div>

      {/* ===== Empty state ===== */}
      {displayed.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-5 shadow-inner">
            <StickyNote size={36} className="text-amber-400" strokeWidth={1.5}/>
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">
            {search ? 'Không tìm thấy ghi chú nào' : 'Chưa có ghi chú nào'}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {search ? 'Thử tìm kiếm với từ khóa khác' : 'Bắt đầu ghi lại ý tưởng, công việc của bạn'}
          </p>
          {!search && (
            <button
              onClick={openCreateNoteModal}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              + Tạo ghi chú đầu tiên
            </button>
          )}
        </div>
      )}

      {/* ===== GRID view ===== */}
      {displayed.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map(note => {
            const s = getStyle(note.color);
            return (
              <div
                key={note.id}
                onClick={() => openEditNoteModal(note)}
                className={`group relative flex flex-col h-56 rounded-2xl border p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${s.card} ${s.border}`}
              >
                {/* Color dot */}
                <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${s.dot} opacity-70`}/>

                {/* Title */}
                <h3 className={`font-bold text-[15px] line-clamp-1 mb-2 pr-4 ${s.title}`}>
                  {note.title || 'Untitled'}
                </h3>

                {/* Content preview */}
                <p className={`text-xs leading-relaxed line-clamp-5 flex-1 ${s.text}`}>
                  {note.content || <span className="italic opacity-50">Trống...</span>}
                </p>

                {/* Footer */}
                <div className={`flex items-center justify-between mt-3 pt-3 border-t border-black/5 text-[10px] font-medium ${s.meta}`}>
                  <span className="flex items-center gap-1">
                    <Clock size={10}/> {formatDate(note.createdAt)}
                  </span>
                  <span>{getWordCount(note.content || '')} từ</span>
                </div>

                {/* Hover overlay edit hint */}
                <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/[0.02] transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-semibold text-gray-600 pointer-events-none">
                    <Edit3 size={11}/> Chỉnh sửa
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add card */}
          <button
            onClick={openCreateNoteModal}
            className="h-56 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-300 hover:text-brand-400 hover:border-brand-300 hover:bg-brand-50/30 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle size={20}/>
            </div>
            <span className="text-xs font-semibold">Tạo ghi chú mới</span>
          </button>
        </div>
      )}

      {/* ===== LIST view ===== */}
      {displayed.length > 0 && viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {displayed.map(note => {
            const s = getStyle(note.color);
            return (
              <div
                key={note.id}
                onClick={() => openEditNoteModal(note)}
                className={`group flex items-center gap-4 px-5 py-3.5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${s.card} ${s.border}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`}/>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${s.title}`}>{note.title || 'Untitled'}</p>
                  <p className={`text-xs truncate mt-0.5 ${s.text}`}>{note.content || '...'}</p>
                </div>
                <div className={`flex items-center gap-1 text-[10px] flex-shrink-0 ${s.meta}`}>
                  <Clock size={9}/> {formatDate(note.createdAt)}
                </div>
                <Edit3 size={14} className="opacity-0 group-hover:opacity-40 flex-shrink-0 text-gray-600 transition-opacity"/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
