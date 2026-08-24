import { useEffect, useState } from 'react';
import type { FirstFlight } from '../transport/useFlightStatus';
import { useFlightStatus } from '../transport/useFlightStatus';
import type { FlightStatus } from '../api/flightStatus';

const CHECKIN_WINDOW_MS = 24 * 60 * 60 * 1000;

function pad(n: number, len = 2): string {
  return String(Math.max(0, n)).padStart(len, '0');
}

function FlapGroup({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-[3px]">
        {value.split('').map((ch, i) => (
          <span key={i} className="flap-card">
            <span key={ch} className="flap-digit">
              {ch}
            </span>
          </span>
        ))}
      </div>
      <span className="text-[9px] uppercase tracking-[0.15em] text-[#005BAE] mt-1 font-semibold">
        {label}
      </span>
    </div>
  );
}

function statusChip(status: FlightStatus | null): { text: string; tone: string } | null {
  if (!status || !status.found) return { text: 'Volgens dienstregeling', tone: 'neutral' };
  switch (status.status) {
    case 'cancelled':
      return { text: 'Geannuleerd', tone: 'bad' };
    case 'active':
      return { text: 'Onderweg', tone: 'ok' };
    case 'landed':
      return { text: 'Geland', tone: 'ok' };
    default:
      break;
  }
  if (status.delayMinutes && status.delayMinutes > 0) {
    return { text: `Vertraging +${status.delayMinutes}m`, tone: 'warn' };
  }
  return { text: 'Op tijd', tone: 'ok' };
}

const TONE: Record<string, string> = {
  neutral: 'bg-[#f0f4f9] text-[#404752]',
  ok: 'bg-green-50 text-green-700',
  warn: 'bg-amber-50 text-amber-700',
  bad: 'bg-red-50 text-red-600',
};

export function TripCountdown({ firstFlight }: { firstFlight: FirstFlight | null }) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = firstFlight ? firstFlight.date.getTime() : 0;
  const diff = target ? target - now.getTime() : 0;
  const inWindow = !!firstFlight && diff > 0 && diff <= CHECKIN_WINDOW_MS;
  const { status } = useFlightStatus(firstFlight, inWindow);

  if (!firstFlight || diff <= 0) return null;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  const flightNo = firstFlight.flight.flightNumber || '';
  const route = [firstFlight.flight.fromIata, firstFlight.flight.toIata]
    .filter(Boolean)
    .join('→');
  const chip = inWindow ? statusChip(status) : null;

  return (
    <div className="flex flex-col items-center leading-none">
      <div className="flex items-center gap-2">
        {/* Compact (mobile) */}
        <span className="flex items-center gap-1.5 text-[#001a33] font-semibold sm:hidden">
          <span aria-hidden>✈</span>
          {flightNo && <span className="text-[#005BAE]">{flightNo}</span>}
          <span className="tabular-nums">
            {days}d {hours}u {pad(minutes)}
          </span>
        </span>

        {/* Split-flap board (desktop) */}
        <div className="hidden sm:flex items-end gap-3">
          <FlapGroup value={pad(days, days >= 100 ? 3 : 2)} label="Dagen" />
          <span className="text-[#005BAE] text-xl font-bold pb-4">:</span>
          <FlapGroup value={pad(hours)} label="Uren" />
          <span className="text-[#005BAE] text-xl font-bold pb-4">:</span>
          <FlapGroup value={pad(minutes)} label="Minuten" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1 h-4">
        {route && (
          <span className="text-[10px] text-[#717783] font-medium hidden sm:inline">
            {route}
          </span>
        )}
        {chip && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TONE[chip.tone]}`}
          >
            {chip.text}
          </span>
        )}
        {inWindow && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
            Inchecken kan nu
          </span>
        )}
      </div>
    </div>
  );
}
