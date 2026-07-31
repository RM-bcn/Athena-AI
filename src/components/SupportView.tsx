import React from 'react';
import { LifeBuoy, PhoneCall, Mail, MessageSquare, ExternalLink } from 'lucide-react';

export const SupportView: React.FC = () => {
  return (
    <main className="md:ml-64 pt-24 min-h-screen px-6 md:px-12 pb-16 bg-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-widest block mb-1">
            Concierge Assistance
          </span>
          <h1 className="font-['Plus_Jakarta_Sans'] text-4xl font-bold text-[#0b1d2d]">
            24/7 Support & Port Assistance
          </h1>
          <p className="text-[#404752] font-['Inter'] text-sm mt-1">
            Need urgent help on island transport, hotel re-booking, or medical aid in Greece?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-[24px] border border-[#e1efff] bg-white shadow-sm hover:border-[#005BAE] transition-all">
            <div className="w-10 h-10 rounded-full bg-[#f0f4f9] text-[#005BAE] flex items-center justify-center mb-4">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#0b1d2d]">Port & Ferry Line</h3>
            <p className="font-['Inter'] text-xs text-[#717783] mt-1 mb-4">Direct contact for Aegean ferry dispatch desks</p>
            <a href="tel:+302104100000" className="text-[#005BAE] font-['Inter'] text-sm font-bold flex items-center gap-1 hover:underline">
              +30 210 410 0000 <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-6 rounded-[24px] border border-[#e1efff] bg-white shadow-sm hover:border-[#005BAE] transition-all">
            <div className="w-10 h-10 rounded-full bg-[#f0f4f9] text-[#005BAE] flex items-center justify-center mb-4">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#0b1d2d]">Concierge Desk</h3>
            <p className="font-['Inter'] text-xs text-[#717783] mt-1 mb-4">Priority support for itinerary adjustments</p>
            <a href="mailto:concierge@athena-ai.studio" className="text-[#005BAE] font-['Inter'] text-sm font-bold flex items-center gap-1 hover:underline">
              concierge@athena-ai.studio <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-6 rounded-[24px] border border-[#e1efff] bg-white shadow-sm hover:border-[#005BAE] transition-all">
            <div className="w-10 h-10 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center mb-4">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#0b1d2d]">Greece Emergency</h3>
            <p className="font-['Inter'] text-xs text-[#717783] mt-1 mb-4">European emergency number (Ambulance, Coastguard, Police)</p>
            <a href="tel:112" className="text-[#ba1a1a] font-['Inter'] text-sm font-bold flex items-center gap-1 hover:underline">
              Dial 112 <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};
