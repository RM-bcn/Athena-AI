import React, { useState } from 'react';
import { X, Ship, Clock, AlertTriangle, CheckCircle, MapPin, PhoneCall } from 'lucide-react';
import { FerryResolution } from '../../types';

interface MissedFerryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAlternative: (optionName: string) => void;
}

export const MissedFerryModal: React.FC<MissedFerryModalProps> = ({
  isOpen,
  onClose,
  onBookAlternative,
}) => {
  const [loading, setLoading] = useState(false);
  const [bookedOption, setBookedOption] = useState<string | null>(null);

  const [resolution] = useState<FerryResolution>({
    status: 'Alternatives Available',
    options: [
      {
        type: 'High-speed Hydrofoil',
        operator: 'Seajets WorldChampion Jet',
        departure: '14:15 AM',
        arrival: '15:05 PM',
        price: '€42.50',
        notes: 'Direct from Milos Port Gate 3. 12 seats remaining.'
      },
      {
        type: 'Conventional Passenger Ferry',
        operator: 'Blue Star Delos',
        departure: '17:30 PM',
        arrival: '18:45 PM',
        price: '€28.00',
        notes: 'Spacious outdoor deck. Smooth in Meltemi winds.'
      }
    ],
    recommendedHotel: 'Porto Naxos Hotel (5 min walk from port)',
    advice: 'Athena has notified your Naxos hotel about the updated arrival time. Your booking deposit is preserved.'
  });

  if (!isOpen) return null;

  const handleBook = (operator: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setBookedOption(operator);
      onBookAlternative(operator);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[28px] max-w-xl w-full p-8 shadow-2xl border border-[#ba1a1a]/30 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center font-bold">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-red-100 text-[#ba1a1a] font-['Inter'] text-[10px] font-bold rounded-full uppercase">
                Emergency Concierge
              </span>
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33] mt-0.5">
              Missed Ferry Departure Assistant
            </h2>
          </div>
        </div>

        {bookedOption ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-green-900">
              Seat Hold Confirmed!
            </h3>
            <p className="font-['Inter'] text-sm text-green-800">
              Athena has requested e-tickets for <strong>{bookedOption}</strong>. Electronic boarding passes will be sent to your email.
            </p>
            <button
              onClick={onClose}
              className="bg-[#005BAE] text-white px-6 py-2.5 rounded-xl font-['Inter'] text-sm font-semibold hover:brightness-110 transition-all cursor-pointer"
            >
              Back to Itinerary
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-[#f0f6ff] rounded-2xl border border-[#005BAE]/20">
              <p className="font-['Inter'] text-xs text-[#002a52] leading-relaxed">
                <strong>Athena Status:</strong> {resolution.advice}
              </p>
            </div>

            <div>
              <h4 className="font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-3">
                Next Available Departures Today
              </h4>

              <div className="space-y-3">
                {resolution.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-[#c0c7d3]/40 bg-white hover:border-[#005BAE] transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-['Inter'] text-xs font-bold text-[#005BAE]">
                          {opt.type}
                        </span>
                        <span className="text-[11px] text-[#717783]">• {opt.price}</span>
                      </div>
                      <p className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#001a33] mt-0.5">
                        {opt.operator}
                      </p>
                      <p className="font-['Inter'] text-xs text-[#404752] mt-1">
                        Departs: <strong>{opt.departure}</strong> → Arrives: <strong>{opt.arrival}</strong>
                      </p>
                      <p className="font-['Inter'] text-[11px] text-[#717783] mt-0.5 italic">
                        {opt.notes}
                      </p>
                    </div>

                    <button
                      onClick={() => handleBook(opt.operator)}
                      disabled={loading}
                      className="bg-[#005BAE] text-white px-5 py-2 rounded-xl font-['Inter'] text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                    >
                      {loading ? 'Holding...' : 'Book Now'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#f0f4f9] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#005BAE]" />
                <div>
                  <p className="font-['Inter'] text-xs font-bold text-[#001a33]">Need a temporary room?</p>
                  <p className="font-['Inter'] text-xs text-[#717783]">{resolution.recommendedHotel}</p>
                </div>
              </div>
              <button
                onClick={() => alert(`Calling ${resolution.recommendedHotel} front desk...`)}
                className="px-3 py-1.5 bg-white text-[#005BAE] border border-[#005BAE]/30 rounded-lg font-['Inter'] text-xs font-medium hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Call Hotel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
