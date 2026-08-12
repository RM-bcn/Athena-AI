import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Anchor, ExternalLink, Info, RefreshCw, Ship, X } from 'lucide-react';
import type { TransportEntry } from './types';
import { TransportIcon } from './TransportIcon';
import { transportTypeLabel } from './transportLogic';
import {
  BLUE_STAR_URL,
  athensNow,
  findBlueStarVessel,
  getScheduleStatus,
  buildMarineTrafficSearchUrl,
  buildVesselFinderEmbedUrl,
  isBlueStarOperator,
} from './ferryData';
import type { FerryScheduleStatus } from './ferryData';

interface DisruptionMatch {
  title: string;
  url: string;
  lastUpdate?: string;
  excerpt: string;
}

interface DisruptionsResponse {
  vessel: string;
  checkedAt: string;
  matches: DisruptionMatch[];
}

interface TransportDetailPopupProps {
  entry: TransportEntry;
  onClose: () => void;
}

const STATUS_STYLES: Record<FerryScheduleStatus['tone'], string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  neutral: 'bg-[#f0f4f9] text-[#404752] border-[#c0c7d3]/40',
};

/**
 * Detail popup shown when clicking a booked ferry on the route connector.
 * Shows the booked schedule, a schedule-derived status (Greek time), any
 * active Blue Star "Itineraries Modifications" for the vessel, and a free
 * live AIS vessel map (VesselFinder embed, no API key).
 */
