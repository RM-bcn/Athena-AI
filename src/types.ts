export type ActiveTab = 'itinerary' | 'quick-help' | 'chat' | 'settings' | 'support' | 'login' | 'not-found';
export type ChatSubTab = 'current' | 'history' | 'favorites';

export interface UserAccount {
  username: string;
  email: string;
  name: string;
  avatar: string;
  role: 'owner' | 'member';
  tripCode: string;
}

export interface IslandStay {
  id: string;
  island: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  nights: number;
  accommodationName?: string;
  notes?: string;
}

export interface TripData {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  style: string;
  stays: IslandStay[];
}

export interface TimelineStop {
  id: string;
  days: string;
  island: string;
  isActive?: boolean;
  dateRange?: string;
}

export interface ActivityChip {
  id: string;
  label: string;
}

export interface DailyItinerary {
  dayNumber: number;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  ferryInfo?: string;
  locationInfo?: string;
  diningInfo?: string;
  chips?: ActivityChip[];
  isActive?: boolean;
}

export interface Accommodation {
  id: string;
  name: string;
  location: string;
  status: 'CONFIRMED' | 'PAST STAY' | 'PENDING';
  image: string;
}

export interface LocalTip {
  id: string;
  text: string;
  highlight?: boolean;
}

export interface WeatherInfo {
  location: string;
  temp: number;
  unit: string;
  condition: string;
  sunrise?: string;
  sunset?: string;
}

export interface TravelCardData {
  id: string;
  days: string;
  title: string;
  description: string;
  image: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  senderName?: string;
  avatar?: string;
  timestamp: string;
  content: string;
  cards?: TravelCardData[];
  quickButtons?: { label: string; action: string }[];
}

export interface FerryAlternative {
  type: string;
  operator: string;
  departure: string;
  arrival: string;
  price: string;
  notes: string;
}

export interface FerryResolution {
  status: string;
  options: FerryAlternative[];
  recommendedHotel: string;
  advice: string;
}
