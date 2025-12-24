import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { NutrientTotals } from '../types';

interface Props {
  totals: NutrientTotals;
}

export const MacroChart: React.FC<Props> = ({ totals }) => {
  const data = [
    { name: 'Protein', value: Math.round(totals.protein_g * 4), color: '#3b82f6' }, // 4 cal/g
    { name: 'Carbs', value: Math.round(totals.carbs_g * 4), color: '#eab308' }, // 4 cal/g
    { name: 'Fat', value: Math.round(totals.fat_g * 9), color: '#a855f7' }, // 9 cal/g
  ];

  const totalCalsFromMacros = data.reduce((acc, curr) => acc + curr.value, 0);

  if (totalCalsFromMacros === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        No macro data yet
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 flex flex-col">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Calorie Breakdown</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} kcal`, 'Energy']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
