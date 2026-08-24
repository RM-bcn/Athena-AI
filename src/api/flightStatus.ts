import { getToken } from '../utils/authToken';

export interface FlightStatus {
  found: boolean;
  reason?: string;
  status?: string; // scheduled | active | landed | cancelled
  scheduledDep?: string; // ISO
  estimatedDep?: string; // ISO
  delayMinutes?: number;
  gate?: string;
  terminal?: string;
  depIata?: string;
  arrIata?: string;
  live?: boolean;
}

/** Normalize a ticket flight number ("KL 1571" -> "KL1571") for AviationStack. */
export function normalizeFlightIata(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleaned || undefined;
}

export async function fetchFlightStatus(opts: {
  flightIata?: string;
  depIata?: string;
  depDate?: string;
}): Promise<FlightStatus> {
  const params = new URLSearchParams();
  if (opts.flightIata) params.set('flightIata', opts.flightIata);
  if (opts.depIata) params.set('depIata', opts.depIata);
  if (opts.depDate) params.set('depDate', opts.depDate);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`/api/flights/status?${params.toString()}`, { headers });
    if (!res.ok) return { found: false, reason: `http_${res.status}` };
    return (await res.json()) as FlightStatus;
  } catch {
    return { found: false, reason: 'network' };
  }
}
