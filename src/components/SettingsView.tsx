import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Moon, Sun, Globe, User, Key, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [aiEngine, setAiEngine] = useState<string>('Groq Llama-3.3-70B (Primary)');
  const [hasGroq, setHasGroq] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeEngine) {
          setAiEngine(data.activeEngine);
          setHasGroq(data.hasGroqKey);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="md:ml-64 pt-24 min-h-screen px-6 md:px-12 pb-16 bg-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-widest block mb-1">
            Preferences
          </span>
          <h1 className="font-['Plus_Jakarta_Sans'] text-4xl font-bold text-[#0b1d2d]">
            Settings & Concierge Options
          </h1>
          <p className="text-[#404752] font-['Inter'] text-sm mt-1">
            Manage your Athena AI concierge preferences, travel notifications & AI engine settings.
          </p>
        </div>

        <div className="bg-white rounded-[24px] border border-[#e1efff] p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-[#f0f4f9]">
            <div className="w-12 h-12 rounded-2xl bg-[#f0f4f9] text-[#005BAE] flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">Traveler Profile</h3>
              <p className="font-['Inter'] text-xs text-[#717783]">Alexandros P. • dennis.van.rooden@gmail.com</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f0f4f9] transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#005BAE]" />
                <div>
                  <p className="font-['Inter'] text-sm font-semibold text-[#0b1d2d]">Ferry Delay & Gate Alerts</p>
                  <p className="font-['Inter'] text-xs text-[#717783]">Real-time push notifications for Cyclades ferries</p>
                </div>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#005BAE] rounded cursor-pointer" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f0f4f9] transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[#005BAE]" />
                <div>
                  <p className="font-['Inter'] text-sm font-semibold text-[#0b1d2d]">Default Language</p>
                  <p className="font-['Inter'] text-xs text-[#717783]">English (US) / Dutch & Greek Translation Enabled</p>
                </div>
              </div>
              <span className="font-['Inter'] text-xs font-bold text-[#005BAE] bg-[#f0f4f9] px-3 py-1.5 rounded-full">English / Dutch</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50/50 border border-orange-200/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-['Inter'] text-sm font-bold text-[#0b1d2d]">AI Chat Engine (Groq Primary)</p>
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
              <span className="font-['Inter'] text-xs font-bold text-orange-800 bg-orange-100 px-3 py-1 rounded-full border border-orange-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                GROQ READY
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

