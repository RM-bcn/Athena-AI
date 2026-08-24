// Live flight status via AviationStack (https://aviationstack.com).
// Used by GET /api/flights/status to show real delays / gate info for the
// first flight in the header countdown. Free tier notes:
//   - 100 requests / month, so we cache aggressively (5 min per query).
//   - Some free plans only allow HTTP; we attempt HTTPS and, on a protocol
//     error, gracefully fall back to a "no data" result so the UI shows the
//     scheduled time instead of crashing.

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

interface CacheEntry {
  at: number;
  data: FlightStatus;
}

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;

function cacheKey(flightIata?: string, depIata?: string, depDate?: string): string {
  return `${flightIata || ''}|${depIata || ''}|${depDate || ''}`;
}

export async function getFlightStatus(opts: {
  flightIata?: string;
  depIata?: string;
  depDate?: string;
}): Promise<FlightStatus> {
  const key = cacheKey(opts.flightIata, opts.depIata, opts.depDate);
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.data;
  }

  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    const result: FlightStatus = { found: false, reason: 'no_key' };
    CACHE.set(key, { at: Date.now(), data: result });
    return result;
  }

  let result: FlightStatus;
  try {
    result = await parseAviationStack(apiKey, opts.flightIata, opts.depIata, opts.depDate);
  } catch (err: any) {
    result = { found: false, reason: 'error' };
  }

  CACHE.set(key, { at: Date.now(), data: result });
  return result;
}

async function parseAviationStack(
  apiKey: string,
  flightIata?: string,
  depIata?: string,
  depDate?: string
): Promise<FlightStatus> {
  const tryUrl = (proto: 'https' | 'http') => {
    const params = new URLSearchParams({ access_key: apiKey });
    if (flightIata) params.set('flight_iata', flightIata);
    if (depIata) params.set('dep_iata', depIata);
    return `${proto}://api.aviationstack.com/v1/flights?${params.toString()}`;
  };

  const attempt = async (proto: 'https' | 'http'): Promise<any | null> => {
    try {
      const resp = await fetch(tryUrl(proto));
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  };

  const json = (await attempt('https')) ?? (await attempt('http'));
  if (!json) return { found: false, reason: 'unreachable' };
  if (json.error) {
    const code = (json.error as any).code ?? json.error.type ?? 'error';
    return { found: false, reason: `aviationstack_${code}` };
  }

  const data: any[] = json.data || [];
  if (!data.length) return { found: false, reason: 'no_match' };

  let flight = data[0];
  if (depDate) {
    const match = data.find((f) => (f.flight_date || '').startsWith(depDate));
    if (match) flight = match;
  }

  const dep = flight.departure || {};
  const arr = flight.arrival || {};
  return {
    found: true,
    status: flight.flight_status,
    scheduledDep: dep.scheduled || undefined,
    estimatedDep: dep.estimated || undefined,
    delayMinutes: typeof dep.delay === 'number' ? dep.delay : undefined,
    gate: dep.gate || undefined,
    terminal: dep.terminal || undefined,
    depIata: dep.iata || undefined,
    arrIata: arr.iata || undefined,
    live: typeof flight.live === 'boolean' ? flight.live : undefined,
  };
}
