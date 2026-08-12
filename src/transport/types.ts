// Transport feature data model.
// Kept fully isolated in src/transport/ so it can land alongside the
// accommodation-linking feature without touching shared types.

export type TransportType = 'ferry' | 'flight' | 'transfer' | 'other';

export interface TransportEntry {
  id: string;
  type: TransportType;
  from: string;
  to: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** HH:mm */
  departureTime?: string;
  /** HH:mm */
  arrivalTime?: string;
  operator?: string;
  bookingRef?: string;
  notes?: string;
  /** Optional explicit link to a derived leg id (override of auto-link). */
  linkedLegId?: string;
}

/** Derived from consecutive stays: leg i connects stay[i] -> stay[i+1]. */
export interface TransportLeg {
  id: string;
  index: number;
  fromCity: string;
  toCity: string;
  /** The departure date of this leg = next stay's start date. */
  date: string;
  fromStayId: string;
  toStayId: string;
}

export type LinkResult = 'linked' | 'suggested' | 'unlinked';
