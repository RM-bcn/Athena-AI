// Ferry live-status helpers.
// Self-contained in src/transport/ so it stays clear of the accommodation
// matcher and other agents' work. No API keys: the live vessel map uses
// VesselFinder's free embed (public IMO numbers), disruptions come from
// Blue Star Ferries' own "Itineraries Modifications" pages (fetched by the
// server), and the schedule status is derived from the user's own booking
// data compared against the current wall-clock time in Greece.

import type { TransportEntry } from './types';

// ---------------------------------------------------------------------------
// Blue Star Ferries fleet (public IMO numbers)
// ---------------------------------------------------------------------------
// IMO numbers are public ship identifiers published by IMO and shown on every
// AIS listing. Vessel names as spelled by Blue Star Ferries ("Myconos").
export interface BlueStarVessel {
  /** Canonical display name (Blue Star spelling). */
  name: string;
  /** Public IMO number, used for the VesselFinder live embed. */
  imo: string;
  /** Extra spellings/nicknames to match user input against. */
  aliases: string[];
}

export const BLUE_STAR_FLEET: BlueStarVessel[] = [
  { name: 'Blue Star 1', imo: '9197105', aliases: ['blue star 1'] },
  { name: 'Blue Star 2', imo: '9207584', aliases: ['blue star 2'] },
  { name: 'Blue Star Chios', imo: '9215555', aliases: ['blue star chios'] },
  { name: 'Blue Star Delos', imo: '9565039', aliases: ['blue star delos', 'delos'] },
  { name: 'Blue Star Myconos', imo: '9208679', aliases: ['blue star myconos', 'blue star mykonos'] },
  { name: 'Blue Star Naxos', imo: '9241786', aliases: ['blue star naxos', 'naxos'] },
  { name: 'Blue Star Paros', imo: '9241774', aliases: ['blue star paros', 'paros'] },
  { name: 'Blue Star Patmos', imo: '9565041', aliases: ['blue star patmos'] },
  { name: 'Diagoras', imo: '8916126', aliases: ['diagoras'] },
];

/** Normalize a vessel name for matching: lowercase, no diacritics, collapsed spaces. */
export function normalizeVesselName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isBlueStarOperator(operator?: string): boolean {
  return /blue\s*star/i.test(operator || '');
}

/**
 * Resolve a Blue Star vessel from the user's input. Tries an exact alias
 * match first, then a partial match (so "Blue Star Delos" or "Delos" both
 * work). Returns null when no vessel can be identified.
 */
