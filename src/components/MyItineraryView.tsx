import React, { useState } from 'react';
import greeceSunsetBg from '../assets/images/greece_sunset_bg_1785583337875.jpg';
import {
  Accommodation,
  TripData,
  IslandStay,
  UserAccount
} from '../types';
import { getStayLinkInfo, StayLinkInfo } from '../utils/accommodationMatcher';
import {
  MAP_IMAGE,
} from '../data/initialData';
import {
  Share2,
  Download,
  Ship,
  MapPin,
  Utensils,
  ChevronDown,
  ChevronUp,
  Hotel,
  Lightbulb,
  CheckCircle2,
  Sun,
  Plus,
  Sparkles,
  Calendar,
  Clock,
  Edit3,
  Search,
  UserCheck,
  Eye,
  Key,
  LogIn,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Lock
} from 'lucide-react';
import { EditStayModal } from './Modals/EditStayModal';
import { WeatherCard } from './WeatherCard';
import { TransportSidebarCard } from '../transport/TransportSidebarCard';
import { TransportRouteConnector } from '../transport/TransportRouteConnector';
import { TransportDayRows } from '../transport/TransportDayRows';
import { deriveLegs } from '../transport/transportLogic';
import type { TransportEntry } from '../transport/types';

interface MyItineraryViewProps {
  currentTrip: TripData;
  currentUser: UserAccount | null;
  isGuestMode: boolean;
  tripCode: string;
  onOpenChat: () => void;
  onOpenNewBooking: (mode?: 'manual' | 'trivago', island?: string) => void;
  onShare: () => void;
  onExportPDF: () => void;
  onOpenNewTripModal: () => void;
  onSaveStay: (stay: IslandStay) => void;
  onDeleteStay: (stayId: string) => void;
  customBookings?: Accommodation[];
  onDeleteCustomBooking?: (id: string) => void;
  stayBookingLinks?: Record<string, string>;
  onLinkStayBooking?: (stayId: string, bookingId: string) => void;
  onUnlinkStayBooking?: (stayId: string) => void;
  transportEntries?: TransportEntry[];
  onAddTransportEntry?: (entry: Omit<TransportEntry, 'id'>) => void;
  onUpdateTransportEntry?: (entry: TransportEntry) => void;
  onDeleteTransportEntry?: (id: string) => void;
  onLoginClick: () => void;
  sheetUrl?: string | null;
  isSheetsConnected?: boolean;
  onSyncSheets?: () => void;
}

