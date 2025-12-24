import React, { useEffect, useState } from 'react';
import { Send, Loader2, AlertCircle, Check, Ban, Sparkles } from 'lucide-react';
import { parseFoodLog } from '../services/apiService';
import { ParseResult, FoodEntry, FoodItem, NutrientTotals, UnitSystem } from '../types';
import { convertFoodItem } from '../utils/unitConversion';

const generateId = () => Math.random().toString(36).substring(2, 15);

interface Props {
  onAddEntry: (entry: FoodEntry) => void;
  currentDate: Date;
  isDisabled?: boolean;
  unitSystem?: UnitSystem;
}

export const LogForm: React.FC<Props> = ({ onAddEntry, currentDate, isDisabled = false, unitSystem = 'metric' }) => {
  const normalizedUnitSystem: UnitSystem = unitSystem as UnitSystem;
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clarification, setClarification] = useState<string | null>(null);
  const [clarificationContext, setClarificationContext] = useState<{
    baseText: string;
    targetItemName: string | null;
  } | null>(null);
  const [pendingResult, setPendingResult] = useState<ParseResult | null>(null);
  const [pendingRawText, setPendingRawText] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isLoading) {
      setProgress(10);
      const cap = 89.5;
      intervalId = setInterval(() => {
        setProgress(prev => {
          if (prev >= cap) return prev;
          const next = prev + (cap - prev) * 0.12; // fast at start, slows down near cap
          return Math.min(next, cap);
        });
      }, 200);
    } else if (progress > 0) {
      setProgress(100);
      timeoutId = setTimeout(() => setProgress(0), 500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const progressLabel =
    progress < 30
      ? 'Connecting to AI...'
      : progress < 60
        ? 'Parsing food items...'
        : 'Calculating nutrition data...';

  const extractTargetItemName = (question: string | null) => {
    if (!question) return null;
    const m = question.match(/For\s+"([^"]+)"/i);
    return m ? m[1].trim() : null;
  };

  const buildClarificationText = (baseText: string, targetItemName: string | null, answerText: string) => {
    const base = baseText.trim();
    let answer = answerText.trim();
    if (!base || !answer) return base || answer;

    if (targetItemName) {
      const numericOnly = /^\d+(?:[.,]\d+)?$/.test(answer);
      if (numericOnly) answer = `${answer} g`;

      const targetLower = targetItemName.toLowerCase();
      const answerHasTarget = answer.toLowerCase().includes(targetLower);
      return answerHasTarget ? `${base}, ${answer}` : `${base}, ${answer} ${targetItemName}`;
    }

    return `${base}, ${answer}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isDisabled) return;

    const isClarificationAnswer = Boolean(clarificationContext);
    const textToSend = isClarificationAnswer
      ? buildClarificationText(
          clarificationContext!.baseText,
          clarificationContext!.targetItemName,
          input
        )
      : input;

    setIsLoading(true);
    setPendingResult(null);
    setPendingRawText(textToSend);
    setClarification(null);
    setClarificationContext(null);

    try {
      const now = new Date();
      const isToday = currentDate.getDate() === now.getDate() && 
                      currentDate.getMonth() === now.getMonth() && 
                      currentDate.getFullYear() === now.getFullYear();

      const contextDateTime = isToday 
        ? now.toString() 
        : (() => {
            const d = new Date(currentDate);
            d.setHours(12, 0, 0, 0);
            return d.toString();
          })();

      const result = await parseFoodLog(textToSend, contextDateTime);

      if (result.needs_clarification && result.clarification_question) {
        setClarification(result.clarification_question);
        setClarificationContext({
          baseText: textToSend,
          targetItemName: extractTargetItemName(result.clarification_question),
        });
        setInput('');
      } else {
        setPendingResult(result);
        setInput('');
        setClarification(null);
        setClarificationContext(null);
      }
    } catch (error) {
      console.error(error);
      setClarification("Sorry, something went wrong processing your request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmEntry = () => {
    if (!pendingResult) return;

    const totals: NutrientTotals = pendingResult.items.reduce((acc, item) => ({
      calories: acc.calories + item.nutrients_total.calories,
      protein_g: acc.protein_g + item.nutrients_total.protein_g,
      carbs_g: acc.carbs_g + item.nutrients_total.carbs_g,
      fat_g: acc.fat_g + item.nutrients_total.fat_g,
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    const newEntry: FoodEntry = {
      id: generateId(),
      logged_at: pendingResult.logged_at_iso || new Date().toISOString(),
      raw_text: pendingRawText || "Logged entry",
      meal_label: pendingResult.meal_label,
      items: pendingResult.items,
      totals
    };

    onAddEntry(newEntry);
    setPendingResult(null);
    setPendingRawText(null);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all ${isDisabled ? 'opacity-80' : ''}`}>
      
      {isDisabled && (
        <div className="absolute inset-0 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <Ban className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-500" />
            <p className="font-medium text-sm">Cannot log for future dates</p>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Log Food
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
                {currentDate.toLocaleDateString()}
            </span>
        </div>

        {(isLoading || progress > 0) && (
          <div className="mb-4">
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-center text-slate-500 dark:text-slate-400">
              {progressLabel}
            </p>
          </div>
        )}
        
        {/* Chat / Interaction Area */}
        <div className="space-y-4">
            {clarification && (
            <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex-shrink-0">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                <p className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1">More details needed</p>
                <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed">{clarification}</p>
                </div>
            </div>
            )}

            {pendingResult && !clarification && (
            <div className="bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-5 rounded-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                    <div className="p-1 bg-emerald-200 dark:bg-emerald-800 rounded-full"><Check className="w-3 h-3 text-emerald-800 dark:text-emerald-100" /></div>
                    Parsed Successfully
                </h3>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-1 rounded-md uppercase tracking-wide">
                    {pendingResult.meal_label || 'Meal'}
                </span>
                </div>
                <ul className="space-y-3 mb-5">
                {pendingResult.items.map((rawItem, idx) => {
                  const item = convertFoodItem(rawItem, normalizedUnitSystem);
                  return (
                    <li key={idx} className="flex justify-between text-sm text-emerald-900/80 dark:text-emerald-200/80 border-b border-emerald-100/50 dark:border-emerald-800/50 last:border-0 pb-2 last:pb-0">
                    <span><span className="font-semibold text-emerald-950 dark:text-emerald-50">{item.quantity} {item.unit}</span> {item.name}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{Math.round(item.nutrients_total.calories)} kcal</span>
                    </li>
                  );
                })}
                </ul>
                <div className="flex justify-end gap-3">
                <button 
                    onClick={() => setPendingResult(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    Discard
                </button>
                <button 
                    onClick={confirmEntry}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm shadow-emerald-200 dark:shadow-none"
                >
                    Confirm & Log
                </button>
                </div>
            </div>
            )}
        </div>

        {/* Input Form */}
        {!pendingResult && (
            <form onSubmit={handleSubmit} className="relative group mt-4">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={clarification ? "Type your answer here..." : "e.g., '2 scrambled eggs and a slice of sourdough toast'"}
                className="w-full p-4 pr-14 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 resize-none h-28 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200"
                disabled={isLoading || isDisabled}
            />
            <button
                type="submit"
                disabled={isLoading || !input.trim() || isDisabled}
                className="absolute bottom-3 right-3 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
            </form>
        )}
      </div>
    </div>
  );
};
