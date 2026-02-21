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
    <div className="bg-surface-primary border border-edge-primary rounded-xl shadow-2xl w-64 p-4 space-y-4">
      <div>
        <label className="text-xs text-content-tertiary">Frequency</label>
        <div className="flex bg-surface-secondary rounded-md p-1 mt-1">
          {['daily', 'weekly', 'monthly'].map(f => (
            <button key={f} onClick={() => setFreq(f)} className={`flex-1 text-xs capitalize py-1 rounded ${freq === f ? 'bg-surface-secondary text-content-inverse' : 'text-content-secondary'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-content-tertiary">Repeat Every</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="number"
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value, 10))}
            className="w-16 bg-surface-secondary rounded-md p-2 text-center text-sm"
            min="1"
          />
          <span className="text-sm text-content-secondary">{freq === 'daily' ? 'day(s)' : freq === 'weekly' ? 'week(s)' : 'month(s)'}</span>
        </div>
      </div>

      {freq === 'weekly' && (
        <div>
          <label className="text-xs text-content-tertiary">Repeat On</label>
          <div className="flex justify-between gap-1 mt-2">
            {weekDays.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDayToggle(index)}
                className={`w-7 h-7 text-xs rounded-full transition-colors ${daysOfWeek.includes(index) ? 'bg-accent-bold text-content-inverse' : 'bg-surface-secondary hover:bg-surface-secondary'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-3 border-t border-edge-secondary">
        <button onClick={handleSave} className="w-full bg-accent-bolder text-content-inverse rounded-md py-2 text-sm font-semibold hover:bg-accent-boldest">
          Save
        </button>
        {recurrence && (
          <button onClick={handleRemove} className="w-full text-content-tertiary text-xs hover:text-danger">
            Remove Recurrence
          </button>
        )}
      </div>
    </div>
  );
};

export default RecurrenceEditor;
