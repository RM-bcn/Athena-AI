import React, { useState } from 'react';
import { X, Calendar, MapPin, Sparkles, Plus, Trash2, Clock, Check, ArrowRight } from 'lucide-react';
import { TripData, IslandStay } from '../../types';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (tripData: TripData) => void;
  isOwner?: boolean;
}

const POPULAR_DESTINATIONS = [
  'Milos', 'Naxos', 'Paros', 'Koufonisia', 'Mykonos', 'Santorini', 'Athens', 'Crete', 'Rhodes'
];

export const NewTripModal: React.FC<NewTripModalProps> = ({ isOpen, onClose, onCreateTrip, isOwner = true }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Calculate date offset helper
  const addDays = (dateString: string, days: number): string => {
    const d = new Date(dateString || new Date());
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const getDaysDiff = (start: string, end: string): number => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const [tripTitle, setTripTitle] = useState<string>('Cyclades Summer Odyssey');
  const [tripStartDate, setTripStartDate] = useState<string>(todayStr);
  const [tripStyle, setTripStyle] = useState<string>('Adventurous');

  // Stays state — user specifies location and when they stay there!
  const [stays, setStays] = useState<IslandStay[]>([
    {
      id: 'stay-1',
      island: 'Milos',
      startDate: todayStr,
      endDate: addDays(todayStr, 3),
      nights: 3,
      accommodationName: 'Milos Breeze Boutique',
    },
    {
      id: 'stay-2',
      island: 'Naxos',
      startDate: addDays(todayStr, 3),
      endDate: addDays(todayStr, 6),
      nights: 3,
      accommodationName: 'Nissaki Beach Hotel',
    },
    {
      id: 'stay-3',
      island: 'Koufonisia',
      startDate: addDays(todayStr, 6),
      endDate: addDays(todayStr, 8),
      nights: 2,
    },
  ]);

  if (!isOpen) return null;

  // Handler to update stay fields
  const handleUpdateStay = (id: string, field: keyof IslandStay, value: any) => {
    setStays(prevStays => {
      return prevStays.map(stay => {
        if (stay.id !== id) return stay;
        const updated = { ...stay, [field]: value };

        // Recalculate nights if start or end date changed
        if (field === 'startDate' || field === 'endDate') {
          const n = getDaysDiff(updated.startDate, updated.endDate);
          updated.nights = n;
        } else if (field === 'nights') {
          const nightsNum = Math.max(1, Number(value));
          updated.nights = nightsNum;
          updated.endDate = addDays(updated.startDate, nightsNum);
        }
        return updated;
      });
    });
  };

  // Auto sequence dates for stays
  const handleAutoSequenceDates = () => {
    let currentStart = tripStartDate;
    setStays(prevStays =>
      prevStays.map(stay => {
        const stayNights = stay.nights || 2;
        const newEnd = addDays(currentStart, stayNights);
        const updated = {
          ...stay,
          startDate: currentStart,
          endDate: newEnd,
          nights: stayNights,
        };
        currentStart = newEnd;
        return updated;
      })
    );
  };

  const handleAddStay = (islandName: string = 'Paros') => {
    const lastStay = stays[stays.length - 1];
    const newStart = lastStay ? lastStay.endDate : tripStartDate;
    const newEnd = addDays(newStart, 2);
    const newStay: IslandStay = {
      id: `stay-${Date.now()}`,
      island: islandName,
      startDate: newStart,
      endDate: newEnd,
      nights: 2,
    };
    setStays(prev => [...prev, newStay]);
  };

  const handleRemoveStay = (id: string) => {
    if (stays.length <= 1) return;
    setStays(prev => prev.filter(s => s.id !== id));
  };

  // Calculate total nights and overall trip end date
  const totalNights = stays.reduce((acc, curr) => acc + (curr.nights || 1), 0);
  const calculatedTripEnd = stays.length > 0 ? stays[stays.length - 1].endDate : addDays(tripStartDate, totalNights);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTripData: TripData = {
      id: `trip-${Date.now()}`,
      title: tripTitle || 'Greek Island Odyssey',
      startDate: tripStartDate,
      endDate: calculatedTripEnd,
      durationDays: totalNights + 1,
      style: tripStyle,
      stays,
    };
    onCreateTrip(finalTripData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-8 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#005BAE] text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-wider block">
              Trip Planner / Reis Planning
            </span>
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33]">
              Nieuwe Trip Aanmaken & Verblijfsduur Instellen
            </h2>
            <p className="font-['Inter'] text-xs text-[#717783] mt-0.5">
              Geef precies aan wanneer en hoe lang je op elke bestemming/eiland blijft.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                Trip Naam / Title
              </label>
              <input
                type="text"
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/40 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                placeholder="bv. Cyclades Summer Hopping"
                required
              />
            </div>

            <div>
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                Reisstijl / Style
              </label>
              <select
                value={tripStyle}
                onChange={(e) => setTripStyle(e.target.value)}
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/40 rounded-xl px-3 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              >
                <option value="Adventurous">Adventurous</option>
                <option value="Relaxed & Beach">Relaxed & Beach</option>
                <option value="Romantic Couple">Romantic Couple</option>
                <option value="Luxury Concierge">Luxury Concierge</option>
                <option value="Family Friendly">Family Friendly</option>
              </select>
            </div>
          </div>

          {/* Start Date & Overall Summary */}
          <div className="p-4 bg-[#f0f4f9] rounded-2xl border border-[#005BAE]/15 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#005BAE]" />
              <div>
                <label className="block font-['Inter'] text-[11px] font-bold text-[#005BAE] uppercase">
                  Startdatum Reis
                </label>
                <input
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => {
                    setTripStartDate(e.target.value);
                  }}
                  className="bg-white border border-[#c0c7d3]/50 rounded-lg px-2 py-1 font-['Inter'] text-xs text-[#001a33] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-['Inter']">
              <div>
                <span className="text-[#717783] block text-[10px]">Totaal Nachten</span>
                <span className="font-bold text-[#005BAE] text-sm">{totalNights} nachten ({totalNights + 1} dagen)</span>
              </div>

              <button
                type="button"
                onClick={handleAutoSequenceDates}
                className="px-3 py-1.5 bg-white border border-[#005BAE]/30 text-[#005BAE] hover:bg-[#005BAE] hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Lijn alle datums automatisch achter elkaar aan"
              >
                Sluit Datums Aaneen
              </button>
            </div>
          </div>

          {/* Dynamic Stays Section ("Wanneer blijf ik waar?") */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider">
                Verblijf per Eiland / Bestemming Planning
              </label>
              <span className="text-[11px] font-['Inter'] text-[#717783]">
                {stays.length} {stays.length === 1 ? 'bestemming' : 'bestemmingen'} ingesteld
              </span>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {stays.map((stay, index) => (
                <div
                  key={stay.id}
                  className="p-4 bg-white border border-[#e1efff] hover:border-[#005BAE]/40 rounded-2xl shadow-sm transition-all space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#005BAE]/10 text-[#005BAE] text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#005BAE]" />
                        <input
                          type="text"
                          value={stay.island}
                          onChange={(e) => handleUpdateStay(stay.id, 'island', e.target.value)}
                          className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#0b1d2d] bg-transparent border-b border-transparent hover:border-[#c0c7d3] focus:border-[#005BAE] focus:outline-none px-1"
                          placeholder="Bestemming (bv. Naxos)"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-[#f0f4f9] text-[#005BAE] px-2.5 py-1 rounded-full text-xs font-bold font-['Inter']">
                        {stay.nights} {stay.nights === 1 ? 'nacht' : 'nachten'}
                      </span>

                      {stays.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStay(stay.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Verwijder dit verblijf"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dates Configuration Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f0f4f9]/60 p-3 rounded-xl">
                    <div>
                      <label className="block text-[10px] font-['Inter'] font-semibold text-[#717783] mb-1">
                        Aankomst (Check-in)
                      </label>
                      <input
                        type="date"
                        value={stay.startDate}
                        onChange={(e) => handleUpdateStay(stay.id, 'startDate', e.target.value)}
                        className="w-full bg-white border border-[#c0c7d3]/40 rounded-lg px-2.5 py-1.5 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-['Inter'] font-semibold text-[#717783] mb-1">
                        Vertrek (Check-out)
                      </label>
                      <input
                        type="date"
                        value={stay.endDate}
                        onChange={(e) => handleUpdateStay(stay.id, 'endDate', e.target.value)}
                        className="w-full bg-white border border-[#c0c7d3]/40 rounded-lg px-2.5 py-1.5 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-['Inter'] font-semibold text-[#717783] mb-1">
                        Aantal Nachten
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={stay.nights}
                        onChange={(e) => handleUpdateStay(stay.id, 'nights', e.target.value)}
                        className="w-full bg-white border border-[#c0c7d3]/40 rounded-lg px-2.5 py-1.5 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Destination Pills */}
            <div className="pt-1">
              <span className="block font-['Inter'] text-[11px] text-[#717783] mb-2">
                Snelle toevoeging uit populaire Griekse eilanden:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_DESTINATIONS.map(dest => (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => handleAddStay(dest)}
                    className="px-2.5 py-1 bg-[#f0f4f9] hover:bg-[#005BAE] hover:text-white text-[#005BAE] rounded-full font-['Inter'] text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    {dest}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddStay('Nieuwe Bestemming')}
                  className="px-3 py-1 border border-dashed border-[#005BAE] text-[#005BAE] hover:bg-[#005BAE]/10 rounded-full font-['Inter'] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Aangepast Verblijf Toevoegen
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f0f4f9]">
            <button
              type="submit"
              className="w-full bg-[#005BAE] text-white py-3.5 rounded-xl font-['Inter'] font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isOwner ? 'Reis activeren' : 'Indienen ter goedkeuring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
