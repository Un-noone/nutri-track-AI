import React, { useState, useEffect } from 'react';
import { LogForm } from './components/LogForm';
import { SummaryCards } from './components/SummaryCards';
import { TrendChart } from './components/TrendChart';
import { SettingsModal } from './components/SettingsModal';
import { DailyLogModal } from './components/DailyLogModal';
import { CalendarSelector } from './components/CalendarSelector';
import { FoodEntry, NutrientTotals, NutrientGoals, UnitSystem } from './types';
import { Utensils, BarChart2, Settings, ChevronLeft, ChevronRight, TrendingUp, X, ScrollText } from 'lucide-react';

// Helper for date formatting YYYY-MM-DD
const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DEFAULT_GOALS: NutrientGoals = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 250,
  fat_g: 65,
};

type ViewMode = 'day' | 'week' | 'month';

const App: React.FC = () => {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goals, setGoals] = useState<NutrientGoals>(DEFAULT_GOALS);
  const [activeTab, setActiveTab] = useState<'tracker' | 'visualize'>('tracker');
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showTip, setShowTip] = useState(true);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nutritrack_theme') === 'dark';
    }
    return false;
  });

  // Unit System State
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('nutritrack_unit_system') as UnitSystem) || 'metric';
    }
    return 'metric';
  });

  // Apply Theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nutritrack_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nutritrack_theme', 'light');
    }
  }, [isDarkMode]);

  // Persist Unit System
  useEffect(() => {
    localStorage.setItem('nutritrack_unit_system', unitSystem);
  }, [unitSystem]);

  // Load data
  useEffect(() => {
    const savedEntries = localStorage.getItem('nutritrack_entries');
    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries));
      } catch (e) {
        console.error("Failed to load entries", e);
      }
    }

    const savedGoals = localStorage.getItem('nutritrack_goals');
    if (savedGoals) {
      try {
        setGoals(JSON.parse(savedGoals));
      } catch (e) {
        console.error("Failed to load goals", e);
      }
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('nutritrack_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('nutritrack_goals', JSON.stringify(goals));
  }, [goals]);

  const addEntry = (entry: FoodEntry) => {
    setEntries(prev => [entry, ...prev]);
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() + 1);
    setSelectedDate(d);
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() && 
           d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  };

  // Filter logic
  const now = new Date();
  
  // Future check: strictly greater than "today"
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfSelected = new Date(selectedDate);
  startOfSelected.setHours(0, 0, 0, 0);
  
  const isFutureDate = viewMode === 'day' && startOfSelected > startOfToday;

  let filterStart: Date;
  let filterEnd: Date;

  if (viewMode === 'day') {
    filterStart = new Date(selectedDate);
    filterStart.setHours(0, 0, 0, 0);
    filterEnd = new Date(selectedDate);
    filterEnd.setHours(23, 59, 59, 999);
  } else if (viewMode === 'week') {
    // Last 7 days from NOW
    filterEnd = new Date(now);
    filterEnd.setHours(23, 59, 59, 999);
    filterStart = new Date(now);
    filterStart.setDate(now.getDate() - 6);
    filterStart.setHours(0, 0, 0, 0);
  } else {
    // Last 30 days from NOW
    filterEnd = new Date(now);
    filterEnd.setHours(23, 59, 59, 999);
    filterStart = new Date(now);
    filterStart.setDate(now.getDate() - 29);
    filterStart.setHours(0, 0, 0, 0);
  }

  const filteredEntries = entries.filter(e => {
    const entryDate = new Date(e.logged_at);
    return entryDate >= filterStart && entryDate <= filterEnd;
  });

  // Calculate Aggregates
  const aggregateTotals: NutrientTotals = filteredEntries.reduce((acc, entry) => ({
    calories: acc.calories + entry.totals.calories,
    protein_g: acc.protein_g + entry.totals.protein_g,
    carbs_g: acc.carbs_g + entry.totals.carbs_g,
    fat_g: acc.fat_g + entry.totals.fat_g,
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  // For SummaryCards: If Week/Month, show Daily Average
  const daysInPeriod = viewMode === 'day' ? 1 : (viewMode === 'week' ? 7 : 30);
  
  const displayTotals: NutrientTotals = viewMode === 'day' 
    ? aggregateTotals 
    : {
        calories: aggregateTotals.calories / daysInPeriod,
        protein_g: aggregateTotals.protein_g / daysInPeriod,
        carbs_g: aggregateTotals.carbs_g / daysInPeriod,
        fat_g: aggregateTotals.fat_g / daysInPeriod,
      };

  // Trend Data
  const dailyDataMap = new Map<string, NutrientTotals>();
  
  let trendStart = new Date(filterStart);
  if (viewMode === 'day') {
      trendStart = new Date(selectedDate);
      trendStart.setDate(trendStart.getDate() - 6); // Show context
  }

  const trendEnd = new Date(filterEnd);
  const trendDataArray = [];
  const curr = new Date(trendStart);
  while (curr <= trendEnd) {
      trendDataArray.push(toDateKey(curr));
      curr.setDate(curr.getDate() + 1);
  }

  trendDataArray.forEach(k => {
      dailyDataMap.set(k, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  const trendEntries = entries.filter(e => {
      const d = toDateKey(new Date(e.logged_at));
      return dailyDataMap.has(d);
  });

  trendEntries.forEach(entry => {
    const dateStr = toDateKey(new Date(entry.logged_at));
    if (dailyDataMap.has(dateStr)) {
      const current = dailyDataMap.get(dateStr)!;
      dailyDataMap.set(dateStr, {
        calories: current.calories + entry.totals.calories,
        protein_g: current.protein_g + entry.totals.protein_g,
        carbs_g: current.carbs_g + entry.totals.carbs_g,
        fat_g: current.fat_g + entry.totals.fat_g,
      });
    }
  });

  const trendData = Array.from(dailyDataMap.entries())
    .map(([date, totals]) => ({
      date,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein_g),
      carbs: Math.round(totals.carbs_g),
      fat: Math.round(totals.fat_g),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));


  return (
    <div className="min-h-screen pb-20 relative overflow-x-hidden bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-200/20 dark:bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-purple-200/10 dark:bg-purple-500/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      {isSettingsOpen && (
        <SettingsModal 
          currentGoals={goals} 
          onSaveGoals={setGoals} 
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          currentUnitSystem={unitSystem}
          onSetUnitSystem={setUnitSystem}
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}

      <DailyLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        entries={filteredEntries}
        onDelete={deleteEntry}
        date={viewMode === 'day' ? selectedDate : new Date()}
        unitSystem={unitSystem}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">NutriTrack AI</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
              <button
                onClick={() => setActiveTab('tracker')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'tracker' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                Tracker
              </button>
              <button
                onClick={() => setActiveTab('visualize')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'visualize' 
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                Visualize
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            {/* Title Section */}
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activeTab === 'tracker' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                    {activeTab === 'tracker' ? (
                      <BarChart2 className="w-6 h-6" />
                    ) : (
                      <TrendingUp className="w-6 h-6" />
                    )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    {activeTab === 'tracker' ? 'Dashboard' : 'Analytics'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {activeTab === 'tracker' 
                        ? (viewMode === 'day' 
                            ? (isToday(selectedDate) ? 'Overview for Today' : selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })) 
                            : (viewMode === 'week' ? 'Weekly Average Overview' : 'Monthly Average Overview')) 
                        : 'Trends & Insights'}
                  </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
               
              {/* Date Selector (Left of ViewMode) */}
              {viewMode === 'day' && (
                <div className="flex items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-xl p-1 shadow-sm border border-slate-200/60 dark:border-slate-700/60 h-[42px]">
                   <button onClick={handlePrevDay} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                   <div className="relative mx-1">
                      <button 
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className="w-[120px] text-sm text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md py-1 transition-colors"
                      >
                        {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </button>
                      {isCalendarOpen && (
                        <CalendarSelector 
                          selectedDate={selectedDate} 
                          onSelect={(d) => {
                            setSelectedDate(d);
                            setIsCalendarOpen(false);
                          }}
                          onClose={() => setIsCalendarOpen(false)}
                        />
                      )}
                   </div>
                   <button onClick={handleNextDay} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><ChevronRight className="w-4 h-4"/></button>
                </div>
              )}

              {/* View Mode Selector */}
              <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-xl p-1 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
                <button 
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Day
                </button>
                <button 
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Week
                </button>
                <button 
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Month
                </button>
              </div>
              
              <div className="h-6 w-px bg-slate-300/50 dark:bg-slate-700/50 mx-1 hidden sm:block"></div>

              {/* Action Buttons */}
              <button 
                onClick={() => setIsLogModalOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm group"
              >
                <ScrollText className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                <span className="hidden sm:inline">Food Log</span>
                {filteredEntries.length > 0 && (
                   <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-indigo-500 text-white text-[10px] font-bold rounded-full shadow-md shadow-indigo-200 dark:shadow-none">
                     {filteredEntries.length}
                   </span>
                )}
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm group"
              >
                <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
        </div>

        {activeTab === 'tracker' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <SummaryCards 
              totals={displayTotals} 
              goals={goals} 
              isAverage={viewMode !== 'day'}
            />
            
            {/* Full Width Log Form */}
            <div className="w-full">
                 <LogForm 
                    onAddEntry={addEntry} 
                    currentDate={viewMode === 'day' ? selectedDate : new Date()} 
                    isDisabled={isFutureDate}
                    unitSystem={unitSystem}
                 />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <TrendChart data={trendData} goals={goals} isDarkMode={isDarkMode} />
          </div>
        )}
      </main>

      {/* Tip Toast */}
      {showTip && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-5 flex items-start gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
           <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2.5 rounded-xl flex-shrink-0 shadow-lg shadow-indigo-200 dark:shadow-none">
             <Utensils className="w-5 h-5 text-white" />
           </div>
           <div className="flex-1">
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">Quick Tip</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {viewMode === 'day' && !isToday(selectedDate) && !isFutureDate
                    ? `You are logging entries for ${selectedDate.toLocaleDateString()}.` 
                    : isFutureDate 
                      ? "You cannot log entries for future dates."
                      : 'Say "Yesterday I had a turkey sandwich at 1pm" to backfill missed meals!'}
              </p>
           </div>
           <button 
             onClick={() => setShowTip(false)}
             className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 -mt-1 -mr-1 transition-colors"
           >
             <X className="w-5 h-5" />
           </button>
        </div>
      )}
    </div>
  );
};

export default App;