export function findBlueStarVessel(
  vesselName?: string,
  operator?: string
): BlueStarVessel | null {
  if (!vesselName || !vesselName.trim()) return null;
  if (operator && !isBlueStarOperator(operator)) return null;

  const input = normalizeVesselName(vesselName);
  if (!input) return null;

  for (const vessel of BLUE_STAR_FLEET) {
    const aliases = vessel.aliases.map(normalizeVesselName);
    if (aliases.includes(input)) return vessel;
  }

  for (const vessel of BLUE_STAR_FLEET) {
    const aliases = vessel.aliases.map(normalizeVesselName);
    for (const alias of aliases) {
      if (alias.length >= 4 && (alias.includes(input) || input.includes(alias))) {
        return vessel;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Schedule-derived status (based on Greek wall-clock time)
// ---------------------------------------------------------------------------

export type FerryPhase = 'unknown' | 'upcoming' | 'boarding' | 'underway' | 'arrived';

export interface FerryScheduleStatus {
  phase: FerryPhase;
  /** Short label, e.g. "Onderweg". */
  label: string;
  /** Longer human explanation, in Dutch. */
  detail: string;
  tone: 'neutral' | 'ok' | 'warn';
}

/** Current wall-clock time in Greece as a plain Date (for naive comparisons). */
export function athensNow(): Date {
  const parts = new Date().toLocaleString('en-US', { timeZone: 'Europe/Athens' });
  return new Date(parts);
}

const BOARDING_WINDOW_MINUTES = 45;

/** Parse "YYYY-MM-DD" + "HH:mm" into a naive Date interpreted as Athens time. */
function combineAthensDateTime(dateStr: string, timeStr: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeStr || '');
  if (!dateMatch || !timeMatch) return null;
  const y = Number(dateMatch[1]);
  const m = Number(dateMatch[2]);
  const d = Number(dateMatch[3]);
  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Human countdown in Dutch, e.g. "2 u 15 min", "45 min", "3 dagen". */
export function formatCountdown(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes <= 0) return '0 min';
  if (minutes >= 60 * 36) {
    return `${Math.round(minutes / (60 * 24))} dagen`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours} u ${rest} min` : `${hours} u`;
  }
  return `${minutes} min`;
}

/**
 * Derive a status from the user's booked times compared with the current time
 * in Greece. This is schedule-based (never claims to know real delays); the
 * live picture comes from the embedded vessel map and the disruptions feed.
 */
export function getScheduleStatus(
  entry: TransportEntry,
  now: Date = athensNow()
): FerryScheduleStatus {
  const dep = combineAthensDateTime(entry.date, entry.departureTime || '');
  if (!dep) {
    return {
      phase: 'unknown',
      label: 'Geen schema-info',
      detail: 'Vul de vertrek- en aankomsttijd in om een schema-status te zien.',
      tone: 'neutral',
    };
  }

  let arr = combineAthensDateTime(entry.date, entry.arrivalTime || '');
  if (!arr) {
    arr = new Date(dep.getTime() + 5 * 60 * 60 * 1000);
  } else if (arr.getTime() <= dep.getTime()) {
    arr = new Date(dep.getTime() + (arr.getTime() - dep.getTime()) + 24 * 60 * 60 * 1000);
  }

  const timeUntilDep = dep.getTime() - now.getTime();
  const timeUntilArr = arr.getTime() - now.getTime();

  const depLabel = `${String(dep.getHours()).padStart(2, '0')}:${String(dep.getMinutes()).padStart(2, '0')}`;
  const arrLabel = `${String(arr.getHours()).padStart(2, '0')}:${String(arr.getMinutes()).padStart(2, '0')}`;

  if (timeUntilArr <= 0) {
    return {
      phase: 'arrived',
      label: 'Gearriveerd',
      detail: `Volgens de dienstregeling aangekomen om ${arrLabel} (Griekse tijd).`,
      tone: 'neutral',
    };
  }

  if (timeUntilDep <= 0) {
    return {
      phase: 'underway',
      label: 'Onderweg',
      detail: `Volgens de dienstregeling aan boord; aankomst voorzien om ${arrLabel} (Griekse tijd).`,
      tone: 'ok',
    };
  }

  const boardingAt = dep.getTime() - BOARDING_WINDOW_MINUTES * 60 * 1000;
  if (now.getTime() >= boardingAt) {
    return {
      phase: 'boarding',
      label: 'Instappen',
      detail: `Vertrek voorzien om ${depLabel}; nog ${formatCountdown(timeUntilDep)}. Wees op tijd bij de gate.`,
      tone: 'warn',
    };
  }

  return {
    phase: 'upcoming',
    label: 'Gepland',
    detail: `Vertrek volgens dienstregeling om ${depLabel}; over ${formatCountdown(timeUntilDep)} (Griekse tijd).`,
    tone: 'ok',
  };
}

// ---------------------------------------------------------------------------
// External links & embeds (no API keys)
// ---------------------------------------------------------------------------

export function buildVesselFinderEmbedUrl(imo: string): string {
  const params = new URLSearchParams({
    zoom: '9',
    lat: '37.45', // Aegean fallback center; the embed re-centers on the vessel
    lon: '24.95',
    width: '100%',
    height: '100%',
    names: 'true',
    imo,
    track: 'true',
    clicktoact: 'false',
    store_pos: 'true',
  });
  return `https://www.vesselfinder.com/aismap?${params.toString()}`;
}

export function buildMarineTrafficSearchUrl(vesselName: string): string {
  const keyword = encodeURIComponent(vesselName.trim() || 'Blue Star Ferries');
  return `https://www.marinetraffic.com/en/ais/index/search/all?keyword=${keyword}`;
}

export const BLUE_STAR_URL = 'https://www.bluestarferries.com/en-gb';
