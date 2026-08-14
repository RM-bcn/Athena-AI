import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Moon, Sun, Globe, User, Key, Cpu, Sparkles, CheckCircle2, ChevronRight, ImagePlus } from 'lucide-react';
import { UserAccount } from '../types';

interface SettingsViewProps {
  currentUser: UserAccount | null;
  onOpenProfile: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onOpenProfile }) => {
  const [aiEngine, setAiEngine] = useState<string>('Groq Llama-3.3-70B (Primair)');
  const [hasGroq, setHasGroq] = useState<boolean>(true);
  const [statusUnknown, setStatusUnknown] = useState(false);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeEngine) {
          setAiEngine(data.activeEngine);
          setHasGroq(!!data.hasGroqKey);
        }
      })
      .catch(() => setStatusUnknown(true));
  }, []);

  const displayName = currentUser?.nickname || currentUser?.name || 'Gast';
  const displayEmail = currentUser?.email || 'Niet ingelogd';
  const avatarSrc = currentUser?.avatarUrl || currentUser?.avatar;

  return (
    <main className="md:ml-64 pt-24 min-h-screen px-6 md:px-12 pb-16 bg-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-widest block mb-1">
            Voorkeuren
          </span>
          <h1 className="font-['Plus_Jakarta_Sans'] text-4xl font-bold text-[#0b1d2d]">
            Instellingen &amp; Concierge Opties
          </h1>
          <p className="text-[#404752] font-['Inter'] text-sm mt-1">
            Beheer je Athena AI-conciergevoorkeuren, reisnotificaties en AI-engine-instellingen.
          </p>
        </div>

        <div className="bg-white rounded-[24px] border border-[#e1efff] p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#f0f4f9]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#f0f4f9] text-[#005BAE] flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">{displayName}</h3>
                <p className="font-['Inter'] text-xs text-[#717783] break-all">{displayEmail}</p>
                <p className="font-['Inter'] text-[10px] text-[#005BAE] font-semibold mt-0.5">
                  {currentUser ? `Reiscode: ${currentUser.tripCode}` : 'Reiscode: ATH-2026'}
                </p>
              </div>
            </div>
            {currentUser && (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#005BAE] text-white font-['Inter'] text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer flex-shrink-0"
              >
                <ImagePlus className="w-4 h-4" />
                Mijn Profiel
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f0f4f9] transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#005BAE]" />
                <div>
                  <p className="font-['Inter'] text-sm font-semibold text-[#0b1d2d]">Veerboot- &amp; Gate-Alerts</p>
                  <p className="font-['Inter'] text-xs text-[#717783]">Binnenkort · Pushmeldingen voor Cycladen-veerboten</p>
                </div>
              </div>
              <input type="checkbox" disabled className="w-5 h-5 accent-[#005BAE] rounded cursor-not-allowed opacity-50" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f0f4f9] transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[#005BAE]" />
                <div>
                  <p className="font-['Inter'] text-sm font-semibold text-[#0b1d2d]">Taal</p>
                  <p className="font-['Inter'] text-xs text-[#717783]">Vertalingen Engels/Grieks beschikbaar in de chat.</p>
                </div>
              </div>
              <span className="font-['Inter'] text-xs font-bold text-[#005BAE] bg-[#f0f4f9] px-3 py-1.5 rounded-full">Nederlands</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50/50 border border-orange-200/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-['Inter'] text-sm font-bold text-[#0b1d2d]">AI Chat Engine (Groq primair)</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
                      GROQ AI
                    </span>
                  </div>
                  <p className="font-['Inter'] text-xs text-[#404752] mt-0.5">
                    Actieve motor: <strong className="text-orange-950">{aiEngine}</strong>
                  </p>
                  <p className="font-['Inter'] text-[11px] text-gray-500 mt-0.5">
                    Groq Key (<code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">GROQ_API_KEY</code>) is primair ingesteld in de backend.
                  </p>
                </div>
              </div>
              {statusUnknown ? (
                <span className="font-['Inter'] text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-300">
                  Status onbekend
                </span>
              ) : hasGroq ? (
                <span className="font-['Inter'] text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  GROQ ACTIEF
                </span>
              ) : (
                <span className="font-['Inter'] text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-300">
                  GROQ NIET BESCHIKBAAR
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

