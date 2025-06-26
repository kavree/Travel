import { TripStyle } from './types';

export const APP_TITLE = "Smart Travel Planner";
export const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";

export const TRIP_STYLES_OPTIONS: { value: TripStyle; label: string }[] = [
  { value: TripStyle.NATURE, label: "🌿 เที่ยวธรรมชาติ (Nature)" },
  { value: TripStyle.CAFE, label: "☕ สายชิลคาเฟ่ (Cafe Hopping)" },
  { value: TripStyle.ADVENTURE, label: "🏞️ ลุยหนักธรรมชาติ (Adventure)" },
  { value: TripStyle.CITY, label: "🏙️ เที่ยวในเมือง (City Tour)" },
];

export const API_KEY_ERROR_MESSAGE = "API key not configured. Please set the API_KEY environment variable.";
export const GOOGLE_MAPS_API_KEY_ERROR_MESSAGE = "Google Maps API key not configured. Please set the GOOGLE_MAPS_API_KEY environment variable for map features.";
export const GENERIC_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";
export const LOCAL_STORAGE_TRIP_PLAN_KEY = 'smartTravelPlannerSavedPlan';

export const DAY_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF']; // Colors for map polylines per day
