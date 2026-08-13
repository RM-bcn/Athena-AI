import React from 'react';
import { ActiveTab, ChatSubTab, UserAccount } from '../types';
import { USER_AVATAR } from '../data/initialData';
import { Search, LogOut, LogIn, Key, UserCheck, Eye, Menu } from 'lucide-react';

interface TopHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  chatSubTab?: ChatSubTab;
  setChatSubTab?: (subTab: ChatSubTab) => void;
  currentUser: UserAccount | null;
  isGuestMode: boolean;
  tripCode: string;
  onOpenProfile?: () => void;
  onSignOut: () => void;
  onLoginClick: () => void;
  onToggleMobileMenu?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  chatSubTab = 'current',
  setChatSubTab,
  currentUser,
  isGuestMode,
  tripCode,
  onOpenProfile,
  onSignOut,
  onLoginClick,
  onToggleMobileMenu,
}) => {
  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 flex justify-between items-center px-4 md:px-8 py-3 md:py-4 bg-white/90 backdrop-blur-xl z-40 border-b border-[#f0f4f9]">
      <div className="flex items-center gap-3 md:gap-8">
        {/* Hamburger Menu on Mobile */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-[#005BAE] hover:bg-[#f0f4f9] rounded-lg cursor-pointer transition-colors"
          title="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <span className="font-['Plus_Jakarta_Sans'] text-lg md:text-2xl font-bold text-[#005BAE] truncate">
          {activeTab === 'chat'
            ? 'Chat'
            : activeTab === 'itinerary'
            ? 'Mijn Reis'
            : activeTab === 'quick-help'
            ? 'Directe Hulp'
            : activeTab === 'login'
            ? 'Inloggen'
            : activeTab === 'settings'
            ? 'Instellingen'
            : activeTab === 'profile'
            ? 'Mijn Profiel'
            : activeTab === 'support'
            ? 'Support'
            : activeTab === 'not-found'
            ? 'Niet gevonden'
            : 'Athena AI'}
        </span>

        {/* Navigation Tabs Header */}
        <nav className="hidden md:flex gap-6 items-center">
          {activeTab === 'chat' ? (
            <>
              <button
                onClick={() => setChatSubTab && setChatSubTab('current')}
                className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                  chatSubTab === 'current'
                    ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium'
                    : 'text-[#404752] hover:text-[#005BAE]'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setChatSubTab && setChatSubTab('history')}
                className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                  chatSubTab === 'history'
                    ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium'
                    : 'text-[#404752] hover:text-[#005BAE]'
                }`}
              >
                Geschiedenis
              </button>
              <button
                onClick={() => setChatSubTab && setChatSubTab('favorites')}
                className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                  chatSubTab === 'favorites'
                    ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium'
                    : 'text-[#404752] hover:text-[#005BAE]'
                }`}
              >
                Favorieten
              </button>
            </>
          ) : (
            <>
              {currentUser && (
                <button
                  onClick={() => setActiveTab('chat')}
                  className="font-['Inter'] text-sm transition-colors py-1 cursor-pointer text-[#404752] hover:text-[#005BAE]"
                >
                  Chat
                </button>
              )}
              {(currentUser || isGuestMode) && (
                <>
                  <button
                    onClick={() => setActiveTab('itinerary')}
                    className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                      activeTab === 'itinerary' ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium' : 'text-[#404752] hover:text-[#005BAE]'
                    }`}
                  >
                    Mijn Reis
                  </button>
                  <button
                    onClick={() => setActiveTab('quick-help')}
                    className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                      activeTab === 'quick-help' ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium' : 'text-[#404752] hover:text-[#005BAE]'
                    }`}
                  >
                    Directe Hulp
                  </button>
                </>
              )}
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {activeTab === 'chat' && (
          <button className="p-2 rounded-full hover:bg-[#f0f4f9] text-[#404752] transition-colors cursor-pointer" title="Berichten zoeken">
            <Search className="w-5 h-5" />
          </button>
        )}

        {/* User Account / Guest Status Badge */}
        {currentUser ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 pl-4 border-l border-[#c0c7d3] hover:bg-[#f0f4f9] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <span className="font-['Inter'] text-xs font-bold text-[#0b1d2d] block">{currentUser.name}</span>
                <span className="font-['Inter'] text-[10px] text-[#005BAE] font-semibold block">Mede-organisator • {tripCode}</span>
              </div>
              <div className="w-9 h-9 rounded-full border-2 border-[#005BAE] overflow-hidden flex-shrink-0 bg-[#d2e4ff]">
                <img
                  src={currentUser.avatarUrl || currentUser.avatar || USER_AVATAR}
                  alt={currentUser.nickname || currentUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
            <button
              onClick={onSignOut}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
              title="Uitloggen"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : isGuestMode ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-amber-900 text-xs font-bold">
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Gastmodus ({tripCode})</span>
            </div>
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#005BAE] text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Inloggen
            </button>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#005BAE] text-white font-['Inter'] text-xs font-bold hover:brightness-110 shadow-sm cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Inloggen / Code Invoeren
          </button>
        )}
      </div>
    </header>
  );
};
