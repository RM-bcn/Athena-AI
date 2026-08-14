import React, { useState } from 'react';
import { Inbox, CheckCircle2, XCircle, Clock, User, Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { TripRequest } from '../types';

interface TripRequestsViewProps {
  requests: TripRequest[];
  isOwner: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, notes?: string) => void;
}

const STATUS_LABEL: Record<TripRequest['status'], string> = {
  pending: 'In afwachting',
  approved: 'Goedgekeurd',
  rejected: 'Afgekeurd',
};

const STATUS_CLASS: Record<TripRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Onbekend';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatRequestedAt(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const TripRequestsView: React.FC<TripRequestsViewProps> = ({
  requests,
  isOwner,
  onApprove,
  onReject,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pending = requests.filter((r) => r.status === 'pending');
  const handled = requests.filter((r) => r.status !== 'pending');

  const startReject = (id: string) => {
    setRejectingId(id);
    setNotes('');
  };

  const confirmReject = (id: string) => {
    onReject(id, notes.trim() || undefined);
    setRejectingId(null);
    setNotes('');
  };

  const renderRequest = (req: TripRequest) => {
    const isExpanded = expandedId === req.id;
    return (
      <div key={req.id} className="rounded-2xl border border-[#e1efff] bg-white shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f0f4f9] text-[#005BAE] flex items-center justify-center flex-shrink-0">
                {req.status === 'approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : req.status === 'rejected' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#0b1d2d]">
                  {req.title}
                </h3>
                <p className="font-['Inter'] text-xs text-[#717783] mt-0.5">
                  {req.stays.length > 0
                    ? req.stays.map((s) => s.island).join(' → ')
                    : 'Nog geen verblijven opgegeven'}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 font-['Inter'] text-[11px] text-[#404752]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#005BAE]" />
                    {formatDate(req.startDate)} t/m {formatDate(req.endDate)} ({req.durationDays} dagen)
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-[#005BAE]" />
                    {req.requestedBy}
                  </span>
                  {req.requestedAt && (
                    <span className="text-[#717783]">{formatRequestedAt(req.requestedAt)}</span>
                  )}
                </div>
              </div>
            </div>

            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_CLASS[req.status]}`}>
              {STATUS_LABEL[req.status]}
            </span>
          </div>

          {req.notes && (
            <p className="mt-3 text-xs font-['Inter'] text-[#404752] bg-[#f0f4f9] rounded-lg px-3 py-2">
              <span className="font-bold text-[#0b1d2d]">Toelichting:</span> {req.notes}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {req.stays.length > 0 && (
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : req.id)}
                className="flex items-center gap-1 px-3 py-2.5 rounded-lg bg-[#f0f4f9] text-[#005BAE] text-xs font-bold hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Verblijven tonen
              </button>
            )}

            {isOwner && req.status === 'pending' && (
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => onApprove(req.id)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Goedkeuren
                </button>
                <button
                  type="button"
                  onClick={() => startReject(req.id)}
                  className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Afkeuren
                </button>
              </div>
            )}
          </div>

          {isOwner && rejectingId === req.id && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
              <p className="text-xs font-bold text-red-800 font-['Inter']">
                Deze reis-aanvraag afkeuren? Je kunt een toelichting geven.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reden (optioneel)"
                rows={2}
                className="w-full bg-white border border-red-300 rounded-xl px-3 py-2 text-xs font-['Inter'] text-[#0b1d2d] focus:outline-none focus:border-red-500"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-3 py-2.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={() => confirmReject(req.id)}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
                >
                  Bevestig afkeuring
                </button>
              </div>
            </div>
          )}

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-[#f0f4f9] space-y-2">
              {req.stays.map((stay, idx) => (
                <div key={stay.id || idx} className="flex items-start gap-2.5 text-xs font-['Inter'] text-[#404752]">
                  <MapPin className="w-3.5 h-3.5 text-[#005BAE] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#0b1d2d]">{stay.island}</strong> — {formatDate(stay.startDate)} t/m{' '}
                    {formatDate(stay.endDate)} ({stay.nights} nachten)
                    {stay.accommodationName ? ` · ${stay.accommodationName}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="md:ml-64 pt-20 md:pt-24 min-h-screen px-4 md:px-12 pb-16 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-[#005BAE] text-white flex items-center justify-center shadow-md">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-widest block">
              {isOwner ? 'Beheerderspaneel' : 'Mijn aanvragen'}
            </span>
            <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-[#0b1d2d]">
              Reis-aanvragen
            </h1>
          </div>
        </div>
        <p className="text-[#404752] font-['Inter'] text-sm mt-1 mb-8">
          {isOwner
            ? 'Leden stellen een reis voor; jij keurt hem goed (dan wordt het de actieve reis) of keurt hem af.'
            : 'Hier zie je de status van de reizen die je hebt voorgesteld. De eigenaar beoordeelt je aanvragen.'}
        </p>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-[#e1efff] bg-[#f0f4f9]/50 p-12 text-center">
            <Inbox className="w-10 h-10 text-[#005BAE]/40 mx-auto mb-3" />
            <p className="font-['Plus_Jakarta_Sans'] font-semibold text-[#0b1d2d]">
              {isOwner ? 'Geen reis-aanvragen' : 'Je hebt nog geen reis-aanvragen ingediend'}
            </p>
            <p className="font-['Inter'] text-sm text-[#717783] mt-1">
              {isOwner
                ? 'Wanneer een lid een reis voorstelt via "Nieuwe Reis Plannen", verschijnt die hier.'
                : 'Gebruik "Nieuwe Reis Plannen" om een reis ter goedkeuring voor te stellen.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {pending.length > 0 && (
              <section>
                <h2 className="font-['Inter'] text-xs font-bold uppercase tracking-wider text-[#717783] mb-3">
                  In afwachting ({pending.length})
                </h2>
                <div className="space-y-4">{pending.map(renderRequest)}</div>
              </section>
            )}

            {handled.length > 0 && (
              <section>
                <h2 className="font-['Inter'] text-xs font-bold uppercase tracking-wider text-[#717783] mb-3">
                  Afgehandeld ({handled.length})
                </h2>
                <div className="space-y-4">{handled.map(renderRequest)}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
