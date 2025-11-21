import React, { useState } from 'react';
import {
  Lightbulb,
  HelpCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import RichTextNote from './RichTextNote';
import { generateId } from '../utils/idGenerator';

// --- Component: Memory View ---
const MemoryView = ({ memoryData, onUpdate, searchQuery }) => {
  const { notes, qas } = memoryData;

  const handleAddNote = () => {
    const newNote = { id: generateId(), text: 'New Note...' };
    onUpdate({ ...memoryData, notes: [...notes, newNote] });
  };

  const handleUpdateNote = (id, newText) => {
    const updatedNotes = notes.map(note => note.id === id ? { ...note, text: newText } : note);
    onUpdate({ ...memoryData, notes: updatedNotes });
  };

  const handleDeleteNote = (id) => {
    onUpdate({ ...memoryData, notes: notes.filter(note => note.id !== id) });
  };

  const handleAddQA = () => {
    const newQA = { id: generateId(), question: 'New Question?', answer: 'Answer...' };
    onUpdate({ ...memoryData, qas: [...qas, newQA] });
  };

  const handleUpdateQA = (id, field, value) => {
    const updatedQAs = qas.map(qa => qa.id === id ? { ...qa, [field]: value } : qa);
    onUpdate({ ...memoryData, qas: updatedQAs });
  };

  const handleDeleteQA = (id) => {
    onUpdate({ ...memoryData, qas: qas.filter(qa => qa.id !== id) });
  };

  const EditableField = ({ value, onChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(value);

    const handleBlur = () => {
      setIsEditing(false);
      onChange(text);
    };

    if (isEditing) {
      return (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      );
    }
    return <div onClick={() => setIsEditing(true)} className="w-full p-2 cursor-text whitespace-pre-wrap">{value}</div>;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-300 space-y-12">
      {/* Notes Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2"><Lightbulb /> Notes</h2>
          <button onClick={handleAddNote} className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"><Plus size={16} /> Add Note</button>
        </div>
        <div className="space-y-4">
          {notes.map(note => (
            <RichTextNote 
              key={note.id} 
              note={note} 
              onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
          ))}
        </div>
      </div>

      {/* Q&A Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2"><HelpCircle /> Q & A</h2>
          <button onClick={handleAddQA} className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"><Plus size={16} /> Add Q&A</button>
        </div>
        <div className="space-y-4">
          {qas.map(qa => (
            <div key={qa.id} className="bg-slate-900/50 rounded-xl p-4 group relative space-y-2">
              <div>
                <label className="text-xs text-slate-400 font-bold">Q:</label>
                <EditableField value={qa.question} onChange={(val) => handleUpdateQA(qa.id, 'question', val)} />
              </div>
              <div className="border-t border-slate-800 pt-2">
                <label className="text-xs text-slate-400 font-bold">A:</label>
                <EditableField value={qa.answer} onChange={(val) => handleUpdateQA(qa.id, 'answer', val)} />
              </div>
              <button onClick={() => handleDeleteQA(qa.id)} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemoryView;