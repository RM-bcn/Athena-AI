import React, { useState, useEffect } from 'react';
import {
  MISSED_FERRY_IMAGE,
  TAVERNA_IMAGE,
  QUIET_BEACH_IMAGE
} from '../data/initialData';
import {
  Ship,
  Camera,
  ArrowRight,
  Sun,
  MapPin,
  AlertTriangle,
  Cross,
  MessageSquare
} from 'lucide-react';

interface QuickHelpViewProps {
  onOpenMissedFerry: () => void;
  onOpenTranslateMenu: () => void;
  onOpenTavernas: () => void;
  onOpenBeaches: () => void;
  onOpenChat: () => void;
  onFindPharmacy: () => void;
  isGuestMode?: boolean;
}

export const QuickHelpView: React.FC<QuickHelpViewProps> = ({
  onOpenMissedFerry,
  onOpenTranslateMenu,
  onOpenTavernas,
  onOpenBeaches,
  onOpenChat,
  onFindPharmacy,
  isGuestMode = false,
}) => {
  const [localTime, setLocalTime] = useState<string>('08:01');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTime(
        now.toLocaleTimeString('nl-NL', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Athens',
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="md:ml-64 min-h-screen px-4 md:px-12 pt-20 md:pt-24 pb-12 relative overflow-hidden bg-white">
      {/* Mediterranean Background Decorative Auras */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#005BAE]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#005BAE]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Section */}
      <div className="max-w-5xl mx-auto mb-12">
        <header className="flex flex-col gap-2">
          <span className="text-[#005BAE] font-['Inter'] text-xs tracking-widest uppercase font-bold">
            Immediate Assistance
          </span>
          <h2 className="font-['Plus_Jakarta_Sans'] text-4xl md:text-5xl font-bold text-[#002a52]">
            How can I help you, Traveler?
          </h2>
          <p className="font-['Inter'] text-base md:text-lg text-[#404752] max-w-2xl mt-1">
            Athena is here to smooth out your Greek odyssey. Select an urgent task or describe your situation.
          </p>
        </header>
      </div>

      {/* Help Bento Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-12 gap-6">
        {/* Urgent: Missed Ferry (Large High-Priority Card) */}
        <div
          onClick={onOpenMissedFerry}
          className="col-span-12 md:col-span-8 group cursor-pointer"
        >
          <div className="h-full bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,91,174,0.12)] transition-all duration-300 border border-[#c0c7d3]/30 flex flex-col md:flex-row gap-8 relative overflow-hidden">
            <div className="flex-1 relative z-10">
              <div className="w-12 h-12 bg-red-100 text-[#ba1a1a] rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Ship className="w-6 h-6" />
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-semibold text-[#002a52] mb-3">
                I missed my ferry
              </h3>
              <p className="font-['Inter'] text-sm text-[#404752] mb-8 leading-relaxed">
                Don't worry. I'll check the next departures from your current port, look for alternative hydrofoils, or find a nearby hotel if needed.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMissedFerry();
                }}
                className="bg-[#ba1a1a] text-white px-6 py-3 rounded-full font-['Inter'] font-semibold text-sm flex items-center gap-2 active:scale-95 transition-transform hover:brightness-110 shadow-md cursor-pointer"
              >
                Resolve Departure
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full md:w-1/3 h-48 md:h-auto rounded-2xl overflow-hidden relative grayscale-[20%] group-hover:grayscale-0 transition-all duration-500 shadow-sm">
              <img
                src={MISSED_FERRY_IMAGE}
                alt="Ferry boat at Greek port"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </div>

        {/* Translate Menu (Medium Interactive Card) */}
        <div
          onClick={onOpenTranslateMenu}
          className="col-span-12 md:col-span-4 group cursor-pointer"
        >
          <div className="h-full bg-[#005BAE] text-white rounded-[24px] p-8 shadow-[0_16px_24px_rgba(0,91,174,0.15)] hover:shadow-[0_24px_48px_rgba(0,91,174,0.25)] transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center mb-6">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-semibold mb-2">
                Translate this menu
              </h3>
              <p className="font-['Inter'] text-sm text-white/80 leading-relaxed">
                Snap a photo to decipher local delicacies and ingredients.
              </p>
            </div>

            <div className="mt-8 border-2 border-dashed border-white/40 rounded-xl p-4 flex flex-col items-center gap-2 group-hover:border-white/80 transition-colors bg-white/5">
              <Camera className="w-8 h-8 text-white/90" />
              <span className="font-['Inter'] text-xs font-semibold">Open Camera</span>
            </div>
          </div>
        </div>

        {/* Recommend Taverna (Standard Card) */}
        <div
          onClick={onOpenTavernas}
          className="col-span-12 md:col-span-6 group cursor-pointer"
        >
          <div className="h-full bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,91,174,0.12)] transition-all duration-300 flex items-start gap-6 border border-[#c0c7d3]/30">
            <div className="shrink-0 w-16 h-16 rounded-2xl overflow-hidden shadow-sm">
              <img
                src={TAVERNA_IMAGE}
                alt="Greek Taverna"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-semibold text-[#002a52] mb-2">
                Recommend a nearby taverna
              </h3>
              <p className="font-['Inter'] text-sm text-[#404752] mb-4 leading-relaxed">
                Finding the most authentic local flavors based on your current location.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-[#f0f6ff] text-[#005BAE] rounded-full text-[11px] font-bold uppercase tracking-wider">
                  AUTHENTIC
                </span>
                <span className="px-3 py-1 bg-[#f0f6ff] text-[#005BAE] rounded-full text-[11px] font-bold uppercase tracking-wider">
                  WALKING DISTANCE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Find Quiet Beach (Standard Card) */}
        <div
          onClick={onOpenBeaches}
          className="col-span-12 md:col-span-6 group cursor-pointer"
        >
          <div className="h-full bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,91,174,0.12)] transition-all duration-300 flex items-start gap-6 border border-[#c0c7d3]/30">
            <div className="shrink-0 w-16 h-16 rounded-2xl overflow-hidden shadow-sm">
              <img
                src={QUIET_BEACH_IMAGE}
                alt="Quiet Beach"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-semibold text-[#002a52] mb-2">
                Find a quiet beach
              </h3>
              <p className="font-['Inter'] text-sm text-[#404752] mb-4 leading-relaxed">
                Escaping the crowds? I know the hidden coves that only locals visit.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-[#f0f6ff] text-[#005BAE] rounded-full text-[11px] font-bold uppercase tracking-wider">
                  SECLUDED
                </span>
                <span className="px-3 py-1 bg-[#f0f6ff] text-[#005BAE] rounded-full text-[11px] font-bold uppercase tracking-wider">
                  NATURAL
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="col-span-12 mt-2">
          <div className="bg-[#f0f6ff]/70 border border-[#c0c7d3]/20 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white border border-[#005BAE]/20 rounded-full flex items-center justify-center text-[#005BAE] shadow-sm">
                <Sun className="w-5 h-5 animate-spin" style={{ animationDuration: '15s' }} />
              </div>
              <div>
                <p className="font-['Inter'] text-xs font-semibold text-[#404752]">Tijd op de Cycladen</p>
                <p className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#005BAE]">{localTime}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="https://www.google.com/maps/search/taxi+near+me"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white text-[#005BAE] border border-[#005BAE]/30 rounded-full font-['Inter'] text-xs font-medium hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer flex flex-col items-center leading-tight shadow-sm"
              >
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Zoek taxi in de buurt
                </span>
                <span className="text-[10px] font-normal opacity-70">via Google Maps</span>
              </a>

              <a
                href="tel:112"
                className="px-4 py-2 bg-[#ba1a1a] text-white border border-[#ba1a1a]/30 rounded-full font-['Inter'] text-xs font-bold hover:brightness-110 transition-colors cursor-pointer flex flex-col items-center leading-tight shadow-md"
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Bel nu 112
                </span>
                <span className="text-[10px] font-normal opacity-80">Europees alarmnummer in Griekenland</span>
              </a>

              <button
                onClick={onFindPharmacy}
                className="px-4 py-2 bg-white text-[#005BAE] border border-[#005BAE]/30 rounded-full font-['Inter'] text-xs font-medium hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Cross className="w-3.5 h-3.5" />
                Pharmacy Nearby
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Chat Button */}
      {!isGuestMode && (
        <div className="fixed bottom-16 md:bottom-10 right-4 md:right-10 z-50">
          <button
            onClick={onOpenChat}
            className="w-12 h-12 md:w-14 md:h-14 bg-[#005BAE] text-white rounded-full shadow-2xl flex items-center justify-center group active:scale-90 transition-all hover:w-40 hover:rounded-2xl cursor-pointer"
          >
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
            <span className="hidden group-hover:inline ml-2 font-['Inter'] text-xs font-semibold whitespace-nowrap overflow-hidden">
              Type a custom request
            </span>
          </button>
        </div>
      )}
    </main>
  );
};