export const TransportDetailPopup: React.FC<TransportDetailPopupProps> = ({
  entry,
  onClose,
}) => {
  const [now, setNow] = useState<Date>(() => athensNow());
  const [disruptions, setDisruptions] = useState<DisruptionMatch[] | null>(null);
  const [disruptionsLoading, setDisruptionsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(athensNow()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const vessel = findBlueStarVessel(entry.vesselName, entry.operator);
    if (!vessel) return;
    const ctrl = new AbortController();
    setDisruptionsLoading(true);
    const params = new URLSearchParams({ vessel: vessel.name, date: entry.date });
    fetch(`/api/ferry/disruptions?${params.toString()}`, { signal: ctrl.signal })
      .then((res) => {
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !type.includes('application/json')) return null;
        return res.json() as Promise<DisruptionsResponse | null>;
      })
      .then((data) => {
        if (data && Array.isArray(data.matches)) setDisruptions(data.matches);
      })
      .catch(() => {
        /* endpoint not wired up yet (other agent still working) — hide silently */
      })
      .finally(() => setDisruptionsLoading(false));
    return () => ctrl.abort();
  }, [entry.vesselName, entry.operator, entry.date]);

  const status = getScheduleStatus(entry, now);
  const vessel = findBlueStarVessel(entry.vesselName, entry.operator);
  const isBlueStar = isBlueStarOperator(entry.operator) || !!vessel;
  const dateLabel = entry.date
    ? new Date(`${entry.date}T12:00:00`).toLocaleDateString('nl-NL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Datum onbekend';

  const popup = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
          aria-label="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#005BAE] text-white flex items-center justify-center shadow-md">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-wider block">
                {transportTypeLabel(entry.type)}
              </span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33]">
                {entry.from} → {entry.to}
              </h2>
            </div>
          </div>
          <p className="font-['Inter'] text-xs text-[#717783] mt-3 capitalize">{dateLabel}</p>
        </div>

        {/* Status */}
        <div className="mb-5">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${STATUS_STYLES[status.tone]}`}
          >
            {status.phase === 'underway' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <TransportIcon type={entry.type} className="w-3.5 h-3.5" />
            {status.label}
          </span>
          <p className="font-['Inter'] text-xs text-[#404752] mt-2">{status.detail}</p>
          <p className="font-['Inter'] text-[10px] text-[#717783] mt-1">
            Status is afgeleid van jouw dienstregeling en de Griekse tijd; de echte positie zie je op de live kaart.
          </p>
        </div>

        {/* Booked details */}
        <div className="space-y-2 mb-5">
          <DetailRow label="Vertrek" value={entry.departureTime ? `${entry.departureTime} (Griekse tijd)` : '—'} />
          <DetailRow label="Aankomst" value={entry.arrivalTime ? `${entry.arrivalTime} (Griekse tijd)` : '—'} />
          <DetailRow label="Vervoerder" value={entry.operator || '—'} />
          <DetailRow
            label="Schip"
            value={
              vessel ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  {vessel.name}
                  <span className="text-[10px] text-[#717783] font-medium">(IMO {vessel.imo})</span>
                </span>
              ) : (
                entry.vesselName || '—'
              )
            }
          />
          {entry.bookingRef && <DetailRow label="Referentie" value={entry.bookingRef} />}
        </div>

        {/* Blue Star disruptions */}
        {isBlueStar && (
          <div className="mb-5">
            {disruptionsLoading && (
              <p className="font-['Inter'] text-[11px] text-[#717783] flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" /> Actuele mededelingen laden…
              </p>
            )}
            {!disruptionsLoading && disruptions && disruptions.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="font-['Inter'] text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Blue Star mededeling voor {vessel?.name}
                </p>
                {disruptions.slice(0, 2).map((m, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="font-['Inter'] text-[11px] font-semibold text-amber-900">{m.title}</p>
                    <p className="font-['Inter'] text-[11px] text-amber-800/90 leading-snug">{m.excerpt}</p>
                    {m.lastUpdate && (
                      <p className="font-['Inter'] text-[10px] text-amber-700">Laatste update: {m.lastUpdate}</p>
                    )}
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-['Inter'] text-[11px] font-bold text-[#005BAE] hover:underline"
                    >
                      Bekijk details op bluestarferries.com →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live vessel map */}
        {vessel ? (
          <div className="mb-5">
            <p className="font-['Inter'] text-xs font-bold text-[#0b1d2d] mb-2">Live positie (AIS)</p>
            <div className="rounded-2xl overflow-hidden border border-[#c0c7d3]/40 bg-[#eef3f9]">
              <iframe
                title={`Live positie ${vessel.name}`}
                src={buildVesselFinderEmbedUrl(vessel.imo)}
                className="w-full"
                style={{ height: 280, border: 0 }}
                loading="lazy"
                allowFullScreen
              />
            </div>
            <p className="font-['Inter'] text-[10px] text-[#717783] mt-1.5">
              Kaart via VesselFinder (gratis, zonder API-sleutel). Posities zijn AIS-data met vertraging.
            </p>
          </div>
        ) : (
          isBlueStar && (
            <div className="mb-5 rounded-2xl border border-[#c0c7d3]/40 bg-[#f0f4f9] p-3">
              <p className="font-['Inter'] text-[11px] text-[#404752]">
                Voeg bij het transport het <span className="font-bold">schip</span> toe (bv. &quot;Blue Star
                Delos&quot; — staat op je ticket) om de live scheepspositie te zien.
              </p>
            </div>
          )
        )}

        {/* External links */}
        <div className="flex flex-wrap gap-2">
          <a
            href={BLUE_STAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#005BAE] text-white rounded-xl font-['Inter'] text-xs font-semibold hover:brightness-110 transition-all"
          >
            <Anchor className="w-3.5 h-3.5" />
            bluestarferries.com
          </a>
          <a
            href={buildMarineTrafficSearchUrl(entry.vesselName || entry.operator || 'Blue Star Ferries')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#005BAE]/30 text-[#005BAE] rounded-xl font-['Inter'] text-xs font-semibold hover:bg-[#005BAE]/5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            MarineTraffic
          </a>
        </div>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="font-['Inter'] text-[11px] font-semibold uppercase tracking-wide text-[#717783] pt-0.5">
      {label}
    </span>
    <span className="font-['Inter'] text-xs font-semibold text-[#0b1d2d] text-right">{value}</span>
  </div>
);
