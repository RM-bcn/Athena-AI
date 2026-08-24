import { useEffect, useRef, useState } from 'react';
import type { TransportEntry } from './types';
import { fetchFlightStatus, FlightStatus, normalizeFlightIata } from '../api/flightStatus';

export interface FirstFlight {
  /** The moment the clock counts down to. */
  date: Date;
  /** Present only when the target is an actual flight (enables live status). */
  flight?: TransportEntry;
}

const POLL_MS = 3 * 60 * 1000;

/**
 * Fetches live flight status, but ONLY while we are inside the 24h check-in
 * window (to conserve the AviationStack quota). Starts an initial fetch when
 * the window opens and then polls every few minutes. Returns null outside the
 * window or when there is no flight.
 */
export function useFlightStatus(
  firstFlight: FirstFlight | null,
  inWindow: boolean
): { status: FlightStatus | null } {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const startedRef = useRef<string>('');

  useEffect(() => {
    if (!firstFlight) {
      setStatus(null);
      startedRef.current = '';
      return;
    }

    const flight = firstFlight.flight;
    if (!flight) {
      // Target is the trip start, not a flight — no live status lookup.
      setStatus(null);
      startedRef.current = '';
      return;
    }

    const flightIata = normalizeFlightIata(flight.flightNumber);
    const depIata = flight.fromIata ? flight.fromIata.toUpperCase() : undefined;
    const depDate = flight.date;
    const id = `${flightIata || ''}|${depIata || ''}|${depDate}`;

    if (!inWindow) {
      setStatus(null);
      startedRef.current = id;
      return;
    }

    // Already polling this exact flight — don't restart the interval.
    if (startedRef.current === id) return;
    startedRef.current = id;

    let cancelled = false;
    const load = () => {
      fetchFlightStatus({ flightIata, depIata, depDate })
        .then((s) => {
          if (!cancelled) setStatus(s);
        })
        .catch(() => {
          /* keep last status on transient network error */
        });
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [firstFlight, inWindow]);

  return { status };
}
