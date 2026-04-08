
import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { NOTE_COLORS } from '../constants';
import { X, Palette, Trash2 } from 'lucide-react';
import { Button } from './UI';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Note) => void;
  onDelete?: (id: string) => void;
  initialNote?: Note | null;
}

export const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose, onSave, onDelete, initialNote }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].bg);

  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setTitle(initialNote.title);
        setContent(initialNote.content);
        setSelectedColor(initialNote.color);
      } else {
        setTitle('');
        setContent('');
        setSelectedColor(NOTE_COLORS[0].bg);
      }
    }
  }, [isOpen, initialNote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const note: Note = {
      id: initialNote ? initialNote.id : Math.random().toString(36).substr(2, 9),
      title,
      content,
      color: selectedColor,
      createdAt: initialNote ? initialNote.createdAt : new Date().toISOString(),
    };
    onSave(note);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className={`rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 ${selectedColor} transition-colors`}>
        <div className="flex justify-between items-center p-4 border-b border-black/5">
          <h3 className="text-lg font-bold text-gray-800">
            {initialNote ? 'Edit Note' : 'New Note'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <input 
            type="text" 
            placeholder="Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-0 py-2 text-lg font-bold bg-transparent border-none focus:ring-0 placeholder-gray-500 text-gray-900"
          />
          
          <textarea 
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-0 py-2 bg-transparent border-none focus:ring-0 resize-none placeholder-gray-500 text-gray-800 leading-relaxed scrollbar-hide"
          />

          {/* Color Picker */}
          <div className="flex items-center gap-2 pt-2">
            <Palette size={16} className="text-gray-500" />
            <div className="flex gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.bg)}
                  className={`w-6 h-6 rounded-full border ${color.border} ${color.bg} ${
                    selectedColor === color.bg ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 mt-2 border-t border-black/5">
            {initialNote && onDelete ? (
               <button 
                type="button"
                onClick={() => { onDelete(initialNote.id); onClose(); }}
                className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50"
               >
                 <Trash2 size={18} />
               </button>
            ) : <div></div>}
            
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onClose} className="!bg-white/50">Cancel</Button>
              <Button type="submit" variant="primary">Save Note</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
