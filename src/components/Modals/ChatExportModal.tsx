import React, { useEffect, useMemo, useState } from 'react';
import { X, CalendarPlus, Check, Utensils, Lightbulb, CheckCircle2, Ship, Hotel, LogOut, Clock } from 'lucide-react';
import type { ChatMessage, TripData, DayPlanItemType } from '../../types';

interface ChatExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  trip: TripData;
  onExport: (stayId: string, dayIdx: number, type: DayPlanItemType, text: string, time?: string) => void;
}

const TYPE_LABELS: Record<DayPlanItemType, string> = {
  activity: 'Activiteit',
  dining: 'Eettip',
  tip: 'Praktische tip',
  transport: 'Transport / Ferry',
  checkin: 'Inchecken hotel',
  checkout: 'Uitchecken hotel',
};

export const ChatExportModal: React.FC<ChatExportModalProps> = ({
  isOpen,
  onClose,
  message,
  trip,
  onExport,
}) => {
  const [stayId, setStayId] = useState<string>(() => trip.stays[0]?.id || '');
  const [dayIdx, setDayIdx] = useState(0);
  const [type, setType] = useState<DayPlanItemType>('activity');
  const [time, setTime] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStayId(trip.stays[0]?.id || '');
      setDayIdx(0);
      setType('activity');
      setTime('');
      setDone(false);
    }
  }, [isOpen, trip.stays]);

  const selectedStay = useMemo(
    () => trip.stays.find((s) => s.id === stayId) || trip.stays[0],
    [stayId, trip.stays]
  );

  const dayCount = Math.max(1, selectedStay?.nights || 1);
  const safeDayIdx = Math.min(dayIdx, dayCount - 1);

  if (!isOpen || !message) return null;

  const handleExport = () => {
    const text = message.content;
    if (!text.trim()) return;
    onExport(selectedStay?.id || '', safeDayIdx, type, text, time && time.trim() ? time.trim() : undefined);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative font-['Plus_Jakarta_Sans'] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#001a33] mb-1">Toegevoegd aan de dagplanning!</h2>
            <p className="font-['Inter'] text-sm text-[#404752] mb-5">
              {selectedStay?.island} · Dag {safeDayIdx + 1} · {TYPE_LABELS[type]}
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[#005BAE] text-white rounded-xl font-['Inter'] text-xs font-bold hover:brightness-110 transition-colors cursor-pointer"
            >
              Klaar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#005BAE] text-white flex items-center justify-center shadow-md">
                <CalendarPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#001a33]">Toevoegen aan dagplanning</h2>
                <p className="font-['Inter'] text-xs text-[#717783]">Kies waar dit antwoord terecht moet komen</p>
              </div>
            </div>

            <div className="mb-4 p-3.5 bg-[#f7f9ff] rounded-xl border border-[#c0c7d3]/20 max-h-36 overflow-y-auto">
              <span className="font-['Inter'] text-xs text-[#404752] whitespace-pre-line line-clamp-5">
                {message.content}
              </span>
            </div>

            <label className="block text-xs font-bold text-[#001a33] uppercase tracking-wider mb-1.5">
              Verblijf
            </label>
            <select
              value={selectedStay?.id || ''}
              onChange={(e) => {
                setStayId(e.target.value);
                setDayIdx(0);
              }}
              className="w-full mb-4 px-3.5 py-2.5 bg-white border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm text-[#0b1d2d] focus:outline-none focus:ring-2 focus:ring-[#005BAE]/30 cursor-pointer"
            >
              {trip.stays.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.island} ({s.startDate} t/m {s.endDate})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-[#001a33] uppercase tracking-wider mb-1.5">Dag</label>
                <select
                  value={safeDayIdx}
                  onChange={(e) => setDayIdx(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm text-[#0b1d2d] focus:outline-none focus:ring-2 focus:ring-[#005BAE]/30 cursor-pointer"
                >
                  {Array.from({ length: dayCount }).map((_, i) => (
                    <option key={i} value={i}>
                      Dag {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#001a33] uppercase tracking-wider mb-1.5">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DayPlanItemType)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm text-[#0b1d2d] focus:outline-none focus:ring-2 focus:ring-[#005BAE]/30 cursor-pointer"
                >
                  <option value="activity">Activiteit</option>
                  <option value="dining">Eettip</option>
                  <option value="tip">Praktische tip</option>
                  <option value="transport">Transport / Ferry</option>
                  <option value="checkin">Inchecken hotel</option>
                  <option value="checkout">Uitchecken hotel</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#001a33] uppercase tracking-wider mb-1.5">
                  Tijd (optioneel)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717783] pointer-events-none" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm text-[#0b1d2d] focus:outline-none focus:ring-2 focus:ring-[#005BAE]/30"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={!message.content.trim()}
              className="w-full py-3 bg-[#005BAE] text-white rounded-xl font-['Inter'] text-sm font-bold hover:brightness-110 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <CalendarPlus className="w-4 h-4" />
              Toevoegen aan dag {safeDayIdx + 1} · {TYPE_LABELS[type]}
            </button>

            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-['Inter'] text-[#717783]">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#005BAE]" /> Activiteit</span>
              <span className="flex items-center gap-1"><Utensils className="w-3 h-3 text-[#005BAE]" /> Eettip</span>
              <span className="flex items-center gap-1"><Lightbulb className="w-3 h-3 text-amber-500" /> Tip</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
