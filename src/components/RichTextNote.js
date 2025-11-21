import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import { Pencil, Trash2 } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';

// --- Component: Rich Text Note (for Memory View) ---
const RichTextNote = ({ note, onUpdate, onDelete, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.text);

  const handleSave = () => {
    // Treat an empty editor (which Quill represents as '<p><br></p>') as an empty string.
    const contentToSave = content === '<p><br></p>' ? '' : content;
    onUpdate(note.id, contentToSave);
    setIsEditing(false);
  };

  // Custom toolbar options for a cleaner look
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
  };

  if (isEditing) {
    return (
      <div className="bg-slate-900/50 rounded-xl p-4 group relative animate-in fade-in duration-200">
        <ReactQuill 
          theme="snow" 
          value={content} 
          onChange={setContent}
          placeholder={placeholder}
          modules={quillModules}
          className="rich-text-editor" // Custom class for styling
        />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs rounded-md text-slate-300 hover:bg-slate-700">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className="bg-slate-900/50 rounded-xl p-4 group relative cursor-pointer hover:bg-slate-800/50 transition-colors"
    >
      {note.text ? (
        <div 
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: note.text }} 
        />
      ) : (
        <div className="text-slate-500">{placeholder}</div>
      )}

      <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 text-slate-500 hover:text-emerald-400"><Pencil size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

export default RichTextNote;