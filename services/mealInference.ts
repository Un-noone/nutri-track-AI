import type { Meal } from './schemas/foodLogExtractionSchema';

const MEAL_KEYWORDS: Array<{ meal: Meal; patterns: RegExp[] }> = [
  { meal: 'Breakfast', patterns: [/(\bbreakfast\b)/i] },
  { meal: 'Lunch', patterns: [/(\blunch\b)/i] },
  { meal: 'Dinner', patterns: [/(\bdinner\b)/i] },
  { meal: 'Snack', patterns: [/(\bsnack\b)/i] },
];

export const mealFromTextKeyword = (userText: string): Meal | null => {
  for (const { meal, patterns } of MEAL_KEYWORDS) {
    if (patterns.some(p => p.test(userText))) return meal;
  }
  return null;
};

export const mealFromLocalTime = (d: Date): Meal => {
  const hour = d.getHours();
  const minute = d.getMinutes();
  const hhmm = hour * 60 + minute;

  const inRange = (startH: number, startM: number, endH: number, endM: number) => {
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;
    return hhmm >= start && hhmm <= end;
  };

  if (inRange(5, 0, 10, 59)) return 'Breakfast';
  if (inRange(11, 0, 15, 59)) return 'Lunch';
  if (inRange(16, 0, 21, 59)) return 'Dinner';
  return 'Snack';
};

const hourMinuteInTimeZone = (d: Date, timeZone: string): { hour: number; minute: number } | null => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const h = parts.find(p => p.type === 'hour')?.value;
    const m = parts.find(p => p.type === 'minute')?.value;
    const hour = h ? Number(h) : NaN;
    const minute = m ? Number(m) : NaN;
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { hour, minute };
  } catch {
    return null;
  }
};

export const mealFromLocalTimeWithZone = (d: Date, timeZone: string): Meal => {
  const hm = hourMinuteInTimeZone(d, timeZone);
  if (!hm) return mealFromLocalTime(d);
  const hhmm = hm.hour * 60 + hm.minute;

  const inRange = (startH: number, startM: number, endH: number, endM: number) => {
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;
    return hhmm >= start && hhmm <= end;
  };

  if (inRange(5, 0, 10, 59)) return 'Breakfast';
  if (inRange(11, 0, 15, 59)) return 'Lunch';
  if (inRange(16, 0, 21, 59)) return 'Dinner';
  return 'Snack';
};

export const deterministicMealLabel = (userText: string, datetimeLocal: Date, timeZone?: string): Meal => {
  return (
    mealFromTextKeyword(userText) ??
    (timeZone ? mealFromLocalTimeWithZone(datetimeLocal, timeZone) : mealFromLocalTime(datetimeLocal))
  );
};
