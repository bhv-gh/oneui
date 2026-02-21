import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { Pencil, Trash2 } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';
import { useDebounce } from '../hooks/useDebounce';

// --- Component: Rich Text Note (for Memory View) ---
const RichTextNote = ({ note, onUpdate, onDelete, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.text);
  const debouncedContent = useDebounce(content, 500);
  const isInitialMount = useRef(true);
  const editorRef = useRef(null);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Treat an empty editor (which Quill represents as '<p><br></p>') as an empty string.
    const contentToSave = debouncedContent === '<p><br></p>' ? '' : debouncedContent;
    onUpdate(note.id, contentToSave);

  }, [debouncedContent]);

  const handleBlur = (e) => {
    // If the new focused element is outside the editor container, exit editing mode.
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsEditing(false);
    }
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
      <div
        ref={editorRef}
        onBlur={handleBlur}
        className="bg-surface-primary rounded-xl p-4 group relative animate-in fade-in duration-200"
      >
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          placeholder={placeholder}
          modules={quillModules}
          className="rich-text-editor" // Custom class for styling
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="bg-surface-primary rounded-xl p-4 group relative cursor-pointer hover:bg-surface-secondary transition-colors"
    >
      {note.text ? (
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: note.text }}
        />
      ) : (
        <div className="text-content-muted">{placeholder}</div>
      )}

      <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 text-content-muted hover:text-accent"><Pencil size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="p-1 text-content-muted hover:text-danger"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

export default RichTextNote;
