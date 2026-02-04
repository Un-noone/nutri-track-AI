export interface NutrientTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface NutrientGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  nutrients_total: NutrientTotals;
  source?: 'text' | 'image';
  confidence?: number;
}

export interface FoodEntry {
  id: string;
  user_id?: string;
  logged_at: string; // ISO date string
  raw_text: string;
  meal_label?: string; // Breakfast, Lunch, Dinner, Snack
  items: FoodItem[];
  totals: NutrientTotals;
  image_base64?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ParseResult {
  items: FoodItem[];
  logged_at_iso?: string;
  meal_label?: string;
  needs_clarification: boolean;
  clarification_question?: string;
  confidence_score: number; // 0.0 to 1.0
}

export interface UserSettings {
  theme: 'light' | 'dark';
  unit_system: 'metric' | 'imperial';
}

export type UnitSystem = 'metric' | 'imperial';

// Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// Legacy enums (kept for compatibility)
export enum ImageSize {
  Size_1K = '1K',
  Size_2K = '2K',
  Size_4K = '4K',
}

export enum AspectRatio {
  Ratio_1_1 = '1:1',
  Ratio_2_3 = '2:3',
  Ratio_3_2 = '3:2',
  Ratio_3_4 = '3:4',
  Ratio_4_3 = '4:3',
  Ratio_9_16 = '9:16',
  Ratio_16_9 = '16:9',
  Ratio_21_9 = '21:9',
}
