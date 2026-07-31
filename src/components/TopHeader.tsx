import React from 'react';
import { ActiveTab, ChatSubTab } from '../types';
import { USER_AVATAR } from '../data/initialData';
import { Search } from 'lucide-react';

interface TopHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  chatSubTab?: ChatSubTab;
  setChatSubTab?: (subTab: ChatSubTab) => void;
  userName?: string;
  onOpenProfile?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  chatSubTab = 'current',
  setChatSubTab,
  userName = "Alexandros P.",
  onOpenProfile,
}) => {
  return (
    <header className="fixed top-0 left-64 right-0 flex justify-between items-center px-8 py-4 bg-white/90 backdrop-blur-xl z-40 border-b border-[#f0f4f9]">
      <div className="flex items-center gap-8">
        <span className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#005BAE]">
          {activeTab === 'chat'
            ? 'Chat Interface'
            : activeTab === 'itinerary'
            ? 'Athena AI'
            : activeTab === 'quick-help'
            ? 'Athena AI'
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
                Current Chat
              </button>
              <button
                onClick={() => setChatSubTab && setChatSubTab('history')}
                className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                  chatSubTab === 'history'
                    ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium'
                    : 'text-[#404752] hover:text-[#005BAE]'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setChatSubTab && setChatSubTab('favorites')}
                className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                  chatSubTab === 'favorites'
                    ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium'
                    : 'text-[#404752] hover:text-[#005BAE]'
                }`}
              >
                Favorites
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('chat')}
                className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                  activeTab === 'chat' ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium' : 'text-[#404752] hover:text-[#005BAE]'
                }`}
              >
                Chat Interface
              </button>
              <button
                onClick={() => setActiveTab('itinerary')}
                className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                  activeTab === 'itinerary' ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium' : 'text-[#404752] hover:text-[#005BAE]'
                }`}
              >
                My Itinerary
              </button>
              <button
                onClick={() => setActiveTab('quick-help')}
                className={`font-['Inter'] text-sm transition-colors py-1 cursor-pointer ${
                  activeTab === 'quick-help' ? 'text-[#005BAE] border-b-2 border-[#005BAE] font-medium' : 'text-[#404752] hover:text-[#005BAE]'
                }`}
              >
                Quick Help
              </button>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {activeTab === 'chat' && (
          <button className="p-2 rounded-full hover:bg-[#f0f4f9] text-[#404752] transition-colors cursor-pointer" title="Search messages">
            <Search className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onOpenProfile}
          className="flex items-center gap-3 pl-4 border-l border-[#c0c7d3] hover:bg-[#f0f4f9] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
        >
          <span className="font-['Inter'] text-sm font-medium text-[#0b1d2d] hidden sm:inline">{userName}</span>
          <div className="w-9 h-9 rounded-full border-2 border-[#005BAE] overflow-hidden flex-shrink-0 bg-[#d2e4ff]">
            <img
              src={USER_AVATAR}
              alt={userName}
              className="w-full h-full object-cover"
            />
          </div>
        </button>
      </div>
    </header>
  );
};
