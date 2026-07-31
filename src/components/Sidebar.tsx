import React from 'react';
import { ActiveTab } from '../types';
import { Sailboat, MessageSquare, Calendar, HelpCircle, Plus, Settings, LifeBuoy } from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTrip: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenNewTrip }) => {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-white flex flex-col p-4 z-50 border-r border-[#e1efff] shadow-[1px_0_10px_rgba(0,91,174,0.08)]">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-full bg-[#005BAE] flex items-center justify-center text-white shadow-md">
          <Sailboat className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-[#005BAE] leading-none">Athena AI</h1>
          <p className="font-['Inter'] text-xs text-[#717783] opacity-80 mt-1">Mediterranean Concierge</p>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={onOpenNewTrip}
        className="w-full bg-[#005BAE] text-white py-3 rounded-xl font-['Inter'] font-semibold text-sm flex items-center justify-center gap-2 mb-6 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#005BAE]/20 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        New Trip
      </button>

      {/* Navigation Tabs */}
      <nav className="flex-1 space-y-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] font-medium text-sm transition-all duration-300 text-left cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-[#005BAE] text-white shadow-sm'
              : 'text-[#404752] hover:bg-[#f0f4f9]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat Interface
        </button>

        <button
          onClick={() => setActiveTab('itinerary')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] font-medium text-sm transition-all duration-300 text-left cursor-pointer ${
            activeTab === 'itinerary'
              ? 'bg-[#005BAE] text-white shadow-sm'
              : 'text-[#404752] hover:bg-[#f0f4f9]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          My Itinerary
        </button>

        <button
          onClick={() => setActiveTab('quick-help')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] font-medium text-sm transition-all duration-300 text-left cursor-pointer ${
            activeTab === 'quick-help'
              ? 'bg-[#005BAE] text-white shadow-sm'
              : 'text-[#404752] hover:bg-[#f0f4f9]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Quick Help
        </button>
      </nav>

      {/* Footer Tabs */}
      <div className="pt-4 border-t border-[#c0c7d3]/30 space-y-1">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] font-medium text-sm transition-all text-left cursor-pointer ${
            activeTab === 'settings' ? 'bg-[#f0f4f9] text-[#005BAE]' : 'text-[#404752] hover:bg-[#f0f4f9]'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] font-medium text-sm transition-all text-left cursor-pointer ${
            activeTab === 'support' ? 'bg-[#f0f4f9] text-[#005BAE]' : 'text-[#404752] hover:bg-[#f0f4f9]'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          Support
        </button>
      </div>
    </aside>
  );
};
