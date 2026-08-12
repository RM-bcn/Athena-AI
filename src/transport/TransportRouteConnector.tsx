import React from 'react';
import { Ship, Plus } from 'lucide-react';
import type { TransportEntry, TransportLeg } from './types';
import { resolveLegId, earliestEntry } from './transportLogic';
import { TransportIcon } from './TransportIcon';

interface Props {
  leg: TransportLeg;
  entries: TransportEntry[];
  legs: TransportLeg[];
  canEdit: boolean;
  /** Id of the transport that is "popped out" (selected). */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

/**
 * Renders the connector between two consecutive stay cards in the top route
 * overview. When a TransportEntry is linked to this leg the entry's type icon
 * is shown (instead of the generic ferry icon) plus a small label with
 * departure time and operator. Unlinked legs keep the generic icon with a
 * subtle "+" affordance that opens the add-transport form pre-filled.
 */
export const TransportRouteConnector: React.FC<Props> = ({ leg, entries, legs, canEdit, selectedId, onSelect }) => {
  const linkedEntries = entries.filter((e) => resolveLegId(e, legs).linkedLegId === leg.id);
  const earliest = earliestEntry(linkedEntries);

  const openFormForLeg = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('athena:transport-form', { detail: leg })
    );
  };

  if (earliest) {
    const label = [
      earliest.departureTime || '',
      earliest.operator || '',
    ].filter(Boolean).join(' · ');

    const stack = linkedEntries.slice(0, 3);
    const isSelected = linkedEntries.some((e) => e.id === selectedId);
    const onConnectorClick = () => onSelect?.(earliest.id);

    return (
      <div
        onClick={onConnectorClick}
        className={`flex-1 min-w-[50px] h-[2px] relative transition-all cursor-pointer ${
          isSelected
            ? 'bg-[#005BAE]'
            : 'bg-[#005BAE]/20 group-hover:bg-[#005BAE]/40'
        }`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
          <div className={`flex items-center justify-center gap-0.5 bg-white rounded-full shadow px-1.5 py-0.5 border transition-all ${
            isSelected
              ? 'border-[#005BAE] ring-2 ring-[#005BAE]/20 scale-[1.15]'
              : 'border-[#005BAE]/20 group-hover:border-[#005BAE]/40'
          }`}>
            {stack.map((entry) => (
              <TransportIcon
                key={entry.id}
                type={entry.type}
                className="w-4 h-4 text-[#005BAE]"
              />
            ))}
          </div>
          {label && (
            <span className={`font-['Inter'] text-[10px] font-bold text-[#005BAE] bg-white/95 px-1.5 py-px rounded-full whitespace-nowrap shadow-sm ${
              isSelected ? 'ring-1 ring-[#005BAE]/30' : ''
            }`}>
              {label}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[50px] h-[2px] bg-[#005BAE]/20 relative">
      {canEdit && (
        <button
          onClick={openFormForLeg}
          title={`Voeg transport toe: ${leg.fromCity} → ${leg.toCity}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-white border border-[#005BAE]/30 text-[#005BAE] hover:bg-[#005BAE] hover:text-white transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
      {!canEdit && (
        <Ship className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-[#005BAE]" />
      )}
    </div>
  );
};
