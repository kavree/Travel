export interface Activity {
  time: string;
  description: string;
  locationName: string;
}

export interface Meal {
  time: string;
  name: string;
  locationName: string;
}

export interface Accommodation {
  name: string;
  locationName: string;
}

export interface DayPlan {
  day: number;
  theme: string;
  activities: Activity[];
  lunch: Meal | null;
  afternoonActivities?: Activity[]; // Optional as per some structures
  dinner: Meal | null;
  accommodation: Accommodation | null;
}

export interface TripPlan {
  tripTitle: string;
  days: DayPlan[];
}

// Enum for Trip Styles
export enum TripStyle {
  NATURE = "เที่ยวธรรมชาติ", // Nature Trip
  CAFE = "สายชิลคาเฟ่", // Cafe Hopping
  ADVENTURE = "ลุยหนักธรรมชาติ", // Adventure / Heavy Nature
  CITY = "เที่ยวในเมือง", // City Tour
}

// For Google Maps
export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface GeocodedLocation {
  locationName: string;
  position: LatLngLiteral | null;
  day: number;
  type: 'activity' | 'lunch' | 'dinner' | 'accommodation' | 'afternoon-activity';
  title: string; // e.g., activity description, meal name, or accommodation name
  time?: string; // Optional time for activities/meals
}
