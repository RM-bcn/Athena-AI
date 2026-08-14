export type ActiveTab = 'itinerary' | 'quick-help' | 'chat' | 'settings' | 'support' | 'login' | 'not-found' | 'profile' | 'requests';
export type ChatSubTab = 'current' | 'history' | 'favorites';

export interface UserAccount {
  username: string;
  email: string;
  name: string;
  avatar: string;
  role: 'owner' | 'member';
  tripCode: string;
  nickname?: string;
  avatarUrl?: string;
  updatedAt?: string;
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

export type DayPlanItemType = 'activity' | 'dining' | 'tip' | 'transport' | 'checkin' | 'checkout';

export interface DayPlanItem {
  id: string;
  type: DayPlanItemType;
  text: string;
  /** Optionele tijd (HH:mm) voor deze activiteit / dit record. */
  time?: string;
  /** Beschermde records (ferry, hotel-inchecken/uitchecken) worden automatisch
   *  uit de verblijfs-/transportdata gezet en mogen niet per ongeluk worden
   *  verwijderd of overschreven wanneer je de dagplanning bewerkt. */
  protected?: boolean;
}

export interface DayPlan {
  day: number;            // lokale dag-index in de stop (0 = aankomstdag)
  title: string;
  items: DayPlanItem[];
  // Legacy/compat: de server kan deze ook teruggeven; de client normaliseert
  // deze velden bij het laden naar items.
  activities?: string[];
  dining?: string;
  tips?: string[];
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
  checkIn?: string;     // YYYY-MM-DD
  checkOut?: string;    // YYYY-MM-DD
  island?: string;      // eiland voor dropdown + kaartje
  pricePerNight?: number;
  address?: string;     // straat + huisnummer, postcode, plaats
  checkInTime?: string; // bv. 15:00
  checkOutTime?: string;// bv. 11:00
  link?: string;        // URL (Booking/Airbnb)
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
  sessionId?: string;
  savedAt?: string;
  content: string;
  cards?: TravelCardData[];
  quickButtons?: { label: string; action: string }[];
  sources?: { title: string; url: string }[];
  attachment?: {
    name: string;
    type: string;
    url?: string;
    isImage?: boolean;
  };
}

export interface ChatFavorite {
  id: string;
  content: string;
  senderName?: string;
  timestamp?: string;
  savedAt?: string;
  sources?: { title: string; url: string }[];
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

export interface TripRequest {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  style: string;
  tripCode: string;
  stays: IslandStay[];
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
}

export interface ResetRequestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  error?: string;
}
