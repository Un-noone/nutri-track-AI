import React from 'react';
import { FoodEntry, UnitSystem } from '../types';
import { Trash2, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { convertFoodItem } from '../utils/unitConversion';

interface Props {
  entries: FoodEntry[];
  onDelete: (id: string) => void;
  unitSystem?: UnitSystem;
}

export const EntryList: React.FC<Props> = ({ entries, onDelete, unitSystem = 'metric' }) => {
  const normalizedUnitSystem: UnitSystem = unitSystem as UnitSystem;
  // Sort by date asc
  const sorted = [...entries].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
           <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">No meals logged yet today.</p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Start by typing what you ate above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight px-1">Day Entries</h3>
      {sorted.map(entry => (
        <div key={entry.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-300 group relative">
            
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg uppercase tracking-wider">
                {entry.meal_label || 'Meal'}
              </span>
              <div className="flex items-center text-slate-400 dark:text-slate-500 text-xs font-medium gap-2">
                <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(entry.logged_at), 'MMM d')}
                </span>
                <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                    <Clock className="w-3 h-3" />
                    {format(new Date(entry.logged_at), 'h:mm a')}
                </span>
              </div>
            </div>
            <button 
              onClick={() => onDelete(entry.id)}
              className="p-2 -mr-2 -mt-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Delete entry"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 mb-5">
            {entry.items.map((rawItem, idx) => {
              const item = convertFoodItem(rawItem, normalizedUnitSystem);
              return (
                <div key={idx} className="flex justify-between items-baseline text-sm pl-1">
                  <span className="text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.quantity} {item.unit}</span> {item.name}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs font-medium tabular-nums bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{Math.round(item.nutrients_total.calories)} kcal</span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex gap-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-600">Calories</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{Math.round(entry.totals.calories)}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-600">Protein</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{Math.round(entry.totals.protein_g)}g</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-600">Carbs</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{Math.round(entry.totals.carbs_g)}g</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-600">Fat</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{Math.round(entry.totals.fat_g)}g</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
