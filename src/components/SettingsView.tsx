import React from 'react';
import { Settings, Shield, Bell, Moon, Sun, Globe, User, Key } from 'lucide-react';

export const SettingsView: React.FC = () => {
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
            Manage your Athena AI concierge preferences, travel notifications & security settings.
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
                  <p className="font-['Inter'] text-xs text-[#717783]">English (US) / Greek Translation Enabled</p>
                </div>
              </div>
              <span className="font-['Inter'] text-xs font-bold text-[#005BAE] bg-[#f0f4f9] px-3 py-1.5 rounded-full">English</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[#f0f4f9] transition-colors">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-[#005BAE]" />
                <div>
                  <p className="font-['Inter'] text-sm font-semibold text-[#0b1d2d]">AI Concierge Engine</p>
                  <p className="font-['Inter'] text-xs text-[#717783]">Powered by Gemini 3.6 Flash High-Speed Reasoning</p>
                </div>
              </div>
              <span className="font-['Inter'] text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
