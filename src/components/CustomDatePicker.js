import React from 'react';
import { DayPicker } from 'react-day-picker';
import { isToday } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import 'react-day-picker/dist/style.css';

// --- Component: Custom Date Picker ---
const CustomDatePicker = ({ selected, onSelect }) => {
  const today = new Date();
  const isTodaySelected = selected ? isToday(selected) : false;

  const handleSelectToday = () => {
    onSelect(today);
  };

  // Custom components for navigation arrows
  const CustomIconLeft = (props) => <ChevronDown {...props} className="h-4 w-4 rotate-90" />;
  const CustomIconRight = (props) => <ChevronDown {...props} className="h-4 w-4 -rotate-90" />;

  // Custom caption for month/year display
  const CustomCaption = (props) => {
    const { displayMonth } = props;
    return (
      <div className="text-sm font-medium text-slate-200">{displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
    );
  };

  return (
    <DayPicker
      mode="single" 
      selected={selected}
      onSelect={onSelect}
      showOutsideDays
      classNames={{
        root: 'bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 flex flex-col', // Added flex-col
        caption: 'flex justify-center items-center relative mb-2',
        caption_label: 'text-sm font-medium text-slate-200',
        nav: 'flex items-center',
        nav_button: 'h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-800 transition-colors',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse',
        head_row: 'flex font-medium text-slate-400 text-xs',
        head_cell: 'w-8 h-8 flex items-center justify-center',
        row: 'flex w-full mt-2',
        cell: 'w-8 h-8 flex items-center justify-center',
        day: 'w-full h-full rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors',
        // Apply a ring to today's date for visibility. It won't conflict with the selected background.
        day_today: 'ring-1 ring-emerald-500/50',
        // Ensure selected day style has high specificity
        day_selected: 'bg-emerald-500 text-white hover:bg-emerald-600',
        day_outside: 'text-slate-600 opacity-50',
        day_disabled: 'text-slate-700 opacity-50',
      }}
      components={{
        IconLeft: CustomIconLeft,
        IconRight: CustomIconRight,
        Caption: CustomCaption,
      }}
      footer={
        <div className="flex justify-center mt-3 pt-3 border-t border-slate-800">
          <button
            disabled={isTodaySelected}
            onClick={handleSelectToday}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isTodaySelected 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >Jump to Today</button>
        </div>
      }
    />
  );
};

export default CustomDatePicker;