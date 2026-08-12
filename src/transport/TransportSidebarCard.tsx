import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Ship, Plus, Trash2, Edit3, X } from 'lucide-react';
import type { IslandStay } from '../types';
import type { TransportEntry, TransportLeg, TransportType } from './types';
import {
  deriveLegs,
  formatCalendarDate,
  resolveLegId,
  transportTypeLabel,
} from './transportLogic';
import { TransportIcon } from './TransportIcon';

interface TransportSidebarCardProps {
  entries: TransportEntry[];
  stays: IslandStay[];
  canEdit: boolean;
  onAdd: (entry: Omit<TransportEntry, 'id'>) => void;
  onUpdate: (entry: TransportEntry) => void;
  onDelete: (id: string) => void;
  /** Id of the transport that is "popped out" (selected). Shared with the day
   *  rows and route connector so clicking anywhere highlights it everywhere. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

interface FormState {
  type: TransportType;
  from: string;
  to: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  operator: string;
  bookingRef: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  type: 'ferry',
  from: '',
  to: '',
  date: '',
  departureTime: '',
  arrivalTime: '',
  operator: '',
  bookingRef: '',
  notes: '',
};

const TYPE_OPTIONS: TransportType[] = ['ferry', 'flight', 'transfer', 'other'];

const labelFromLeg = (leg: TransportLeg): string =>
  `${formatCalendarDate(leg.date)}: ${leg.fromCity} → ${leg.toCity}`;

/**
 * "Ferries & Transfers" collapsible sidebar card, styled identically to the
 * existing "Geboekte Accommodaties" card. Lists booked transports, shows
 * link status, and hosts an inline add/edit form with a derived-leg selector.
 */
export const TransportSidebarCard: React.FC<TransportSidebarCardProps> = ({
  entries,
  stays,
  canEdit,
  onAdd,
  onUpdate,
  onDelete,
  selectedId,
  onSelect,
}) => {
  const [open, setOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const legs = useMemo(() => deriveLegs(stays), [stays]);

  // Open the inline form pre-filled for a leg (triggered from the route
  // overview "+" affordance via a custom event, keeping the components
  // decoupled from MyItineraryView).
  useEffect(() => {
    const handler = (e: Event) => {
      const leg = (e as CustomEvent<TransportLeg>).detail;
      if (!leg) return;
      setForm({
        ...EMPTY_FORM,
        from: leg.fromCity,
        to: leg.toCity,
        date: leg.date,
      });
      setEditingId(null);
      setFormOpen(true);
    };
    window.addEventListener('athena:transport-form', handler);
    return () => window.removeEventListener('athena:transport-form', handler);
  }, []);

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.departureTime || '99:99').localeCompare(b.departureTime || '99:99');
      }),
    [entries]
  );

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (entry: TransportEntry) => {
    setForm({
      type: entry.type,
      from: entry.from,
      to: entry.to,
      date: entry.date,
      departureTime: entry.departureTime || '',
      arrivalTime: entry.arrivalTime || '',
      operator: entry.operator || '',
      bookingRef: entry.bookingRef || '',
      notes: entry.notes || '',
    });
    setEditingId(entry.id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const handleLegSelect = (value: string) => {
    if (value === '') {
      setForm((f) => ({ ...f, from: '', to: '', date: '' }));
      return;
    }
    const leg = legs.find((l) => l.id === value);
    if (leg) {
      setForm((f) => ({ ...f, from: leg.fromCity, to: leg.toCity, date: leg.date }));
    }
  };

  const handleSave = () => {
    if (!form.from.trim() || !form.to.trim() || !form.date.trim()) {
      alert('⚠️ Vul de route (van, naar) en de datum in.');
      return;
    }
    const payload: Omit<TransportEntry, 'id'> = {
      type: form.type,
      from: form.from.trim(),
      to: form.to.trim(),
      date: form.date,
      departureTime: form.departureTime.trim() || undefined,
      arrivalTime: form.arrivalTime.trim() || undefined,
      operator: form.operator.trim() || undefined,
      bookingRef: form.bookingRef.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      onUpdate({ ...payload, id: editingId });
    } else {
      onAdd(payload);
    }
    closeForm();
  };

  return (
    <div className="bg-white rounded-[24px] overflow-hidden border border-[#e1efff] shadow-sm">
      <div className="p-6 bg-white border-b border-[#f0f4f9] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ship className="w-5 h-5 text-[#005BAE]" />
          <span className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">
            Ferries & Transfers
          </span>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="p-1 text-[#717783] hover:text-[#005BAE]"
        >
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="p-6 pt-4 space-y-4">
          {sorted.length === 0 && !formOpen && (
            <p className="font-['Inter'] text-xs text-[#717783]">
              Nog geen ferries, vluchten of transfers geboekt. Voeg je eerste transport toe.
            </p>
          )}

          {sorted.map((entry) => {
            const link = resolveLegId(entry, legs);
            const isSelected = entry.id === selectedId;
            return (
              <div
                key={entry.id}
                onClick={() => onSelect?.(entry.id)}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-white border-[#005BAE] ring-2 ring-[#005BAE]/20 shadow-md scale-[1.02]'
                    : 'bg-[#f0f4f9] border-[#c0c7d3]/30 hover:border-[#005BAE]/40'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TransportIcon type={entry.type} className="w-4 h-4 text-[#005BAE] flex-shrink-0" />
                    <span className="font-['Inter'] text-xs font-bold text-[#0b1d2d]">
                      {entry.from} → {entry.to}
                    </span>
                  </div>
                  <p className="font-['Inter'] text-[11px] text-[#404752] font-semibold mt-0.5">
                    {formatCalendarDate(entry.date)}
                    {entry.departureTime ? ` · ${entry.departureTime}` : ''}
                    {entry.arrivalTime ? ` – ${entry.arrivalTime}` : ''}
                  </p>
                  {entry.operator && (
                    <p className="font-['Inter'] text-[10px] text-[#005BAE] font-semibold mt-0.5">
                      {entry.operator}
                      {entry.bookingRef ? ` · Ref: ${entry.bookingRef}` : ''}
                    </p>
                  )}
                  {link.result === 'linked' && link.linkedLegId ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Gekoppeld
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-[10px] font-bold rounded bg-white text-[#717783] border border-[#c0c7d3]/50">
                      Niet gekoppeld
                    </span>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(entry);
                      }}
                      className="p-1.5 text-[#005BAE] hover:bg-[#e1efff] rounded-lg"
                      title="Bewerken"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(entry.id);
                      }}
                      className="p-1.5 text-[#717783] hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {formOpen ? (
            <div className="p-3.5 bg-white rounded-xl border border-[#005BAE]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-['Inter'] text-xs font-bold text-[#0b1d2d]">
                  {editingId ? 'Transport bewerken' : 'Nieuw transport'}
                </span>
                <button onClick={closeForm} className="text-[#717783] hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!editingId && (
                <select
                  value=""
                  onChange={(e) => handleLegSelect(e.target.value)}
                  className="w-full text-xs font-['Inter'] border border-[#c0c7d3]/50 rounded-lg px-2.5 py-2 bg-[#f0f4f9] text-[#0b1d2d]"
                >
                  <option value="">Kies een reisdeel…</option>
                  {legs.map((leg) => (
                    <option key={leg.id} value={leg.id}>
                      {labelFromLeg(leg)}
                    </option>
                  ))}
                  <option value="">Anders / losse datum</option>
                </select>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.from}
                  onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                  placeholder="Van (bv. Piraeus)"
                  className="col-span-1 text-xs font-['Inter'] border border-[#c0c7d3]/50 rounded-lg px-2.5 py-2 text-[#0b1d2d]"
                />
                <input
                  value={form.to}
                  onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                  placeholder="Naar (bv. Naxos)"
                  className="col-span-1 text-xs font-['Inter'] border border-[#c0c7d3]/50 rounded-lg px-2.5 py-2 text-[#0b1d2d]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="col-span-3 text-xs font-['Inter'] border border-[#c0c7d3]/50 rounded-lg px-2.5 py-2 text-[#0b1d2d]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-['Inter'] text-[11px] font-bold text-[#404752]">Type:</span>
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                      form.type === t
                        ? 'bg-[#005BAE] text-white border-[#005BAE]'
                        : 'bg-white text-[#005BAE] border-[#005BAE]/30 hover:bg-[#005BAE]/5'
                    }`}
                  >
                    <TransportIcon type={t} className="w-3 h-3" />
                    {transportTypeLabel(t)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={form.departureTime}
                  onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
                  placeholder="Vertrek"
                  className="text-xs font-['Inter'] border border-[#c0c7d3]/50 rounded-lg px-2.5 py-2 text-[#0b1d2d]"
                />
                <input
                  type="time"
                  value={form.arrivalTime}
                  onChange={(e) => setForm((f) => ({ ...f, arrivalTime: e.target.value }))}
                  placeholder="Aankomst"
                  className="text-xs font-['Inter'] border border-[#c0c7d3]/50 rounded-lg px-2.5 py-2 text-[#0b1d2d]"
                />
              </div>

              <input
                value={form.operator}
                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
                placeholder="Vervoerder (bv. Blue Star Ferries)"
                className="w-full text-xs font-['Inter'] border border-[#c0c7d3]/50 rounded-lg px-2.5 py-2 text-[#0b1d2d]"
              />
              <input
                value={form.bookingRef}
                onChange={(e) => setForm((f) => ({ ...f, bookingRef: e.target.value }))}
                placeholder="Boekingsreferentie"
                className="w-full text-xs font-['Inter'] border border-[#c0c7d3]/50 rounded-lg px-2.5 py-2 text-[#0b1d2d]"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-[#005BAE] text-white rounded-xl font-['Inter'] text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
                >
                  {editingId ? 'Opslaan' : 'Toevoegen'}
                </button>
                <button
                  onClick={closeForm}
                  className="px-3 py-2 border border-[#c0c7d3]/50 text-[#404752] rounded-xl font-['Inter'] text-xs font-semibold hover:bg-[#f0f4f9] transition-colors cursor-pointer"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            canEdit && (
              <button
                onClick={openAddForm}
                className="w-full py-2.5 border border-[#005BAE] text-[#005BAE] rounded-xl font-['Inter'] text-xs font-semibold hover:bg-[#005BAE]/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Voeg ferry, vlucht of transfer toe
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
