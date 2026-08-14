import React, { useState } from 'react';
import { X, Ship, CheckCircle, MapPin, MessageSquare, Clock } from 'lucide-react';
import type { TransportEntry } from '../../transport/types';

export interface MissedFerrySelection {
  label: string;
  from?: string;
  to?: string;
  date?: string;
  time?: string;
}

interface MissedFerryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestHelp: (selection: MissedFerrySelection) => void;
  bookedFerries?: TransportEntry[];
}

const EXAMPLE_OPTIONS = [
  {
    type: 'Snelle Hydrofoil',
    operator: 'Seajets WorldChampion Jet',
    departure: '14:15',
    arrival: '15:05',
    price: '€42.50',
    notes: 'Voorbeeld: direct vanaf Milos Port Gate 3. Laat Athena de actuele beschikbaarheid opzoeken.'
  },
  {
    type: 'Gewone Passagiersveerboot',
    operator: 'Blue Star Delos',
    departure: '17:30',
    arrival: '18:45',
    price: '€28.00',
    notes: 'Voorbeeld: ruim open dek. Laat Athena de actuele beschikbaarheid opzoeken.'
  }
];

export const MissedFerryModal: React.FC<MissedFerryModalProps> = ({
  isOpen,
  onClose,
  onRequestHelp,
  bookedFerries = [],
}) => {
  const [passingToChat, setPassingToChat] = useState(false);

  const ferryOptions = bookedFerries.filter((f) => f.type === 'ferry');
  const hasBookedFerries = ferryOptions.length > 0;

  if (!isOpen) return null;

  const handleRequestHelp = (selection: MissedFerrySelection) => {
    setPassingToChat(true);
    onRequestHelp(selection);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[28px] max-w-xl w-full p-6 md:p-8 shadow-2xl border border-[#ba1a1a]/30 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
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
                Noodhulp
              </span>
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33] mt-0.5">
              Hulp bij gemiste veerboot
            </h2>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-[#f0f6ff] rounded-2xl border border-[#005BAE]/20">
            <p className="font-['Inter'] text-xs text-[#002a52] leading-relaxed">
              <strong>Athena:</strong> Selecteer hieronder welke veerboot je gemist hebt. Athena zoekt
              daarna via de chat een alternatief op dezelfde route met actuele tijden.
            </p>
          </div>

          {hasBookedFerries ? (
            <div>
              <h4 className="font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-3">
                Jouw geboekte veerboten
              </h4>

              <div className="space-y-3">
                {ferryOptions.map((ferry) => {
                  const label = ferry.vesselName || ferry.operator || 'Veerboot';
                  return (
                    <div
                      key={ferry.id}
                      className="p-4 rounded-2xl border border-[#c0c7d3]/40 bg-white hover:border-[#005BAE] transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-['Inter'] text-xs font-bold text-[#005BAE]">
                            {label}
                          </span>
                          {ferry.operator && ferry.operator !== label && (
                            <span className="text-[11px] text-[#717783]">• {ferry.operator}</span>
                          )}
                        </div>
                        <p className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#001a33] mt-0.5">
                          {ferry.from} → {ferry.to}
                        </p>
                        <p className="font-['Inter'] text-xs text-[#404752] mt-1 flex items-center gap-1.5 flex-wrap">
                          <Clock className="w-3.5 h-3.5 text-[#005BAE]" />
                          {ferry.date || 'Datum onbekend'}
                          {ferry.departureTime ? ` • Vertrek ${ferry.departureTime}` : ''}
                          {ferry.arrivalTime ? ` → ${ferry.arrivalTime}` : ''}
                        </p>
                        {ferry.notes && (
                          <p className="font-['Inter'] text-[11px] text-[#717783] mt-0.5 italic">
                            {ferry.notes}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          handleRequestHelp({
                            label,
                            from: ferry.from,
                            to: ferry.to,
                            date: ferry.date,
                            time: ferry.departureTime,
                          })
                        }
                        disabled={passingToChat}
                        className="bg-[#005BAE] text-white px-5 py-2 rounded-xl font-['Inter'] text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                      >
                        {passingToChat ? 'Doorgegeven' : 'Doorgeven aan chat'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-3">
                Voorbeeld-afvaarten
              </h4>

              <div className="space-y-3">
                {EXAMPLE_OPTIONS.map((opt, idx) => (
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
                        Vertrekt: <strong>{opt.departure}</strong> → Aankomst: <strong>{opt.arrival}</strong>
                      </p>
                      <p className="font-['Inter'] text-[11px] text-[#717783] mt-0.5 italic">
                        {opt.notes}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRequestHelp({ label: opt.operator })}
                      disabled={passingToChat}
                      className="bg-[#005BAE] text-white px-5 py-2 rounded-xl font-['Inter'] text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                    >
                      {passingToChat ? 'Doorgegeven' : 'Doorgeven aan chat'}
                    </button>
                  </div>
                ))}
              </div>

              <p className="font-['Inter'] text-[11px] text-[#717783] mt-3 italic">
                Er zijn nog geen geboekte veerboten gevonden in de database — bovenstaande zijn voorbeelden.
              </p>
            </div>
          )}

          {passingToChat && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <p className="font-['Inter'] text-xs text-green-900">
                Athena zoekt nu live alternatieven voor je op in de chat. Open de chat om de opties
                te bekijken.
              </p>
            </div>
          )}

          <div className="p-4 bg-[#f0f4f9] rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#005BAE]" />
              <div>
                <p className="font-['Inter'] text-xs font-bold text-[#001a33]">Tijdelijke slaapplek nodig?</p>
                <p className="font-['Inter'] text-xs text-[#717783]">Porto Naxos Hotel (5 min lopen van de haven)</p>
              </div>
            </div>
            <span className="text-[11px] text-[#717783] italic flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Vraag Athena via de chat
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
