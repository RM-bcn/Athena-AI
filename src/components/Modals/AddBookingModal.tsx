import React, { useState, useEffect } from 'react';
import {
  X,
  Hotel,
  Check,
  Search,
  Sparkles,
  Star,
  MapPin,
  Euro,
  Tag,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Plus
} from 'lucide-react';
import { IslandStay } from '../../types';

export interface AIHotel {
  id: string;
  name: string;
  location: string;
  island: string;
  rating: number;
  ratingLabel: string;
  reviewsCount: number;
  pricePerNight: number;
  tag: string;
  amenities: string[];
  distanceToBeach: string;
  image: string;
}

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBooking: (booking: {
    name: string;
    location: string;
    status: 'CONFIRMED' | 'PAST STAY' | 'PENDING';
    island?: string;
    pricePerNight?: number;
    checkIn?: string;
    checkOut?: string;
    image?: string;
  }) => void;
  tripStays?: IslandStay[];
  initialMode?: 'manual' | 'ai';
  initialIsland?: string;
}

export const AddBookingModal: React.FC<AddBookingModalProps> = ({
  isOpen,
  onClose,
  onAddBooking,
  tripStays = [],
  initialMode = 'manual',
  initialIsland,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>(initialMode);
  
  // Manual Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedIsland, setSelectedIsland] = useState(initialIsland || (tripStays[0]?.island || 'Naxos'));
  const [status, setStatus] = useState<'CONFIRMED' | 'PAST STAY' | 'PENDING'>('CONFIRMED');
  const [pricePerNight, setPricePerNight] = useState<string>('150');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  // AI Suggesties Search State
  const [searchIsland, setSearchIsland] = useState<string>(initialIsland || (tripStays[0]?.island || 'Naxos'));
  const [styleFilter, setStyleFilter] = useState<string>('Boutique');
  const [aiHotels, setAIHotels] = useState<AIHotel[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [addedHotelId, setAddedHotelId] = useState<string | null>(null);

  // Synchronize when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      if (initialIsland) {
        setSelectedIsland(initialIsland);
        setSearchIsland(initialIsland);
      }
      if (activeTab === 'ai' || initialMode === 'ai') {
        fetchAIHotels(initialIsland || searchIsland);
      }
    }
  }, [isOpen, initialMode, initialIsland]);

  const fetchAIHotels = async (targetIsland: string) => {
    setIsLoadingHotels(true);
    try {
      const res = await fetch('/api/suggest-hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ island: targetIsland, style: styleFilter }),
      });
      const data = await res.json();
      setAIHotels(data.hotels || []);
    } catch {
      setAIHotels([]);
    } finally {
      setIsLoadingHotels(false);
    }
  };

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;

    onAddBooking({
      name,
      location: `${location} (${selectedIsland})`,
      island: selectedIsland,
      status,
      pricePerNight: Number(pricePerNight) || 150,
      checkIn,
      checkOut,
    });

    setName('');
    setLocation('');
    onClose();
  };

  const handleSelectHotel = (hotel: AIHotel) => {
    setAddedHotelId(hotel.id);
    const matchingStay = tripStays.find(
      (s) => s.island.toLowerCase() === (hotel.island || '').toLowerCase()
    );
    onAddBooking({
      name: hotel.name,
      location: `${hotel.location}`,
      island: hotel.island,
      status: 'CONFIRMED',
      pricePerNight: hotel.pricePerNight,
      image: hotel.image,
      checkIn: matchingStay?.startDate,
      checkOut: matchingStay?.endDate,
    });

    setTimeout(() => {
      setAddedHotelId(null);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#005BAE] text-white flex items-center justify-center shadow-md">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-wider block">
                Accommodatie & Boekingen
              </span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33]">
                Accommodatie Beheren & Hotel Suggesties
              </h2>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-[#f0f4f9] p-1.5 rounded-2xl border border-[#c0c7d3]/30">
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2.5 rounded-xl font-['Inter'] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-[#005BAE] shadow-sm'
                  : 'text-[#717783] hover:text-[#0b1d2d]'
              }`}
            >
              <Hotel className="w-4 h-4" />
              1. Handmatig Boeking Toevoegen
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ai');
                if (aiHotels.length === 0) {
                  fetchAIHotels(searchIsland);
                }
              }}
              className={`flex-1 py-2.5 rounded-xl font-['Inter'] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-[#005BAE] text-white shadow-sm'
                  : 'text-[#717783] hover:text-[#005BAE]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              2. AI Hotel Suggesties
            </button>
          </div>
        </div>

        {/* TAB 1: MANUAL ENTRY */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                  Hotel / Resort / Villa Naam
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bv. Milos Breeze Boutique Hotel"
                  className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                  required
                />
              </div>

              <div>
                <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                  Eiland / Bestemming
                </label>
                <select
                  value={selectedIsland}
                  onChange={(e) => setSelectedIsland(e.target.value)}
                  className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-3 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                >
                  {tripStays.length > 0 ? (
                    tripStays.map(s => (
                      <option key={s.id} value={s.island}>
                        {s.island} ({s.startDate} - {s.endDate})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Milos">Milos</option>
                      <option value="Naxos">Naxos</option>
                      <option value="Koufonisia">Koufonisia</option>
                      <option value="Paros">Paros</option>
                      <option value="Mykonos">Mykonos</option>
                      <option value="Santorini">Santorini</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                  Specifieke Wijk / Buurt
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="bv. Pollonia Bay of Agios Georgios"
                  className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                  required
                />
              </div>

              <div>
                <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
                  Prijs per nacht (€)
                </label>
                <input
                  type="number"
                  value={pricePerNight}
                  onChange={(e) => setPricePerNight(e.target.value)}
                  placeholder="150"
                  className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-['Inter'] text-[11px] font-semibold text-[#717783] mb-1">
                  Check-in Datum
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-3 py-2 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                />
              </div>

              <div>
                <label className="block font-['Inter'] text-[11px] font-semibold text-[#717783] mb-1">
                  Check-out Datum
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-3 py-2 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                />
              </div>

              <div>
                <label className="block font-['Inter'] text-[11px] font-semibold text-[#717783] mb-1">
                  Boekingsstatus
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-3 py-2 font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                >
                  <option value="CONFIRMED">BEVESTIGD</option>
                  <option value="PENDING">IN OVERWEGING</option>
                  <option value="PAST STAY">AFGELOPEN VERBLIJF</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className="text-[#005BAE] font-['Inter'] text-xs font-semibold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Liever AI Hotel Suggesties bekijken?
              </button>

              <button
                type="submit"
                className="bg-[#005BAE] text-white px-6 py-3 rounded-xl font-['Inter'] font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Boeking Opslaan
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: AI HOTEL SUGGESTIES */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            {/* Disclaimer */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="font-['Inter'] text-[11px] text-amber-900 leading-relaxed">
                <strong>Let op:</strong> Voorbeeldsuggesties van Athena AI — controleer zelf
                beschikbaarheid, prijzen en reviews op de boekingssite.
              </p>
            </div>

            {/* Search Controls */}
            <div className="p-4 bg-[#f0f4f9] rounded-2xl border border-[#005BAE]/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-[#005BAE]" />
                <div>
                  <label className="block text-[10px] font-bold text-[#005BAE] uppercase">
                    Selecteer Eiland
                  </label>
                  <select
                    value={searchIsland}
                    onChange={(e) => {
                      setSearchIsland(e.target.value);
                      fetchAIHotels(e.target.value);
                    }}
                    className="bg-white border border-[#c0c7d3]/50 rounded-lg px-3 py-1 font-['Inter'] text-xs font-bold text-[#001a33] focus:outline-none"
                  >
                    <option value="Milos">Milos</option>
                    <option value="Naxos">Naxos</option>
                    <option value="Koufonisia">Koufonisia</option>
                    <option value="Paros">Paros</option>
                    <option value="Mykonos">Mykonos</option>
                    <option value="Santorini">Santorini</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {['Boutique', 'Luxury', 'Budget', 'Beachfront'].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setStyleFilter(style);
                      fetchAIHotels(searchIsland);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-['Inter'] transition-colors cursor-pointer ${
                      styleFilter === style
                        ? 'bg-[#005BAE] text-white font-semibold'
                        : 'bg-white text-[#404752] hover:bg-[#e1efff]'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Hotel Cards List */}
            {isLoadingHotels ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#005BAE]">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="font-['Inter'] text-xs font-semibold">
                  AI hotelsuggesties inladen voor {searchIsland}...
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {aiHotels.map((hotel) => {
                  const isAdded = addedHotelId === hotel.id;
                  return (
                    <div
                      key={hotel.id}
                      className="p-4 bg-white rounded-2xl border border-[#e1efff] hover:border-[#005BAE]/40 shadow-sm transition-all flex flex-col sm:flex-row gap-4 group"
                    >
                      {/* Image */}
                      <div className="w-full sm:w-36 h-28 rounded-xl overflow-hidden relative flex-shrink-0 bg-gray-100">
                        <img
                          src={hotel.image}
                          alt={hotel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 left-2 bg-[#005BAE] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          {hotel.tag}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#0b1d2d]">
                                {hotel.name}
                              </h3>
                              <p className="font-['Inter'] text-xs text-[#717783] flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-[#005BAE]" />
                                {hotel.location} • {hotel.distanceToBeach}
                              </p>
                            </div>

                            {/* Rating badge */}
                            <div className="bg-[#005BAE]/10 text-[#005BAE] px-2.5 py-1 rounded-lg text-right flex-shrink-0">
                              <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-sm block leading-none">
                                {hotel.rating}
                              </span>
                              <span className="text-[9px] font-semibold uppercase block mt-0.5">
                                {hotel.ratingLabel}
                              </span>
                            </div>
                          </div>

                          {/* Amenities */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {hotel.amenities.map((amenity, i) => (
                              <span
                                key={i}
                                className="bg-[#f0f4f9] text-[#404752] text-[10px] font-medium px-2 py-0.5 rounded"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Price & Action Button */}
                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#f0f4f9]">
                          <div>
                            <span className="font-['Inter'] text-xs text-[#717783]">Vanaf </span>
                            <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-lg text-[#0b1d2d]">
                              €{hotel.pricePerNight}
                            </span>
                            <span className="font-['Inter'] text-xs text-[#717783]"> / nacht</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectHotel(hotel)}
                            disabled={isAdded}
                            className={`px-4 py-2 rounded-xl font-['Inter'] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-green-600 text-white'
                                : 'bg-[#005BAE] text-white hover:brightness-110 shadow-sm active:scale-95'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Toegevoegd aan Reis!
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                In reisschema opnemen
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
