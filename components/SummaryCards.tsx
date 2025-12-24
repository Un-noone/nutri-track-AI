import React from 'react';
import { NutrientTotals, NutrientGoals } from '../types';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';

interface Props {
  totals: NutrientTotals;
  goals: NutrientGoals;
  isAverage: boolean;
}

const ProgressBar = ({ current, max, colorClass, trackClass }: { current: number; max: number; colorClass: string; trackClass: string }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className={`w-full h-2 ${trackClass} rounded-full mt-3 overflow-hidden`}>
      <div 
        className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export const SummaryCards: React.FC<Props> = ({ totals, goals, isAverage }) => {
  const labelSuffix = isAverage ? " (Avg)" : "";

  const Card = ({ title, value, max, unit, icon: Icon, gradient, trackColor, barColor }: any) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] dark:shadow-none border border-slate-100/50 dark:border-slate-800 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 dark:opacity-[0.03] dark:group-hover:opacity-[0.07] transition-opacity duration-500`}>
         <Icon className="w-24 h-24 dark:text-white" />
      </div>
      
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{title}</span>
      </div>
      
      <div className="mt-auto relative z-10">
        <div className="flex items-baseline gap-1.5">
           <span className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{Math.round(value)}</span>
           <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{unit} / {max}{unit}</span>
        </div>
        <ProgressBar current={value} max={max} colorClass={barColor} trackClass={trackColor} />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
      <Card 
        title={`Calories${labelSuffix}`}
        value={totals.calories} 
        max={goals.calories} 
        unit="" 
        icon={Flame}
        gradient="from-orange-400 to-red-500"
        trackColor="bg-orange-50 dark:bg-orange-900/20"
        barColor="bg-gradient-to-r from-orange-400 to-orange-500"
      />
      <Card 
        title={`Protein${labelSuffix}`}
        value={totals.protein_g} 
        max={goals.protein_g} 
        unit="g" 
        icon={Beef}
        gradient="from-blue-400 to-indigo-500"
        trackColor="bg-blue-50 dark:bg-blue-900/20"
        barColor="bg-gradient-to-r from-blue-400 to-blue-500"
      />
      <Card 
        title={`Carbs${labelSuffix}`}
        value={totals.carbs_g} 
        max={goals.carbs_g} 
        unit="g" 
        icon={Wheat}
        gradient="from-yellow-400 to-amber-500"
        trackColor="bg-amber-50 dark:bg-amber-900/20"
        barColor="bg-gradient-to-r from-amber-400 to-amber-500"
      />
      <Card 
        title={`Fat${labelSuffix}`}
        value={totals.fat_g} 
        max={goals.fat_g} 
        unit="g" 
        icon={Droplet}
        gradient="from-purple-400 to-fuchsia-500"
        trackColor="bg-purple-50 dark:bg-purple-900/20"
        barColor="bg-gradient-to-r from-purple-400 to-purple-500"
      />
    </div>
  );
};