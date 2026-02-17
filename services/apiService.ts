import {
  ParseResult,
  FoodEntry,
  NutrientGoals,
  UserSettings,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
} from "../types";

// API Base URL - use Render backend in production
const API_BASE_URL = import.meta.env.PROD
  ? "https://nutri-track-ai.onrender.com"
  : "";

// Token storage
let authToken: string | null = localStorage.getItem("auth_token");

const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
};

const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
};

// Helper for API calls
const apiCall = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const fullUrl = `${API_BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401) {
      // Clear token on unauthorized
      setAuthToken(null);
      throw new Error("Unauthorized. Please log in again.");
    }
    throw new Error(errText || `API error (${res.status})`);
  }

  return res.json() as Promise<T>;
};

// ============ Authentication ============

// Backend returns { access_token, token_type, user } format
interface BackendAuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await apiCall<BackendAuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  setAuthToken(response.access_token);
  return { access_token: response.access_token, user: response.user };
};

export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await apiCall<BackendAuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  setAuthToken(response.access_token);
  return { access_token: response.access_token, user: response.user };
};

export const logout = () => {
  setAuthToken(null);
};

export const getCurrentUser = async (): Promise<User> => {
  return apiCall<User>("/api/auth/me");
};

export const isAuthenticated = (): boolean => {
  return !!authToken;
};

// ============ Food Parsing ============

export const parseFoodLog = async (
  text: string,
  currentDateTime: string
): Promise<ParseResult> => {
  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC";

  return apiCall<ParseResult>("/api/parse-food-log", {
    method: "POST",
    body: JSON.stringify({
      text,
      current_datetime: currentDateTime,
      timezone,
    }),
  });
};

export const analyzeFoodImage = async (
  imageFile: File,
  context: string = ""
): Promise<ParseResult> => {
  console.log('[apiService] analyzeFoodImage called with file:', imageFile.name, 'size:', imageFile.size, 'type:', imageFile.type);

  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("context", context);
  formData.append("current_datetime", new Date().toISOString());
  formData.append(
    "timezone",
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC"
  );

  const url = `${API_BASE_URL}/api/analyze-food-image`;
  console.log('[apiService] Sending request to:', url);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authToken ? `Bearer ${authToken}` : "",
    },
    body: formData,
  });

  console.log('[apiService] Response status:', res.status, res.statusText);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error('[apiService] Error response:', errText);
    throw new Error(errText || `API error (${res.status})`);
  }

  const result = await res.json();
  console.log('[apiService] Success response:', result);
  return result as ParseResult;
};

// ============ Food Entries ============

export const getEntries = async (limit: number = 100): Promise<FoodEntry[]> => {
  return apiCall<FoodEntry[]>(`/api/entries?limit=${limit}`);
};

export const createEntry = async (entry: Omit<FoodEntry, "id">): Promise<FoodEntry> => {
  return apiCall<FoodEntry>("/api/entries", {
    method: "POST",
    body: JSON.stringify(entry),
  });
};

export const deleteEntry = async (entryId: string): Promise<void> => {
  await apiCall<{ message: string }>(`/api/entries/${entryId}`, {
    method: "DELETE",
  });
};

// ============ Goals ============

export const getGoals = async (): Promise<NutrientGoals> => {
  return apiCall<NutrientGoals>("/api/goals");
};

export const updateGoals = async (
  goals: NutrientGoals
): Promise<NutrientGoals> => {
  return apiCall<NutrientGoals>("/api/goals", {
    method: "PUT",
    body: JSON.stringify(goals),
  });
};

// ============ Settings ============

export const getSettings = async (): Promise<UserSettings> => {
  return apiCall<UserSettings>("/api/settings");
};

export const updateSettings = async (
  settings: UserSettings
): Promise<UserSettings> => {
  return apiCall<UserSettings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
};

// ============ Health Check ============

export const healthCheck = async (): Promise<{ status: string }> => {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  return res.json();
};
