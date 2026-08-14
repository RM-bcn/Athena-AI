import React, { useState, useEffect } from 'react';
import { IslandStay } from '../../types';
import { X, MapPin, Check } from 'lucide-react';

interface EditStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  stayToEdit?: IslandStay | null;
  onSaveStay: (stay: IslandStay) => void;
}

export const EditStayModal: React.FC<EditStayModalProps> = ({
  isOpen,
  onClose,
  stayToEdit,
  onSaveStay,
}) => {
  const [island, setIsland] = useState('Naxos');
  const [startDate, setStartDate] = useState('2026-08-18');
  const [endDate, setEndDate] = useState('2026-08-21');
  const [nights, setNights] = useState(3);
  const [accommodationName, setAccommodationName] = useState('');
  const [notes, setNotes] = useState('');

  const calcNights = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
      const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
      return diffDays > 0 ? diffDays : 1;
    }
    return 1;
  };

  useEffect(() => {
    if (isOpen) {
      const start = stayToEdit?.startDate || '2026-08-18';
      const end = stayToEdit?.endDate || '2026-08-21';
      setIsland(stayToEdit?.island || 'Naxos');
      setStartDate(start);
      setEndDate(end);
      setNights(stayToEdit?.nights || calcNights(start, end));
      setAccommodationName(stayToEdit?.accommodationName || '');
      setNotes(stayToEdit?.notes || '');
    }
  }, [isOpen, stayToEdit]);

  if (!isOpen) return null;

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setNights(calcNights(val, endDate));
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setNights(calcNights(startDate, val));
  };

  const handleNightsChange = (val: number) => {
    const n = Math.max(1, val);
    setNights(n);
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) {
      s.setDate(s.getDate() + n);
      setEndDate(s.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveStay({
      id: stayToEdit?.id || `stay-${Date.now()}`,
      island,
      startDate,
      endDate,
      nights: Number(nights),
      accommodationName,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#005BAE]/20 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#005BAE]/10 text-[#005BAE] flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-[#0b1d2d]">
              {stayToEdit ? `${stayToEdit.island} Verblijf Bewerken` : 'Nieuwe Eiland Stop Toevoegen'}
            </h3>
            <p className="font-['Inter'] text-xs text-[#717783]">
              Pas de datums, nachtaantallen en accommodatie aan voor deze reisstop.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0b1d2d] mb-1">Eiland Naam</label>
            <input
              type="text"
              required
              value={island}
              onChange={(e) => setIsland(e.target.value)}
              placeholder="e.g. Naxos, Milos, Koufonisia, Paros"
              className="w-full h-11 px-3 bg-[#f0f4f9] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm focus:outline-none focus:border-[#005BAE]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0b1d2d] mb-1">Aankomst Datum</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full h-11 px-3 bg-[#f0f4f9] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-xs focus:outline-none focus:border-[#005BAE]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0b1d2d] mb-1">Vertrek Datum</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full h-11 px-3 bg-[#f0f4f9] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-xs focus:outline-none focus:border-[#005BAE]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1d2d] mb-1">Aantal Nachten</label>
            <input
              type="number"
              min="1"
              max="30"
              value={nights}
              onChange={(e) => handleNightsChange(Number(e.target.value))}
              className="w-full h-11 px-3 bg-[#f0f4f9] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm focus:outline-none focus:border-[#005BAE]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1d2d] mb-1">Geboekt Hotel / Boetiek</label>
            <input
              type="text"
              value={accommodationName}
              onChange={(e) => setAccommodationName(e.target.value)}
              placeholder="e.g. Nissaki Beach Hotel"
              className="w-full h-11 px-3 bg-[#f0f4f9] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm focus:outline-none focus:border-[#005BAE]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1d2d] mb-1">Notities voor Dennis & Joyce</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bijv. Scooter gereserveerd bij de haven, taverne Rotonda reserveren."
              className="w-full p-3 bg-[#f0f4f9] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-xs focus:outline-none focus:border-[#005BAE]"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-[#c0c7d3] text-[#404752] rounded-xl font-['Inter'] text-xs font-bold hover:bg-[#f0f4f9]"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#005BAE] text-white rounded-xl font-['Inter'] text-xs font-bold hover:brightness-110 shadow-md flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" />
              Opslaan & Synchroniseren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
