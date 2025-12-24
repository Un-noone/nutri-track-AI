import React from 'react';
import { X, Calendar, ScrollText } from 'lucide-react';
import { FoodEntry, UnitSystem } from '../types';
import { EntryList } from './EntryList';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: FoodEntry[];
  onDelete: (id: string) => void;
  date: Date;
  unitSystem?: UnitSystem;
}

export const DailyLogModal: React.FC<Props> = ({ isOpen, onClose, entries, onDelete, date, unitSystem = 'metric' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ScrollText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Food Log
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/50">
           <EntryList entries={entries} onDelete={onDelete} unitSystem={unitSystem} />
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end flex-shrink-0">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};