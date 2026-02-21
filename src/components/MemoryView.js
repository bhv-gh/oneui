import React, { useState, useEffect, useRef } from 'react';
import {
  Lightbulb,
  HelpCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import RichTextNote from './RichTextNote';
import { generateId } from '../utils/idGenerator';
import { useDebounce } from '../hooks/useDebounce';

// --- Component: Memory View ---
const MemoryView = ({ memoryData, onUpdate, searchQuery, viewType }) => {
  const { notes, qas } = memoryData;

  const handleAddNote = () => {
    const newNote = { id: generateId(), text: '', lastModified: new Date().toISOString() };
    onUpdate({ notes: [...notes, newNote] });
  };

  const handleUpdateNote = (id, newText) => {
    const updatedNotes = notes.map(note => note.id === id ? { ...note, text: newText, lastModified: new Date().toISOString() } : note);
    onUpdate({ notes: updatedNotes });
  };

  const handleDeleteNote = (id) => {
    onUpdate({ notes: notes.filter(note => note.id !== id) });
  };

  const handleAddQA = () => {
    const newQA = { id: generateId(), question: '', answer: '', lastModified: new Date().toISOString() };
    onUpdate({ qas: [...qas, newQA] });
  };

  const handleUpdateQA = (id, field, value) => {
    const updatedQAs = qas.map(qa => qa.id === id ? { ...qa, [field]: value, lastModified: new Date().toISOString() } : qa);
    onUpdate({ qas: updatedQAs });
  };

  const handleDeleteQA = (id) => {
    onUpdate({ qas: qas.filter(qa => qa.id !== id) });
  };

  const highlightText = (text, query) => {
    if (!query || !text) {
      return text;
    }
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-accent-subtle text-accent">{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const EditableField = ({ value, onChange, placeholder }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(value);
    const debouncedText = useDebounce(text, 500);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        onChange(debouncedText);
    }, [debouncedText]);

    const handleBlur = () => {
      setIsEditing(false);
      if (text !== value) {
        onChange(text);
      }
    };

    if (isEditing) {
      return (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          placeholder={placeholder}
          className="w-full bg-surface-secondary border border-edge-primary rounded-lg p-2 text-content-primary focus:outline-none focus:ring-2 focus:ring-edge-focus"
        />
      );
    }
    return (
      <div onClick={() => setIsEditing(true)} className="w-full p-2 cursor-text whitespace-pre-wrap">
        {value ? (
          highlightText(value, searchQuery)
        ) : (
          <span className="text-content-muted">{placeholder}</span>
        )}
      </div>
    );
  };

  // Sort notes and Q&As by last modified date, newest first
  const sortedNotes = [...notes].sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  const sortedQAs = [...qas].sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-300 space-y-12">
      {/* Notes Section - Render only if viewType is 'notes' or not specified */}
      {(viewType === 'notes' || !viewType) && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-content-primary flex items-center gap-2"><Lightbulb /> Notes</h2>
            <button onClick={handleAddNote} className="px-4 py-2 text-sm rounded-lg bg-accent-bolder text-content-inverse hover:bg-accent-boldest flex items-center gap-2"><Plus size={16} /> Add Note</button>
          </div>
          <div className="space-y-4">
            {sortedNotes.map(note => (
              <RichTextNote
                key={note.id}
                note={note}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                placeholder="Type your note here..."
              />
            ))}
          </div>
        </div>
      )}

      {/* Q&A Section - Render only if viewType is 'qas' or not specified */}
      {(viewType === 'qas' || !viewType) && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-content-primary flex items-center gap-2"><HelpCircle /> Q & A</h2>
            <button onClick={handleAddQA} className="px-4 py-2 text-sm rounded-lg bg-accent-bolder text-content-inverse hover:bg-accent-boldest flex items-center gap-2"><Plus size={16} /> Add Q&A</button>
          </div>
          <div className="space-y-4">
            {sortedQAs.map(qa => (
              <div key={qa.id} className="bg-surface-primary rounded-xl group relative transition-all hover:bg-surface-secondary">
                <div className="p-4">
                  <label className="text-sm font-semibold text-accent">Question</label>
                  <EditableField value={qa.question} onChange={(val) => handleUpdateQA(qa.id, 'question', val)} placeholder="Type your question..."/>
                </div>
                <div className="bg-surface-primary p-4 border-t border-edge-secondary rounded-b-xl">
                  <label className="text-sm font-semibold text-accent-secondary">Answer</label>
                  <EditableField value={qa.answer} onChange={(val) => handleUpdateQA(qa.id, 'answer', val)} placeholder="Type your answer..."/>
                </div>
                <button onClick={() => handleDeleteQA(qa.id)} className="absolute top-3 right-3 p-1 text-content-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryView;