export const MyItineraryView: React.FC<MyItineraryViewProps> = ({
  currentTrip,
  currentUser,
  isGuestMode,
  tripCode,
  onOpenChat,
  onOpenNewBooking,
  onShare,
  onExportPDF,
  onOpenNewTripModal,
  onSaveStay,
  onDeleteStay,
  customBookings = [],
  onDeleteCustomBooking,
  stayBookingLinks = {},
  onLinkStayBooking,
  onUnlinkStayBooking,
  transportEntries = [],
  onAddTransportEntry,
  onUpdateTransportEntry,
  onDeleteTransportEntry,
  onLoginClick,
  sheetUrl,
  isSheetsConnected = false,
  onSyncSheets,
}) => {

  const [accommodationsOpen, setAccommodationsOpen] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(true);
  const [activeIslandId, setActiveIslandId] = useState<string>(
    currentTrip.stays.length > 0 ? currentTrip.stays[0].id : 'stay-1'
  );

  // Shared "popped out" transport selection: clicking a transport anywhere
  // (sidebar card, day rows, route connector) highlights the same entry
  // everywhere, mirroring how hotel/stay cards highlight when selected.
  const [selectedTransportId, setSelectedTransportId] = useState<string | null>(null);

  // Edit Stay Modal state
  const [isEditStayOpen, setIsEditStayOpen] = useState(false);
  const [editingStay, setEditingStay] = useState<IslandStay | null>(null);

  const [tipsChecklist, setTipsChecklist] = useState([
    { id: '1', text: 'Boek veerboottickets minimaal 48 uur van tevoren in het hoogseizoen.', checked: true },
    { id: '2', text: 'Huur een kleine quad/scooter om verborgen baaien te verkennen.', checked: true },
    { id: '3', text: 'Neem contant geld mee voor kleine traditionele taveernes in de dorpen.', checked: true },
  ]);

  const getLinkInfo = (stay: IslandStay): StayLinkInfo => {
    return getStayLinkInfo(stay, customBookings, stayBookingLinks);
  };

  const handleConfirmLink = (stayId: string, bookingId: string) => {
    onLinkStayBooking?.(stayId, bookingId);
  };

  const handleChangeLink = (stayId: string) => {
    onUnlinkStayBooking?.(stayId);
    onOpenNewBooking('manual', currentTrip.stays.find(s => s.id === stayId)?.island);
  };

  const handleUnlink = (stayId: string) => {
    onUnlinkStayBooking?.(stayId);
  };

  const toggleChecklist = (id: string) => {
    setTipsChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleOpenEditStay = (stay?: IslandStay) => {
    if (isGuestMode) {
      alert("⚠️ Je volgt de reis momenteel als Gast. Log in als Dennis of Joyce om de reis aan te passen.");
      onLoginClick();
      return;
    }
    setEditingStay(stay || null);
    setIsEditStayOpen(true);
  };

  // Helper to format date string
  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Build timeline stops dynamically from currentTrip.stays
  const timelineStops = currentTrip.stays.map((stay) => {
    return {
      id: stay.id,
      island: stay.island,
      days: `${stay.nights} ${stay.nights === 1 ? 'nacht' : 'nachten'}`,
      dateRange: `${formatDateFriendly(stay.startDate)} – ${formatDateFriendly(stay.endDate)}`,
      isActive: stay.id === activeIslandId,
    };
  });

  const canEdit = !!currentUser && !isGuestMode;

  // Derived transport legs between consecutive stays (single source of truth).
  const transportLegs = deriveLegs(currentTrip.stays);

  return (
    <main className="md:ml-64 pt-20 md:pt-24 min-h-screen px-4 md:px-12 pb-16 bg-white font-['Plus_Jakarta_Sans']">
      {/* Banner for Shared Access & Guest Read-Only Mode */}
      {isGuestMode ? (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold font-['Plus_Jakarta_Sans']">
                Gastmodus Actief — Je volgt Reiscode <code className="bg-amber-100 px-1.5 py-0.5 rounded font-bold">{tripCode}</code>
              </p>
              <p className="text-[11px] text-amber-700 font-['Inter']">
                Je bekijkt de live gedeelde reis van Dennis & Joyce. Log in als beheerder om wijzigingen op te slaan.
              </p>
            </div>
          </div>
          <button
            onClick={onLoginClick}
            className="px-3.5 py-2 rounded-xl bg-[#005BAE] text-white text-xs font-bold hover:brightness-110 shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Inloggen als Beheerder
          </button>
        </div>
      ) : currentUser ? (
        <div className="mb-6 p-4 rounded-2xl bg-[#005BAE]/5 border border-[#005BAE]/20 flex flex-wrap items-center justify-between gap-3 text-[#0b1d2d]">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-[#005BAE] flex-shrink-0" />
            <div>
              <p className="text-xs font-bold">
                Ingelogd als <span className="text-[#005BAE]">{currentUser.name}</span> ({currentUser.username})
              </p>
              <p className="text-[11px] text-[#404752]">
                Alle wijzigingen in deze reis worden direct gesynchroniseerd met Joyce & Dennis onder Reiscode <code className="font-bold text-[#005BAE]">{tripCode}</code>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onShare}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#005BAE]/30 text-[#005BAE] text-xs font-bold hover:bg-[#005BAE] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              Reiscode Delen ({tripCode})
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 text-blue-950">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#005BAE] flex-shrink-0" />
            <div>
              <p className="text-xs font-bold font-['Plus_Jakarta_Sans']">
                Beveiligde Toegang — Niet ingelogd
              </p>
              <p className="text-[11px] text-blue-800 font-['Inter']">
                Log in als beheerder (Dennis of Joyce) of voer een reiscode in om de reis te volgen.
              </p>
            </div>
          </div>
          <button
            onClick={onLoginClick}
            className="px-3.5 py-2 rounded-xl bg-[#005BAE] text-white text-xs font-bold hover:brightness-110 shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Inloggen / Reiscode Invoeren
          </button>
        </div>
      )}

      {/* Google Sheets Live Database Banner (ENKEL VOOR INGELOGDE BEHEERDERS) */}
      {canEdit && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-emerald-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-emerald-900">
                  Google Sheets Database
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  {isSheetsConnected ? 'Actief & Gekoppeld' : 'Google Workspace Sync'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 font-['Inter'] mt-0.5">
                Alle wijzigingen in je reisschema, verblijven en boekingen worden realtime opgeslagen in je Google Sheet document.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSyncSheets && (
              <button
                onClick={onSyncSheets}
                className="px-3 py-1.5 rounded-xl bg-white border border-emerald-600/30 text-emerald-800 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Handmatig synchroniseren met Google Sheets"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync nu
              </button>
            )}
            {sheetUrl ? (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Google Sheet 📊
              </a>
            ) : (
              <button
                onClick={onSyncSheets}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Koppelen & Synchroniseren 📊
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header Section with Sunset Background */}
      <section className="mb-8 relative rounded-3xl overflow-hidden shadow-xl border border-amber-900/20">
        <img
          src={greeceSunsetBg}
          alt="Griekse Eilanden Sunset"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/75 to-amber-950/60 backdrop-blur-[1px]" />
        
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 text-white">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="font-['Inter'] text-xs font-bold text-amber-300 uppercase tracking-widest bg-amber-500/20 backdrop-blur-md px-3.5 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5 shadow-sm">
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                {currentTrip.durationDays} Dagen Odyssey • {currentTrip.style}
              </span>
              <span className="font-['Inter'] text-xs font-bold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-300" />
                Code: {tripCode}
              </span>
              {canEdit && (
                <button
                  onClick={onOpenNewTripModal}
                  className="font-['Inter'] text-xs text-amber-200 font-bold hover:text-amber-100 underline flex items-center gap-1 cursor-pointer bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-lg"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Datums / Stays Bewerken
                </button>
              )}
            </div>

            <h1 className="font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow-md tracking-tight">
              {currentTrip.title}
            </h1>

            <p className="text-amber-100/90 mt-2.5 max-w-2xl font-['Inter'] text-sm md:text-base leading-relaxed drop-shadow">
              {currentTrip.stays.map(s => s.island).join(' → ')}. Een gedeelde Griekse eilandenreis met live synchronisatie voor Dennis, Joyce en gasten.
            </p>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 rounded-xl font-['Inter'] font-semibold text-sm transition-all cursor-pointer shadow-sm"
            >
              <Share2 className="w-4 h-4 text-amber-300" />
              Share Code
            </button>
            <button
              onClick={onExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl font-['Inter'] text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </section>

      {/* Stay Schedule Breakdown Banner ("Wanneer blijf ik waar?") */}
      <section className="mb-8 bg-[#f0f4f9] rounded-[24px] p-6 border border-[#005BAE]/20 shadow-sm">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#005BAE]" />
            <h2 className="font-[#Plus_Jakarta_Sans'] font-bold text-lg text-[#001a33]">
              Verblijfsplanning — Eiland Stopt & Hotels
            </h2>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleOpenEditStay()}
                className="text-[#005BAE] font-['Inter'] text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-[#005BAE]/30 hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Eiland Stop Toevoegen
              </button>
              <button
                onClick={() => onOpenNewBooking('trivago')}
                className="text-white font-['Inter'] text-xs font-semibold bg-[#005BAE] px-3 py-1.5 rounded-lg hover:brightness-110 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Trivago Hotel Finder
              </button>
            </div>
          )}
        </div>

        {/* Stays Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentTrip.stays.map((stay, idx) => {
            const isSelected = stay.id === activeIslandId;
            return (
              <div
                key={stay.id}
                onClick={() => setActiveIslandId(stay.id)}
                className={`p-4 rounded-xl bg-white border cursor-pointer transition-all relative group/card ${
                  isSelected
                    ? 'border-[#005BAE] ring-2 ring-[#005BAE]/20 shadow-md scale-[1.02]'
                    : 'border-[#c0c7d3]/30 hover:border-[#005BAE]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#005BAE] bg-[#f0f4f9] px-2 py-0.5 rounded">
                    Stop {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-[#404752] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#005BAE]" />
                      {stay.nights} {stay.nights === 1 ? 'nacht' : 'nachten'}
                    </span>
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditStay(stay);
                        }}
                        className="p-1 text-[#005BAE] hover:bg-[#f0f4f9] rounded"
                        title="Bewerken"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#0b1d2d] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#005BAE]" />
                  {stay.island}
                </h3>

                <p className="font-['Inter'] text-xs font-semibold text-[#005BAE] mt-1">
                  {formatDateFriendly(stay.startDate)} t/m {formatDateFriendly(stay.endDate)}
                </p>

                <div className="mt-2 pt-2 border-t border-[#f0f4f9] flex items-center justify-between">
                  <p className="font-['Inter'] text-[11px] text-[#717783] truncate flex items-center gap-1">
                    <Hotel className="w-3 h-3 text-[#005BAE]" />
                    {stay.accommodationName || 'Geen hotel gekoppeld'}
                  </p>
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewBooking('trivago', stay.island);
                      }}
                      className="text-[10px] font-bold text-[#005BAE] hover:underline flex items-center gap-0.5"
                      title="Zoek hotel suggestie via Trivago AI"
                    >
                      <Search className="w-2.5 h-2.5" />
                      Zoek
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual Map / Timeline Hybrid Area */}
      <section className="mb-12 relative">
        <div className="w-full h-72 bg-white rounded-[32px] overflow-hidden shadow-sm relative border border-[#e1efff] group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url('${MAP_IMAGE}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/50 to-transparent" />

          {/* Interactive Timeline Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className="flex justify-between items-center max-w-4xl mx-auto gap-4">
              {timelineStops.map((stop, index) => (
                <React.Fragment key={stop.id}>
                  <div
                    onClick={() => setActiveIslandId(stop.id)}
                    className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group/stop"
                  >
                    <div
                      className={`px-3 py-1.5 rounded-full bg-white flex items-center justify-center font-bold text-xs transition-all ${
                        stop.isActive
                          ? 'text-[#005BAE] border-2 border-[#005BAE] shadow-xl ring-4 ring-[#005BAE]/10 scale-110'
                          : 'text-[#0b1d2d] shadow-sm group-hover/stop:-translate-y-1'
                      }`}
                    >
                      {stop.days}
                    </div>
                    <span
                      className={`font-['Inter'] text-sm ${
                        stop.isActive ? 'text-[#005BAE] font-bold' : 'text-[#0b1d2d] font-medium'
                      }`}
                    >
                      {stop.island}
                    </span>
                    <span className="font-['Inter'] text-[10px] text-[#717783]">
                      {stop.dateRange}
                    </span>
                  </div>

                  {index < timelineStops.length - 1 && (
                    <TransportRouteConnector
                      leg={transportLegs[index]}
                      entries={transportEntries}
                      legs={transportLegs}
                      canEdit={canEdit}
                      selectedId={selectedTransportId}
                      onSelect={setSelectedTransportId}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Itinerary Details Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dynamic Day Schedules per Stay */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {currentTrip.stays.map((stay, stayIdx) => {
            const isStayActive = stay.id === activeIslandId;
            return (
              <div
                key={stay.id}
                className={`space-y-4 p-6 rounded-[28px] border transition-all ${
                  isStayActive
                    ? 'border-[#005BAE]/40 bg-white shadow-md'
                    : 'border-[#e1efff] bg-white/70'
                }`}
              >
                <div className="flex justify-between items-center pb-3 border-b border-[#f0f4f9] flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#005BAE] text-white font-bold text-xs flex items-center justify-center">
                      {stayIdx + 1}
                    </div>
                    <div>
                      <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-[#0b1d2d]">
                        Verblijf in {stay.island}
                      </h3>
                      <p className="font-['Inter'] text-xs text-[#005BAE] font-semibold">
                        {formatDateFriendly(stay.startDate)} t/m {formatDateFriendly(stay.endDate)} ({stay.nights} {stay.nights === 1 ? 'nacht' : 'nachten'})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleOpenEditStay(stay)}
                          className="text-xs font-['Inter'] font-semibold text-[#005BAE] bg-white border border-[#005BAE]/30 px-3 py-1.5 rounded-lg hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Bewerken
                        </button>

                        {(() => {
                          const linkInfo = getLinkInfo(stay);
                          if (linkInfo.state === 'linked' && linkInfo.matchedBooking) {
                            return (
                              <button
                                onClick={() => handleChangeLink(stay.id)}
                                className="text-xs font-['Inter'] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {linkInfo.matchedBooking.name}
                              </button>
                            );
                          }
                          if (linkInfo.state === 'suggested' && linkInfo.suggestedBooking) {
                            const suggestedBookingId = linkInfo.suggestedBooking.id;
                            const suggestedBookingName = linkInfo.suggestedBooking.name;
                            return (
                              <button
                                onClick={() => handleConfirmLink(stay.id, suggestedBookingId)}
                                className="text-xs font-['Inter'] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Lightbulb className="w-3.5 h-3.5" />
                                {suggestedBookingName}?
                              </button>
                            );
                          }
                          return (
                            <button
                              onClick={() => onOpenNewBooking('trivago', stay.island)}
                              className="text-xs font-['Inter'] font-semibold text-[#005BAE] bg-[#f0f4f9] border border-[#005BAE]/30 px-3 py-1.5 rounded-lg hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Koppel Hotel
                            </button>
                          );
                        })()}
                      </>
                    )}

                    {!isGuestMode && (
                      <button
                        onClick={onOpenChat}
                        className="text-xs font-['Inter'] font-semibold text-white bg-[#005BAE] px-3 py-1.5 rounded-lg hover:brightness-110 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Vraag Concierge
                      </button>
                    )}
                  </div>
                </div>

                {/* Day Cards for this Stay */}
                <div className="space-y-4">
                  {Array.from({ length: stay.nights }).map((_, dayIdx) => {
                    const globalDayNum = stayIdx * 3 + dayIdx + 1;
                    return (
                      <article
                        key={dayIdx}
                        className="p-5 bg-[#f0f4f9]/50 hover:bg-[#f0f4f9] rounded-2xl border border-[#c0c7d3]/20 transition-all space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-[#005BAE] text-white font-['Inter'] font-semibold text-xs">
                              DAG {globalDayNum}
                            </span>
                            <h4 className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">
                              {dayIdx === 0
                                ? `Aankomst & Verkenning in ${stay.island}`
                                : dayIdx === stay.nights - 1
                                ? `Highlight Tour & Voorbereiding Volgende Stop`
                                : `Stranden, Cultuur & Gastronomie in ${stay.island}`}
                            </h4>
                          </div>
                        </div>

                        {dayIdx === 0 ? (
                          <div className="space-y-2 text-xs font-['Inter'] text-[#404752]">
                            <div className="flex items-center gap-2">
                              <Ship className="w-4 h-4 text-[#005BAE]" />
                              <span>Ferry Check-in en overtocht naar {stay.island} havens</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Hotel className="w-4 h-4 text-[#005BAE]" />
                              <span>Inchecken bij {stay.accommodationName || 'Boetiekhotel in ' + stay.island}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Utensils className="w-4 h-4 text-[#005BAE]" />
                              <span>Diner bij authentieke vissers-taverne aan de zee</span>
                            </div>
                          </div>
                        ) : (
                          <p className="font-['Inter'] text-xs text-[#404752] leading-relaxed">
                            Ontdek de mooiste baaien, historische straatjes en panoramische zonsondergangspunten van {stay.island}. Athena AI past de dagplanning automatisch aan je reisstijl aan.
                          </p>
                        )}

                        {/* Booked transports derived from TransportEntry data */}
                        <TransportDayRows
                          entries={transportEntries}
                          stay={stay}
                          dayIdx={dayIdx}
                          selectedId={selectedTransportId}
                          onSelect={setSelectedTransportId}
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Accommodations & Concierge Tips */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Accommodation Panel */}
          <div className="bg-white rounded-[24px] overflow-hidden border border-[#e1efff] shadow-sm">
            <div className="p-6 bg-white border-b border-[#f0f4f9] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hotel className="w-5 h-5 text-[#005BAE]" />
                <span className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">
                  Geboekte Accommodaties
                </span>
              </div>

              <button
                onClick={() => setAccommodationsOpen(!accommodationsOpen)}
                className="p-1 text-[#717783] hover:text-[#005BAE]"
              >
                {accommodationsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {accommodationsOpen && (
              <div className="p-6 pt-4 space-y-4">
                {/* Current Trip Stays Accommodations */}
                {currentTrip.stays.map(stay => {
                  const linkInfo = getLinkInfo(stay);
                  return (
                    <div key={stay.id} className="p-3.5 bg-[#f0f4f9] rounded-xl border border-[#c0c7d3]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-['Inter'] text-xs font-bold text-[#0b1d2d]">{stay.island}</span>
                          <span className="text-[10px] bg-[#005BAE]/10 text-[#005BAE] px-1.5 py-0.5 rounded font-bold">
                            {stay.nights} nachten
                          </span>
                          {linkInfo.state === 'linked' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Gekoppeld
                            </span>
                          )}
                          {linkInfo.state === 'suggested' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" />
                              Voorgesteld
                            </span>
                          )}
                        </div>
                        <p className="font-['Inter'] text-[11px] text-[#404752] font-semibold mt-0.5 truncate">
                          {linkInfo.state === 'linked' && linkInfo.matchedBooking
                            ? linkInfo.matchedBooking.name
                            : linkInfo.state === 'suggested' && linkInfo.suggestedBooking
                            ? linkInfo.suggestedBooking.name
                            : stay.accommodationName || 'Boetiekhotel geselecteerd'}
                        </p>
                        <p className="font-['Inter'] text-[10px] text-[#005BAE] font-semibold mt-1">
                          {formatDateFriendly(stay.startDate)} – {formatDateFriendly(stay.endDate)}
                        </p>
                        {linkInfo.state === 'linked' && linkInfo.matchedBooking && (
                          <p className="font-['Inter'] text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Gekoppeld: {linkInfo.matchedBooking.name}
                          </p>
                        )}
                        {linkInfo.state === 'suggested' && linkInfo.suggestedBooking && (
                          <p className="font-['Inter'] text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            Voorgestelde match: {linkInfo.suggestedBooking.name}
                          </p>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {linkInfo.state === 'linked' && (
                            <button
                              onClick={() => handleChangeLink(stay.id)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded bg-white text-[#005BAE] border border-[#005BAE]/30 hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Wijzigen
                            </button>
                          )}
                          {linkInfo.state === 'suggested' && (
                            <>
                              <button
                                onClick={() => handleConfirmLink(stay.id, linkInfo.suggestedBooking!.id)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Bevestigen
                              </button>
                              <button
                                onClick={() => handleChangeLink(stay.id)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded bg-white text-[#005BAE] border border-[#005BAE]/30 hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer"
                              >
                                Anders koppelen
                              </button>
                            </>
                          )}
                          {linkInfo.state === 'unlinked' && (
                            <button
                              onClick={() => onOpenNewBooking('trivago', stay.island)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded bg-white text-[#005BAE] border border-[#005BAE]/30 hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer"
                            >
                              Koppelen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Action Buttons */}
                {canEdit && (
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => onOpenNewBooking('manual')}
                      className="w-full py-2.5 border border-[#005BAE] text-[#005BAE] rounded-xl font-['Inter'] text-xs font-semibold hover:bg-[#005BAE]/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Handmatig Boeking Toevoegen
                    </button>

                    <button
                      onClick={() => onOpenNewBooking('trivago')}
                      className="w-full py-2.5 bg-[#005BAE] text-white rounded-xl font-['Inter'] text-xs font-semibold hover:brightness-110 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Zoek Hotel Suggesties (Trivago Style)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ferries & Transfers Panel */}
          <TransportSidebarCard
            entries={transportEntries}
            stays={currentTrip.stays}
            canEdit={canEdit}
            onAdd={onAddTransportEntry || (() => {})}
            onUpdate={onUpdateTransportEntry || (() => {})}
            onDelete={onDeleteTransportEntry || (() => {})}
            selectedId={selectedTransportId}
            onSelect={setSelectedTransportId}
          />

          {/* Local Tips Checklist */}
          <div className="bg-white rounded-[24px] overflow-hidden border border-[#e1efff] shadow-sm">
            <button
              onClick={() => setTipsOpen(!tipsOpen)}
              className="w-full flex justify-between items-center p-6 bg-white hover:bg-[#f0f4f9] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-[#005BAE]" />
                <span className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">
                  Tips van Athena
                </span>
              </div>
              {tipsOpen ? (
                <ChevronUp className="w-5 h-5 text-[#717783]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#717783]" />
              )}
            </button>

            {tipsOpen && (
              <div className="p-6 pt-0 space-y-4">
                <ul className="space-y-3">
                  {tipsChecklist.map(tip => (
                    <li
                      key={tip.id}
                      onClick={() => toggleChecklist(tip.id)}
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      <CheckCircle2
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 transition-colors ${
                          tip.checked ? 'text-[#005BAE]' : 'text-[#c0c7d3]'
                        }`}
                      />
                      <span className="font-['Inter'] text-xs text-[#404752] group-hover:text-[#005BAE]">
                        {tip.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Weather Banner */}
          <WeatherCard trip={currentTrip} variant="banner" />
        </div>
      </div>

{/* Interactive Floating Chat Action */}
        {/* Button removed as requested */}

      {/* Edit Stay Modal */}
      <EditStayModal
        isOpen={isEditStayOpen}
        onClose={() => setIsEditStayOpen(false)}
        stayToEdit={editingStay}
        onSaveStay={onSaveStay}
      />
    </main>
  );
};
