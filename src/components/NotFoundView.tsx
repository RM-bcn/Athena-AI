import React from 'react';
import { Compass, Anchor, ArrowLeft, Map, Calendar, HelpCircle, MessageSquare } from 'lucide-react';

interface NotFoundViewProps {
  onReturnHome: () => void;
  onGoBack: () => void;
  onNavigateTab: (tab: 'itinerary' | 'quick-help' | 'chat') => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onReturnHome,
  onGoBack,
  onNavigateTab,
}) => {
  return (
    <div className="md:ml-64 min-h-screen bg-white text-[#151c26] font-['Plus_Jakarta_Sans'] flex flex-col items-center justify-center relative overflow-hidden py-12 px-6">
      {/* Background Decorative Patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,91,174,0.05)_0%,transparent_70%)] pointer-events-none" />

      <main className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Animated Visual Component */}
        <div className="relative w-full max-w-lg aspect-video mb-8 flex items-center justify-center">
          <h1 className="absolute text-[10rem] md:text-[18rem] font-extrabold text-[#005BAE] opacity-10 select-none tracking-tighter leading-none -z-10">
            404
          </h1>

          {/* Central Graphic */}
          <div className="relative z-10 animate-bounce" style={{ animationDuration: '4s' }}>
            <div className="bg-white p-8 rounded-full shadow-2xl border border-[#F0F4F9] flex items-center justify-center relative">
              <Compass className="w-20 h-20 text-[#005BAE] animate-spin" style={{ animationDuration: '30s' }} />
            </div>

            <div className="absolute -top-3 -right-8 bg-[#005BAE] text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transform rotate-12">
              <span className="material-symbols-outlined text-sm">sailing</span>
              Lost at Sea
            </div>
          </div>
        </div>

        {/* Typography Cluster */}
        <div className="max-w-xl space-y-4">
          <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-3xl md:text-5xl text-[#0B1D2D] leading-tight">
            Oops! This island seems to be missing from our map.
          </h2>
          <p className="font-['Plus_Jakarta_Sans'] text-base md:text-lg text-[#4f6073] px-4 leading-relaxed">
            The digital winds have blown you off course. Fear not, traveler—even the wisest mentors occasionally lose their way in the vast Aegean of information.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button
            onClick={onReturnHome}
            className="bg-[#005BAE] text-white px-8 py-4 rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-sm flex items-center justify-center gap-3 hover:bg-[#0B1D2D] active:scale-95 transition-all shadow-lg shadow-[#005BAE]/20 cursor-pointer"
          >
            <Anchor className="w-5 h-5" />
            Return to Main Port
          </button>

          <button
            onClick={onGoBack}
            className="border-2 border-[#005BAE] text-[#005BAE] px-8 py-4 rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-sm flex items-center justify-center gap-3 hover:bg-[#005BAE]/5 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back One League
          </button>
        </div>

        {/* Secondary Information Links */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div
            onClick={() => onNavigateTab('chat')}
            className="bg-[#F0F4F9]/60 p-6 rounded-2xl border border-[#F0F4F9] hover:border-[#005BAE]/30 transition-colors group cursor-pointer"
          >
            <MessageSquare className="w-6 h-6 text-[#005BAE] mb-3" />
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#0B1D2D] mb-1">
              Talk to Athena AI
            </h3>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#4f6073]">
              Consult with Athena for your Aegean travel needs.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('itinerary')}
            className="bg-[#F0F4F9]/60 p-6 rounded-2xl border border-[#F0F4F9] hover:border-[#005BAE]/30 transition-colors group cursor-pointer"
          >
            <Calendar className="w-6 h-6 text-[#E2725B] mb-3" />
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#0B1D2D] mb-1">
              My Itinerary
            </h3>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#4f6073]">
              Review your saved Cyclades island stops & stays.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('quick-help')}
            className="bg-[#F0F4F9]/60 p-6 rounded-2xl border border-[#F0F4F9] hover:border-[#005BAE]/30 transition-colors group cursor-pointer"
          >
            <HelpCircle className="w-6 h-6 text-[#005BAE] mb-3" />
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#0B1D2D] mb-1">
              Quick Help Hub
            </h3>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#4f6073]">
              Resolve missed ferries, translate menus, or find taxis.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
