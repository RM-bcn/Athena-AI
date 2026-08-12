// Transport logic: leg derivation, city aliasing and auto-linking.
// Self-contained — depends only on the public IslandStay type and our own
// transport types, so it stays isolated from the accommodation-matcher work.

import type { IslandStay } from '../types';
import type { TransportEntry, TransportLeg, LinkResult } from './types';

// ---------------------------------------------------------------------------
// City aliasing
// ---------------------------------------------------------------------------
// A small alias map covering Greek is the spec's fallback because, on the
// clean origin/main base used by this branch, the accommodation matcher's
// alias helper does not yet exist. If a canonical alias helper gets merged in
// another feature branch, transportLogic keeps working independently.

const CITY_ALIASES: Record<string, string[]> = {
  athene: ['athene', 'athens', 'piraeus', 'pireas', 'athina', 'glyfada'],
  naxos: ['naxos', 'naxos stad', 'agios georgios', 'chora (naxos)'],
  milos: ['milos', 'pollonia', 'adamas'],
  paros: ['paros', 'parikia', 'naoussa'],
  koufonisia: ['koufonisia', 'koufonisi', 'an koufonisi'],
  mykonos: ['mykonos', 'mykonos town', 'chora (mykonos)'],
  santorini: ['santorini', 'fira', 'oia', 'kamari'],
};

export function normalizeCity(city: string): string {
  if (!city) return '';
  const lower = city.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((a) => lower === a || lower.includes(a))) {
      return canonical;
    }
  }
  return lower;
}

export function citiesMatch(city1: string, city2: string): boolean {
  return normalizeCity(city1) === normalizeCity(city2);
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatCalendarDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

/** Returns the zero-based day offset of dateStr from the first stay's start. */
export function dayOffsetFromTripStart(tripStart: string, dateStr: string): number {
  const start = parseDate(tripStart);
  start.setHours(0, 0, 0, 0);
  const target = parseDate(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Compute which (stay, day index within stay) a given date belongs to.
 * day index 0 = arrival day of a stay. Returns null if outside the trip.
 */
export function locateDateInStays(
  stays: IslandStay[],
  dateStr: string
): { stay: IslandStay; stayIndex: number; dayIdx: number; globalDay: number } | null {
  if (!stays.length || !dateStr) return null;
  const target = parseDate(dateStr);
  target.setHours(0, 0, 0, 0);

  // Reuse the itinerary view's global-day numbering:
  //   globalDay = stayIdx * 3 + dayIdx + 1   (matches MyItineraryView.tsx)
  for (let stayIdx = 0; stayIdx < stays.length; stayIdx++) {
    const stay = stays[stayIdx];
    const start = parseDate(stay.startDate);
    start.setHours(0, 0, 0, 0);
    const end = parseDate(stay.endDate);
    end.setHours(0, 0, 0, 0);
    if (target < start || target > end) continue;
    const dayIdx = Math.round((target.getTime() - start.getTime()) / 86_400_000);
    if (dayIdx < 0 || dayIdx >= stay.nights) {
      // Falls on the check-out day but past the booked nights range: attach to
      // the last day of this stay so the row still renders.
      return { stay, stayIndex: stayIdx, dayIdx: stay.nights - 1, globalDay: stayIdx * 3 + (stay.nights - 1) + 1 };
    }
    return { stay, stayIndex: stayIdx, dayIdx, globalDay: stayIdx * 3 + dayIdx + 1 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Leg derivation
// ---------------------------------------------------------------------------
// Leg i connects stay[i] -> stay[i+1], with date = stay[i+1].startDate.
// (Spec section 2 uses stay[i+1].checkInDate which for this app is startDate.)

export function deriveLegs(stays: IslandStay[]): TransportLeg[] {
  const legs: TransportLeg[] = [];
  if (!stays || stays.length < 2) return legs;
  for (let i = 0; i < stays.length - 1; i++) {
    const from = stays[i];
    const to = stays[i + 1];
    if (!from || !to || !to.startDate) continue;
    legs.push({
      id: `leg-${i + 1}-${from.id}->${to.id}`,
      index: i,
      fromCity: from.island,
      toCity: to.island,
      date: to.startDate,
      fromStayId: from.id,
      toStayId: to.id,
    });
  }
  return legs;
}

// ---------------------------------------------------------------------------
// Auto-linking
// ---------------------------------------------------------------------------

export interface AutoLinkOutcome {
  /** Resolved leg id, or undefined when not uniquely matched. */
  linkedLegId?: string;
  /** Why the entry is linked (matched) or not (zero/multiple). */
  result: LinkResult;
  /** Suggested leg ids when 0 matches but a near-miss was found, or when
   *  multiple matches occurred. */
  suggestedLegIds: string[];
}

export function autoLinkEntry(
  entry: TransportEntry,
  legs: TransportLeg[]
): AutoLinkOutcome {
  const matches = legs.filter((leg) =>
    leg.date === entry.date &&
    citiesMatch(leg.fromCity, entry.from) &&
    citiesMatch(leg.toCity, entry.to)
  );

  if (matches.length === 1) {
    return { result: 'linked', linkedLegId: matches[0].id, suggestedLegIds: [] };
  }

  // Zero or multiple matches: keep unlinked but build suggestions so the UI
  // can hint the user. Suggestions are the matched legs (when ambiguous) or
  // legs that share the date plus at least one endpoint (near-misses).
  const suggestions = matches.length > 1
    ? matches.map((l) => l.id)
    : legs
        .filter((leg) => {
          if (leg.date !== entry.date) return false;
          const cityMatches =
            citiesMatch(leg.fromCity, entry.from) ||
            citiesMatch(leg.toCity, entry.to) ||
            citiesMatch(leg.fromCity, entry.to) ||
            citiesMatch(leg.toCity, entry.from);
          return cityMatches;
        })
        .map((l) => l.id);

  return {
    result: 'unlinked',
    suggestedLegIds: suggestions,
  };
}

/** Resolve effective linked leg id: explicit override wins, else auto-link. */
export function resolveLegId(
  entry: TransportEntry,
  legs: TransportLeg[]
): AutoLinkOutcome {
  if (entry.linkedLegId) {
    const exists = legs.some((l) => l.id === entry.linkedLegId);
    if (exists) return { result: 'linked', linkedLegId: entry.linkedLegId, suggestedLegIds: [] };
  }
  return autoLinkEntry(entry, legs);
}

/** Earliest departure time across a list of entries (used when stacking icons). */
export function earliestEntry(entries: TransportEntry[]): TransportEntry | undefined {
  if (!entries.length) return undefined;
  return [...entries].sort((a, b) => {
    const ta = a.departureTime || '99:99';
    const tb = b.departureTime || '99:99';
    if (ta === tb) {
      return (a.arrivalTime || '99:99').localeCompare(b.arrivalTime || '99:99');
    }
    return ta.localeCompare(tb);
  })[0];
}

/** Translate a TransportType to a short Dutch label. */
export function transportTypeLabel(type: TransportEntry['type']): string {
  switch (type) {
    case 'ferry': return 'Ferry';
    case 'flight': return 'Vlucht';
    case 'transfer': return 'Transfer';
    default: return 'Transport';
  }
}
