import React, { useEffect, useState } from 'react';
import { Check, Ship, X } from 'lucide-react';
import type { TransportEntry, TransportLeg, TransportType } from './types';
import { transportTypeLabel } from './transportLogic';
import { TransportIcon } from './TransportIcon';

interface TransportBookingModalProps {
  isOpen: boolean;
  leg: TransportLeg | null;
  onClose: () => void;
  onAdd: (entry: Omit<TransportEntry, 'id'>) => void;
}

interface FormState {
  type: TransportType;
  from: string;
  to: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  operator: string;
  vessel: string;
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
  vessel: '',
  bookingRef: '',
  notes: '',
};

const TYPE_OPTIONS: TransportType[] = ['ferry', 'flight', 'transfer', 'other'];

export const TransportBookingModal: React.FC<TransportBookingModalProps> = ({
  isOpen,
  leg,
  onClose,
  onAdd,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (isOpen && leg) {
      setForm({
        ...EMPTY_FORM,
        from: leg.fromCity,
        to: leg.toCity,
        date: leg.date,
      });
    }
  }, [isOpen, leg]);

  if (!isOpen || !leg) return null;

  const updateForm = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.from.trim() || !form.to.trim() || !form.date) return;

    onAdd({
      type: form.type,
      from: form.from.trim(),
      to: form.to.trim(),
      date: form.date,
      departureTime: form.departureTime || undefined,
      arrivalTime: form.arrivalTime || undefined,
      operator: form.operator.trim() || undefined,
      vesselName: form.vessel.trim() || undefined,
      bookingRef: form.bookingRef.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
          aria-label="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#005BAE] text-white flex items-center justify-center shadow-md">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-wider block">
                Ferry & Transfer Boekingen
              </span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33]">
                Vervoer toevoegen
              </h2>
            </div>
          </div>
          <p className="font-['Inter'] text-xs text-[#717783] mt-3">
            Voeg het vervoer toe voor de route {leg.fromCity} → {leg.toCity}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                Van
              </label>
              <input
                value={form.from}
                onChange={(event) => updateForm('from', event.target.value)}
                placeholder="bv. Piraeus"
                required
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              />
            </div>
            <div>
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                Naar
              </label>
              <input
                value={form.to}
                onChange={(event) => updateForm('to', event.target.value)}
                placeholder="bv. Paros"
                required
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-['Inter'] text-[11px] font-semibold text-[#717783] mb-1.5">
                Datum
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateForm('date', event.target.value)}
                required
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-3 py-2.5 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              />
            </div>
            <div>
              <label className="block font-['Inter'] text-[11px] font-semibold text-[#717783] mb-1.5">
                Vertrek
              </label>
              <input
                type="time"
                value={form.departureTime}
                onChange={(event) => updateForm('departureTime', event.target.value)}
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-3 py-2.5 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              />
            </div>
            <div>
              <label className="block font-['Inter'] text-[11px] font-semibold text-[#717783] mb-1.5">
                Aankomst
              </label>
              <input
                type="time"
                value={form.arrivalTime}
                onChange={(event) => updateForm('arrivalTime', event.target.value)}
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-3 py-2.5 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              />
            </div>
          </div>

          <div>
            <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
              Type vervoer
            </label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateForm('type', type)}
                  className={`px-3 py-2 rounded-xl border font-['Inter'] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    form.type === type
                      ? 'bg-[#005BAE] text-white border-[#005BAE]'
                      : 'bg-white text-[#005BAE] border-[#005BAE]/30 hover:bg-[#005BAE]/5'
                  }`}
                >
                  <TransportIcon type={type} className="w-3.5 h-3.5" />
                  {transportTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                Vervoerder
              </label>
              <input
                value={form.operator}
                onChange={(event) => updateForm('operator', event.target.value)}
                placeholder="bv. Blue Star Ferries"
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              />
            </div>
            <div>
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                Schip
              </label>
              <input
                value={form.vessel}
                onChange={(event) => updateForm('vessel', event.target.value)}
                placeholder="bv. Blue Star Delos (staat op je ticket)"
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              />
            </div>
          </div>

          <div>
            <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
              Boekingsreferentie
            </label>
            <input
              value={form.bookingRef}
              onChange={(event) => updateForm('bookingRef', event.target.value)}
              placeholder="bv. ABC123"
              className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
            />
          </div>

          <div>
            <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
              Notities
            </label>
            <textarea
              value={form.notes}
              onChange={(event) => updateForm('notes', event.target.value)}
              rows={2}
              placeholder="Extra informatie over dit vervoer"
              className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-[#c0c7d3] text-[#404752] rounded-xl font-['Inter'] text-xs font-bold hover:bg-[#f0f4f9] transition-colors cursor-pointer"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="bg-[#005BAE] text-white px-6 py-3 rounded-xl font-['Inter'] font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Vervoer Opslaan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
