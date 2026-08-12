import { IslandStay, Accommodation } from '../types';

export type LinkState = 'linked' | 'suggested' | 'unlinked';

export interface MatchResult {
  booking: Accommodation;
  score: number;
  overlapDays: number;
  exactHotelMatch: boolean;
}

export interface StayLinkInfo {
  state: LinkState;
  matchedBooking?: Accommodation;
  suggestedBooking?: Accommodation;
}

const CITY_ALIASES: Record<string, string[]> = {
  athene: ['athene', 'athens', 'glyfada', 'glyfada (athene)', 'glyfada athene'],
  naxos: ['naxos', 'naxos stad', 'naxos stad (naxos)', 'agios georgios', 'agios georgios (naxos)'],
  milos: ['milos', 'pollonia', 'pollonia (milos)', 'adamas', 'adamas (milos)'],
  paros: ['paros', 'parikia', 'parikia (paros)', 'naoussa', 'naoussa (paros)'],
  koufonisia: ['koufonisia', 'koufonisi', 'koufonisia (koufonisia)'],
  mykonos: ['mykonos', 'mykonos stad', 'mykonos town', 'chora (mykonos)'],
  santorini: ['santorini', 'fira', 'fira (santorini)', 'oia', 'oia (santorini)', 'kamari', 'kamari (santorini)'],
};

function normalizeCity(city: string): string {
  const lower = city.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some(a => lower.includes(a))) {
      return canonical;
    }
  }
  return lower;
}

function citiesMatch(city1: string, city2: string): boolean {
  return normalizeCity(city1) === normalizeCity(city2);
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateOverlapDays(start1: string, end1: string, start2: string, end2: string): number {
  const s1 = parseDate(start1);
  const e1 = parseDate(end1);
  const s2 = parseDate(start2);
  const e2 = parseDate(end2);

  const overlapStart = s1 > s2 ? s1 : s2;
  const overlapEnd = e1 < e2 ? e1 : e2;

  if (overlapStart > overlapEnd) return 0;

  const diffTime = overlapEnd.getTime() - overlapStart.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function hotelNamesMatch(hotel1: string, hotel2: string): boolean {
  const n1 = hotel1.toLowerCase().trim();
  const n2 = hotel2.toLowerCase().trim();
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

export function findMatches(
  stay: IslandStay,
  bookings: Accommodation[]
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const booking of bookings) {
    if (!citiesMatch(stay.island, booking.location)) continue;

    const bookingCheckIn = booking.checkIn;
    const bookingCheckOut = booking.checkOut;

    if (!bookingCheckIn || !bookingCheckOut) continue;

    const overlap = dateOverlapDays(stay.startDate, stay.endDate, bookingCheckIn, bookingCheckOut);
    if (overlap === 0) continue;

    const exactHotelMatch = stay.accommodationName
      ? hotelNamesMatch(stay.accommodationName, booking.name)
      : false;

    let score = overlap * 10;
    if (exactHotelMatch) score += 1000;
    if (booking.status === 'CONFIRMED') score += 100;

    results.push({
      booking,
      score,
      overlapDays: overlap,
      exactHotelMatch,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function getStayLinkInfo(
  stay: IslandStay,
  bookings: Accommodation[],
  stayBookingLinks: Record<string, string>
): StayLinkInfo {
  const linkedBookingId = stayBookingLinks[stay.id];
  const linkedBooking = linkedBookingId
    ? bookings.find(b => b.id === linkedBookingId)
    : undefined;

  if (linkedBooking) {
    return { state: 'linked', matchedBooking: linkedBooking };
  }

  const matches = findMatches(stay, bookings);
  if (matches.length > 0) {
    return { state: 'suggested', suggestedBooking: matches[0].booking };
  }

  return { state: 'unlinked' };
}

export function getBestMatchForBooking(
  booking: Accommodation,
  stays: IslandStay[]
): { stay: IslandStay; score: number } | null {
  const matches = getMatchingStaysForBooking(booking, stays);
  return matches.length > 0 ? matches[0] : null;
}

export function getMatchingStaysForBooking(
  booking: Accommodation,
  stays: IslandStay[]
): { stay: IslandStay; score: number }[] {
  const matches: { stay: IslandStay; score: number }[] = [];

  for (const stay of stays) {
    if (!citiesMatch(stay.island, booking.location)) continue;

    const bookingCheckIn = booking.checkIn;
    const bookingCheckOut = booking.checkOut;

    if (!bookingCheckIn || !bookingCheckOut) continue;

    const overlap = dateOverlapDays(stay.startDate, stay.endDate, bookingCheckIn, bookingCheckOut);
    if (overlap === 0) continue;

    const exactHotelMatch = stay.accommodationName
      ? hotelNamesMatch(stay.accommodationName, booking.name)
      : false;

    let score = overlap * 10;
    if (exactHotelMatch) score += 1000;
    if (booking.status === 'CONFIRMED') score += 100;

    matches.push({ stay, score });
  }

  return matches.sort((a, b) => b.score - a.score);
}

export { citiesMatch, normalizeCity, dateOverlapDays, hotelNamesMatch };