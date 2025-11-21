import React, { useState } from 'react';

// --- Component: Recurrence Editor ---
const RecurrenceEditor = ({ recurrence, onSave, onClose }) => {
  const [freq, setFreq] = useState(recurrence?.frequency || 'weekly');
  const [interval, setInterval] = useState(recurrence?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState(recurrence?.daysOfWeek || []);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handleDayToggle = (dayIndex) => {
    setDaysOfWeek(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleSave = () => {
    onSave({
      frequency: freq,
      interval: Math.max(1, interval), // Ensure interval is at least 1
      daysOfWeek: freq === 'weekly' ? daysOfWeek : undefined,
    });
    onClose();
  };

  const handleRemove = () => {
    onSave(null); // Pass null to remove recurrence
    onClose();
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-64 p-4 space-y-4">
      <div>
        <label className="text-xs text-slate-400">Frequency</label>
        <div className="flex bg-slate-800 rounded-md p-1 mt-1">
          {['daily', 'weekly', 'monthly'].map(f => (
            <button key={f} onClick={() => setFreq(f)} className={`flex-1 text-xs capitalize py-1 rounded ${freq === f ? 'bg-slate-600 text-white' : 'text-slate-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400">Repeat Every</label>
        <div className="flex items-center gap-2 mt-1">
          <input 
            type="number"
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value, 10))}
            className="w-16 bg-slate-800 rounded-md p-2 text-center text-sm"
            min="1"
          />
          <span className="text-sm text-slate-300">{freq === 'daily' ? 'day(s)' : freq === 'weekly' ? 'week(s)' : 'month(s)'}</span>
        </div>
      </div>

      {freq === 'weekly' && (
        <div>
          <label className="text-xs text-slate-400">Repeat On</label>
          <div className="flex justify-between gap-1 mt-2">
            {weekDays.map((day, index) => (
              <button 
                key={index}
                onClick={() => handleDayToggle(index)}
                className={`w-7 h-7 text-xs rounded-full transition-colors ${daysOfWeek.includes(index) ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
        <button onClick={handleSave} className="w-full bg-emerald-600 text-white rounded-md py-2 text-sm font-semibold hover:bg-emerald-700">
          Save
        </button>
        {recurrence && (
          <button onClick={handleRemove} className="w-full text-slate-400 text-xs hover:text-rose-400">
            Remove Recurrence
          </button>
        )}
      </div>
    </div>
  );
};

export default RecurrenceEditor;