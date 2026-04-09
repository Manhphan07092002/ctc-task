import React from 'react';
import { Button } from '../../components/UI';
import { PlusCircle } from 'lucide-react';
import { Note } from '../../types';

interface NotesPageProps {
  t: (key: string) => string;
  filteredNotes: Note[];
  openCreateNoteModal: () => void;
  openEditNoteModal: (note: Note) => void;
}

export default function NotesPage({
  t, filteredNotes, openCreateNoteModal, openEditNoteModal
}: NotesPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">{t('notes')}</h2>
        <Button onClick={openCreateNoteModal}><PlusCircle size={18} className="mr-2" /> {t('addNote')}</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredNotes.map(note => (
          <div key={note.id} onClick={() => openEditNoteModal(note)} className={`\${note.color} p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer relative group border border-black/5 flex flex-col h-64`}>
            <h3 className="font-bold text-gray-900 text-lg mb-3 pr-6 line-clamp-1">{note.title || 'Untitled'}</h3>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-grow overflow-hidden mask-image-b">{note.content}</p>
            <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center text-xs text-gray-500">
              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        <button onClick={openCreateNoteModal} className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-300 hover:bg-brand-50 transition-all h-64">
          <PlusCircle size={40} className="mb-2 opacity-50" />
          <span className="font-medium">{t('createNote')}</span>
        </button>
      </div>
    </div>
  );
}
