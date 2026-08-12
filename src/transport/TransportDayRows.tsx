import React from 'react';
import type { IslandStay } from '../types';
import type { TransportEntry } from './types';
import { parseDate, transportTypeLabel } from './transportLogic';
import { TransportIcon } from './TransportIcon';

interface Props {
  entries: TransportEntry[];
  stay: IslandStay;
  dayIdx: number;
  /** Id of the transport that is "popped out" (selected). */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

/**
 * Renders extra activity rows on a day card for every TransportEntry whose
 * date matches that day. Rows are DERIVED from the TransportEntry data
 * (single source of truth) — no duplicated static text.
 */
export const TransportDayRows: React.FC<Props> = ({ entries, stay, dayIdx, selectedId, onSelect }) => {
  if (!entries.length || !stay.startDate) return null;

  const dayDate = (() => {
    const start = parseDate(stay.startDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + dayIdx);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const dayEntries = entries
    .filter((e) => e.date === dayDate)
    .sort((a, b) => (a.departureTime || '99:99').localeCompare(b.departureTime || '99:99'));

  if (!dayEntries.length) return null;

  return (
    <div className="space-y-2 text-xs font-['Inter'] text-[#404752]">
      {dayEntries.map((entry) => {
        const isSelected = entry.id === selectedId;
        return (
          <div
            key={entry.id}
            onClick={() => onSelect?.(entry.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all cursor-pointer group ${
              isSelected
                ? 'bg-white border-[#005BAE] ring-2 ring-[#005BAE]/20 shadow-sm scale-[1.02]'
                : 'border-transparent hover:border-[#005BAE]/30 hover:bg-white'
            }`}
          >
            <TransportIcon type={entry.type} className="w-4 h-4 text-[#005BAE]" />
            <span>
              {entry.departureTime ? `${entry.departureTime} ` : ''}
              {transportTypeLabel(entry.type)} {entry.from} → {entry.to}
              {entry.operator ? ` (${entry.operator})` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};
