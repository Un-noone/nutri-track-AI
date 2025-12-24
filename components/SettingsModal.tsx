import React, { useState } from 'react';
import { NutrientGoals, UnitSystem } from '../types';
import { X, Target, Moon, Sun, Monitor, Scale } from 'lucide-react';

interface Props {
  currentGoals: NutrientGoals;
  onSaveGoals: (goals: NutrientGoals) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  currentUnitSystem: UnitSystem;
  onSetUnitSystem: (system: UnitSystem) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ 
  currentGoals, 
  onSaveGoals, 
  isDarkMode, 
  onToggleTheme, 
  currentUnitSystem,
  onSetUnitSystem,
  onClose 
}) => {
  const [goals, setGoals] = useState<NutrientGoals>(currentGoals);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoals(goals);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Settings
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6">
          
          {/* Theme Section */}
          <section>
             <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Appearance
             </h4>
             <div className="bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => isDarkMode && onToggleTheme()}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${!isDarkMode ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                   <Sun className="w-4 h-4" /> Light
                </button>
                <button
                  onClick={() => !isDarkMode && onToggleTheme()}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${isDarkMode ? 'bg-slate-700 shadow-sm text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   <Moon className="w-4 h-4" /> Dark
                </button>
             </div>
          </section>

          <hr className="my-6 border-slate-100 dark:border-slate-800" />

          {/* Unit System Section */}
          <section>
             <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4" /> Units
             </h4>
             <div className="bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => onSetUnitSystem('metric')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${currentUnitSystem === 'metric' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                   Metric (g, ml)
                </button>
                <button
                  onClick={() => onSetUnitSystem('imperial')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${currentUnitSystem === 'imperial' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   Imperial (oz, lb)
                </button>
             </div>
          </section>

          <hr className="my-6 border-slate-100 dark:border-slate-800" />

          {/* Goals Section */}
          <section>
            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" /> Daily Goals
            </h4>
            <form id="goals-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Daily Calories (kcal)</label>
                    <input 
                    type="number" 
                    required
                    min="0"
                    value={goals.calories}
                    onChange={e => setGoals({ ...goals, calories: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Protein (g)</label>
                    <input 
                        type="number" 
                        required
                        min="0"
                        value={goals.protein_g}
                        onChange={e => setGoals({ ...goals, protein_g: Number(e.target.value) })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    />
                    </div>
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Carbs (g)</label>
                    <input 
                        type="number" 
                        required
                        min="0"
                        value={goals.carbs_g}
                        onChange={e => setGoals({ ...goals, carbs_g: Number(e.target.value) })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    />
                    </div>
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Fat (g)</label>
                    <input 
                        type="number" 
                        required
                        min="0"
                        value={goals.fat_g}
                        onChange={e => setGoals({ ...goals, fat_g: Number(e.target.value) })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                    />
                    </div>
                </div>
            </form>
          </section>
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <button 
              type="submit" 
              form="goals-form"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
            >
              Save Changes
            </button>
        </div>
      </div>
    </div>
  );
};