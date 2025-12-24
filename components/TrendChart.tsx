import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { NutrientGoals } from '../types';

interface Props {
  data: {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  goals: NutrientGoals;
  isDarkMode?: boolean;
}

type Metric = 'calories' | 'protein' | 'carbs' | 'fat';

export const TrendChart: React.FC<Props> = ({ data, goals, isDarkMode = false }) => {
  const [visibleMetrics, setVisibleMetrics] = useState<Record<Metric, boolean>>({
    calories: true,
    protein: false,
    carbs: false,
    fat: false,
  });
  const [showGoals, setShowGoals] = useState(true);

  const toggleMetric = (metric: Metric) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  const showMacros = visibleMetrics.protein || visibleMetrics.carbs || visibleMetrics.fat;
  // If macros are visible, calories go to right axis. Otherwise calories stay on left.
  const calorieAxisId = showMacros ? "right" : "left";

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-80 flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">
        No data available for this period
      </div>
    );
  }

  // Calculate domains to ensure goals are visible
  const maxCalories = Math.max(...data.map(d => d.calories), visibleMetrics.calories && showGoals ? goals.calories : 0);
  
  const activeMacroGoals = [
    visibleMetrics.protein && showGoals ? goals.protein_g : 0,
    visibleMetrics.carbs && showGoals ? goals.carbs_g : 0,
    visibleMetrics.fat && showGoals ? goals.fat_g : 0,
  ];
  
  const activeMacroData = [
    visibleMetrics.protein ? Math.max(...data.map(d => d.protein)) : 0,
    visibleMetrics.carbs ? Math.max(...data.map(d => d.carbs)) : 0,
    visibleMetrics.fat ? Math.max(...data.map(d => d.fat)) : 0,
  ];

  const maxMacro = Math.max(...activeMacroGoals, ...activeMacroData);

  // Add ~10% padding
  const calorieDomain = [0, Math.ceil(maxCalories * 1.1)];
  const macroDomain = [0, Math.ceil(maxMacro * 1.1)];

  const strokeColor = isDarkMode ? "#475569" : "#94a3b8"; // Slate 600 vs Slate 400
  const gridColor = isDarkMode ? "#1e293b" : "#e2e8f0"; // Slate 800 vs Slate 200
  const tooltipBg = isDarkMode ? "#1e293b" : "#ffffff";
  const tooltipText = isDarkMode ? "#f1f5f9" : "#1e293b";

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 dark:border-slate-800 h-[500px] flex flex-col">
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Trends Over Time</h3>
        
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center gap-4 border-r border-slate-200 dark:border-slate-700 pr-4 mr-2">
                 <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showGoals ? 'bg-slate-700 dark:bg-slate-500 border-slate-700 dark:border-slate-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    {showGoals && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showGoals} 
                    onChange={() => setShowGoals(!showGoals)} 
                    className="hidden" 
                  />
                  <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Show Goals</span>
                </label>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none group">
               <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.calories ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    {visibleMetrics.calories && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
               </div>
              <input type="checkbox" checked={visibleMetrics.calories} onChange={() => toggleMetric('calories')} className="hidden" />
              <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Calories</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none group">
               <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.protein ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    {visibleMetrics.protein && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
               </div>
              <input type="checkbox" checked={visibleMetrics.protein} onChange={() => toggleMetric('protein')} className="hidden" />
              <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Protein</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none group">
               <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.carbs ? 'bg-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    {visibleMetrics.carbs && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
               </div>
              <input type="checkbox" checked={visibleMetrics.carbs} onChange={() => toggleMetric('carbs')} className="hidden" />
              <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Carbs</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none group">
               <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.fat ? 'bg-purple-500 border-purple-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    {visibleMetrics.fat && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
               </div>
              <input type="checkbox" checked={visibleMetrics.fat} onChange={() => toggleMetric('fat')} className="hidden" />
              <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Fat</span>
            </label>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(str) => {
                const d = new Date(str);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              stroke={strokeColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            
            <YAxis 
                yAxisId="left"
                stroke={strokeColor} 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                domain={showMacros ? macroDomain : calorieDomain}
                tickFormatter={(val) => Math.round(val).toString()}
            />

            <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#f97316" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                hide={!showMacros || !visibleMetrics.calories}
                domain={calorieDomain}
                tickFormatter={(val) => Math.round(val).toString()}
            />
            
            <Tooltip 
              cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }}
              contentStyle={{ 
                  borderRadius: '12px', 
                  border: isDarkMode ? '1px solid #334155' : 'none', 
                  backgroundColor: tooltipBg,
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
              }}
              labelFormatter={(label) => {
                const d = new Date(label);
                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              }}
              labelStyle={{ color: tooltipText, fontWeight: 'bold', marginBottom: '4px' }}
              itemStyle={{ color: tooltipText }}
            />
            <Legend verticalAlign="top" height={36} />
            
            {/* Goals */}
            {showGoals && visibleMetrics.calories && (
               <ReferenceLine yAxisId={calorieAxisId} y={goals.calories} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Calorie Goal', fill: '#f97316', fontSize: 10, fontWeight: 'bold' }} />
            )}
            {showGoals && visibleMetrics.protein && (
               <ReferenceLine yAxisId="left" y={goals.protein_g} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Protein Goal', fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} />
            )}
            {showGoals && visibleMetrics.carbs && (
               <ReferenceLine yAxisId="left" y={goals.carbs_g} stroke="#eab308" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Carbs Goal', fill: '#eab308', fontSize: 10, fontWeight: 'bold' }} />
            )}
            {showGoals && visibleMetrics.fat && (
               <ReferenceLine yAxisId="left" y={goals.fat_g} stroke="#a855f7" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Fat Goal', fill: '#a855f7', fontSize: 10, fontWeight: 'bold' }} />
            )}

            {/* Bars */}
            {visibleMetrics.calories && (
              <Bar 
                yAxisId={calorieAxisId} 
                dataKey="calories" 
                name="Calories" 
                fill="#f97316" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={40} 
                animationDuration={1500}
              />
            )}
            {visibleMetrics.protein && (
              <Bar yAxisId="left" dataKey="protein" name="Protein (g)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1500} />
            )}
            {visibleMetrics.carbs && (
              <Bar yAxisId="left" dataKey="carbs" name="Carbs (g)" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1500} />
            )}
            {visibleMetrics.fat && (
              <Bar yAxisId="left" dataKey="fat" name="Fat (g)" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1500} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};