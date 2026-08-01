import React from 'react';
import { ActiveTab, UserAccount } from '../types';
import { Sailboat, MessageSquare, Calendar, HelpCircle, Plus, Settings, LifeBuoy, LogOut, LogIn, Key, User, X } from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTrip: () => void;
  currentUser: UserAccount | null;
  isGuestMode: boolean;
  tripCode: string;
  onSignOut: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTrip,
  currentUser,
  isGuestMode,
  tripCode,
  onSignOut,
  isOpen = false,
  onClose,
}) => {
  const handleNavClick = (tab?: ActiveTab, action?: () => void) => {
    if (tab) setActiveTab(tab);
    if (action) action();
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`h-screen w-64 fixed left-0 top-0 bg-white flex flex-col p-4 z-50 border-r border-[#e1efff] shadow-[1px_0_10px_rgba(0,91,174,0.08)] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header & Mobile Close */}
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#005BAE] flex items-center justify-center text-white shadow-md">
              <Sailboat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-[#005BAE] leading-none">Athena AI</h1>
              <p className="font-['Inter'] text-xs text-[#717783] opacity-80 mt-1">Mediterranean Concierge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* User / Trip Badge Box */}
      <div className="mb-4 p-3 rounded-xl bg-[#f0f4f9] border border-[#005BAE]/10 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#005BAE]">Gedeelde Reis</span>
          <span className="text-[10px] font-bold text-[#E2725B] bg-[#E2725B]/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Key className="w-2.5 h-2.5" />
            {tripCode}
          </span>
        </div>
        <p className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#0b1d2d] truncate">
          Cyclades Odyssey 2026
        </p>
        {currentUser ? (
          <p className="font-['Inter'] text-[11px] text-[#005BAE] font-medium truncate flex items-center gap-1">
            <User className="w-3 h-3 text-[#005BAE]" />
            Ingelogd: {currentUser.name}
          </p>
        ) : isGuestMode ? (
          <p className="font-['Inter'] text-[11px] text-amber-700 font-medium">
            Gast (Leesmodus)
          </p>
        ) : (
          <p className="font-['Inter'] text-[11px] text-[#717783]">
            Niet ingelogd
          </p>
        )}
      </div>

      {/* Primary Action Button */}
      <button
        onClick={() => handleNavClick(undefined, onOpenNewTrip)}
        className="w-full bg-[#005BAE] text-white py-3 rounded-xl font-['Inter'] font-semibold text-sm flex items-center justify-center gap-2 mb-6 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#005BAE]/20 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Nieuwe Reis Plannen
      </button>

      {/* Navigation Tabs */}
      <nav className="flex-1 space-y-2">
        <button
          onClick={() => handleNavClick('itinerary')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] font-medium text-sm transition-all duration-300 text-left cursor-pointer ${
            activeTab === 'itinerary'
              ? 'bg-[#005BAE] text-white shadow-sm'
              : 'text-[#404752] hover:bg-[#f0f4f9]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Mijn Itinerary
        </button>

        <button
          onClick={() => handleNavClick('chat')}
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
          onClick={() => handleNavClick('quick-help')}
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

      {/* Footer Tabs & Account Action */}
      <div className="pt-4 border-t border-[#c0c7d3]/30 space-y-1">
        <button
          onClick={() => handleNavClick('settings')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-['Inter'] font-medium text-xs transition-all text-left cursor-pointer ${
            activeTab === 'settings' ? 'bg-[#f0f4f9] text-[#005BAE]' : 'text-[#404752] hover:bg-[#f0f4f9]'
          }`}
        >
          <Settings className="w-4 h-4" />
          Instellingen
        </button>

        <button
          onClick={() => handleNavClick('support')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-['Inter'] font-medium text-xs transition-all text-left cursor-pointer ${
            activeTab === 'support' ? 'bg-[#f0f4f9] text-[#005BAE]' : 'text-[#404752] hover:bg-[#f0f4f9]'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          Support
        </button>

        {currentUser ? (
          <button
            onClick={() => handleNavClick(undefined, onSignOut)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-['Inter'] font-semibold text-xs text-red-600 hover:bg-red-50 transition-all text-left cursor-pointer mt-2"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            Uitloggen ({currentUser.username})
          </button>
        ) : (
          <button
            onClick={() => handleNavClick('login')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-['Inter'] font-semibold text-xs transition-all text-left cursor-pointer mt-2 ${
              activeTab === 'login' ? 'bg-[#005BAE] text-white' : 'bg-[#f0f4f9] text-[#005BAE] hover:bg-[#005BAE] hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Inloggen / Reiscode
          </button>
        )}
      </div>
    </aside>
  </>
  );
};
