import React, { useEffect, useState } from 'react';
import { X, Sparkles, Plus, Trash2, ArrowUp, ArrowDown, Utensils, Lightbulb, CheckCircle2, Calendar, Ship, Hotel, Lock, LogOut, Clock, MessageCircle } from 'lucide-react';
import type { IslandStay, DayPlan, DayPlanItem, DayPlanItemType } from '../../types';
import { normalizeDayPlans, dayPlanItemId, ensureDayPlanCount, emptyDayPlan, isProtectedItem, DAY_PLAN_RECORD_TYPES } from '../../utils/dayPlans';

interface DayPlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: IslandStay;
  plans: DayPlan[];
  onSave: (plans: DayPlan[]) => void;
  onAskChat: (stay: IslandStay) => void;
  autoSync?: Partial<Record<DayPlanItemType, boolean>>;
  onToggleAutoSync?: (type: DayPlanItemType) => void;
}

const TYPE_LABELS: Record<DayPlanItemType, string> = {
  activity: 'Activiteit',
  dining: 'Eettip',
  tip: 'Praktische tip',
  transport: 'Transport / Ferry',
  checkin: 'Inchecken hotel',
  checkout: 'Uitchecken hotel',
};

const TYPE_ICONS: Record<DayPlanItemType, React.ReactNode> = {
  activity: <CheckCircle2 className="w-4 h-4 text-[#005BAE]" />,
  dining: <Utensils className="w-4 h-4 text-[#005BAE]" />,
  tip: <Lightbulb className="w-4 h-4 text-amber-500" />,
  transport: <Ship className="w-4 h-4 text-[#005BAE]" />,
  checkin: <Hotel className="w-4 h-4 text-emerald-600" />,
  checkout: <LogOut className="w-4 h-4 text-emerald-600" />,
};

const RECORD_TYPE_LABELS: Partial<Record<DayPlanItemType, string>> = {
  transport: 'Ferry / transport',
  checkin: 'Hotel inchecken',
  checkout: 'Hotel uitchecken',
};

export const DayPlanEditorModal: React.FC<DayPlanEditorModalProps> = ({
  isOpen,
  onClose,
  stay,
  plans,
  onSave,
  onAskChat,
  autoSync = {},
  onToggleAutoSync,
}) => {
  const [draft, setDraft] = useState<DayPlan[]>(() => normalizeDayPlans(plans));
  const [activeDay, setActiveDay] = useState(0);
  const [newItemType, setNewItemType] = useState<DayPlanItemType>('activity');
  const [newItemText, setNewItemText] = useState('');
  const [newItemTime, setNewItemTime] = useState('');

  // Reset draft wanneer het modal opent.
  useEffect(() => {
    if (isOpen) {
      setDraft(normalizeDayPlans(plans));
      setActiveDay(0);
      setNewItemText('');
      setNewItemTime('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const dayCount = Math.max(1, stay.nights || 1);
  const padded = ensureDayPlanCount(draft, dayCount);
  const activePlan = padded[activeDay] || emptyDayPlan(activeDay);

  const updatePlan = (next: DayPlan[]) => {
    setDraft(next);
  };

  const setTitle = (title: string) => {
    updatePlan(padded.map((p) => (p.day === activeDay ? { ...p, title } : p)));
  };

  const addItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    const isRecordType = newItemType === 'transport' || newItemType === 'checkin' || newItemType === 'checkout';
    const item: DayPlanItem = {
      id: dayPlanItemId(newItemType),
      type: newItemType,
      text,
      time: newItemTime && newItemTime.trim() ? newItemTime.trim() : undefined,
      protected: isRecordType,
    };
    updatePlan(padded.map((p) => (p.day === activeDay ? { ...p, items: [...(p.items || []), item] } : p)));
    setNewItemText('');
    setNewItemTime('');
  };

  const removeItem = (itemId: string) => {
    updatePlan(
      padded.map((p) =>
        p.day === activeDay ? { ...p, items: (p.items || []).filter((it) => it.id !== itemId) } : p
      )
    );
  };

  const moveItem = (itemId: string, dir: -1 | 1) => {
    updatePlan(
      padded.map((p) => {
        if (p.day !== activeDay) return p;
        const items = [...(p.items || [])];
        const idx = items.findIndex((it) => it.id === itemId);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= items.length) return p;
        const [moved] = items.splice(idx, 1);
        items.splice(target, 0, moved);
        return { ...p, items };
      })
    );
  };

  const handleSave = () => {
    onSave(padded);
    onClose();
  };

  const handleAskChat = () => {
    onClose();
    onAskChat(stay);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative font-['Plus_Jakarta_Sans'] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#005BAE] text-white flex items-center justify-center shadow-md">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#001a33]">Dagplanning {stay.island}</h2>
            <p className="font-['Inter'] text-xs text-[#717783]">
              {stay.startDate} t/m {stay.endDate} · {stay.nights} {stay.nights === 1 ? 'nacht' : 'nachten'}
            </p>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {Array.from({ length: dayCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`px-3.5 py-1.5 rounded-full font-['Inter'] text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeDay === i
                  ? 'bg-[#005BAE] text-white shadow-sm'
                  : 'bg-[#f0f4f9] text-[#404752] hover:bg-[#e4efff] hover:text-[#005BAE]'
              }`}
            >
              Dag {i + 1}
            </button>
          ))}
        </div>

        {onToggleAutoSync && (
          <div className="mb-4 px-3.5 py-3 rounded-xl bg-[#f7f9ff] border border-[#c0c7d3]/30">
            <p className="flex items-center gap-2 text-[#0b1d2d] font-semibold font-['Inter'] text-xs mb-2">
              <Lock className="w-3.5 h-3.5 text-[#005BAE]" />
              Auto-records per type
            </p>
            <div className="space-y-1.5">
              {DAY_PLAN_RECORD_TYPES.map((type) => {
                const enabled = autoSync[type] !== false;
                return (
                  <button
                    key={type}
                    onClick={() => onToggleAutoSync(type)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg font-['Inter'] text-xs cursor-pointer hover:bg-white transition-colors"
                    title={`Zet automatisch ${RECORD_TYPE_LABELS[type]} voor dit verblijf aan of uit`}
                  >
                    <span className="flex items-center gap-2 text-[#0b1d2d]">
                      {TYPE_ICONS[type]}
                      {RECORD_TYPE_LABELS[type]}
                    </span>
                    <span
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        enabled ? 'bg-[#005BAE]' : 'bg-[#c0c7d3]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Title */}
        <label className="block text-xs font-bold text-[#001a33] uppercase tracking-wider mb-1.5">
          Titel dag {activeDay + 1}
        </label>
        <input
          value={activePlan.title || ''}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bijv. Sarakiniko & Kleftiko boottocht"
          className="w-full mb-4 px-3.5 py-2.5 bg-[#f7f9ff] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:ring-2 focus:ring-[#005BAE]/30"
        />

        {/* Items */}
        <label className="block text-xs font-bold text-[#001a33] uppercase tracking-wider mb-1.5">
          Items dag {activeDay + 1}
        </label>
        {activePlan.items.length === 0 ? (
          <p className="text-xs font-['Inter'] text-[#717783] mb-3 bg-[#f7f9ff] rounded-xl px-3.5 py-3">
            Nog geen items. Voeg er zelf een toe, exporteer uit de chat, of laat Athena een dagplanning genereren.
          </p>
        ) : (
          <ul className="space-y-1.5 mb-4">
            {activePlan.items.map((item, idx) => {
              const isProtected = isProtectedItem(item) && (autoSync[item.type] !== false);
              return (
                <li
                  key={item.id}
                  className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border ${
                    isProtected
                      ? 'bg-[#e4efff]/60 border-[#005BAE]/25'
                      : 'bg-[#f7f9ff] border-[#c0c7d3]/20'
                  }`}
                >
                  <span className="mt-0.5 flex-shrink-0">{TYPE_ICONS[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#717783] block flex items-center gap-1">
                      {TYPE_LABELS[item.type]}
                      {isProtected && (
                        <span className="inline-flex items-center gap-0.5 text-[#005BAE]">
                          <Lock className="w-2.5 h-2.5" />
                          vast record
                        </span>
                      )}
                    </span>
                    <span className="font-['Inter'] text-sm text-[#0b1d2d] whitespace-pre-line">
                      {item.time ? (
                        <span className="inline-flex items-center gap-0.5 font-bold text-[#005BAE] mr-1.5">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </span>
                      ) : null}
                      {item.text}
                    </span>
                  </div>
                  {!isProtected && (
                    <>
                      <div className="flex flex-col gap-0.5 ml-1 flex-shrink-0">
                        <button
                          onClick={() => moveItem(item.id, -1)}
                          disabled={idx === 0}
                          className="p-1 text-[#717783] hover:text-[#005BAE] hover:bg-white rounded transition-colors disabled:opacity-30 disabled:cursor-default cursor-pointer"
                          title="Omhoog"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveItem(item.id, 1)}
                          disabled={idx === activePlan.items.length - 1}
                          className="p-1 text-[#717783] hover:text-[#005BAE] hover:bg-white rounded transition-colors disabled:opacity-30 disabled:cursor-default cursor-pointer"
                          title="Omlaag"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-[#717783] hover:text-red-500 hover:bg-white rounded transition-colors flex-shrink-0 cursor-pointer"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Add item */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <select
            value={newItemType}
            onChange={(e) => setNewItemType(e.target.value as DayPlanItemType)}
            className="px-3 py-2.5 bg-white border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-xs text-[#0b1d2d] focus:outline-none focus:ring-2 focus:ring-[#005BAE]/30 sm:w-40 cursor-pointer"
          >
            <option value="activity">Activiteit</option>
            <option value="dining">Eettip</option>
            <option value="tip">Praktische tip</option>
            <option value="transport">Transport / Ferry</option>
            <option value="checkin">Inchecken hotel</option>
            <option value="checkout">Uitchecken hotel</option>
          </select>
          <div className="relative flex-shrink-0">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#717783] pointer-events-none" />
            <input
              type="time"
              value={newItemTime}
              onChange={(e) => setNewItemTime(e.target.value)}
              className="pl-8 pr-2 py-2.5 bg-[#f7f9ff] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-xs text-[#001a33] focus:outline-none focus:ring-2 focus:ring-[#005BAE]/30"
              title="Optionele tijd (bijv. 09:30)"
            />
          </div>
          <input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addItem();
            }}
            placeholder="Bijv. Bezoek Sarakiniko-strand vroeg in de ochtend"
            className="flex-1 px-3.5 py-2.5 bg-[#f7f9ff] border border-[#c0c7d3]/40 rounded-xl font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:ring-2 focus:ring-[#005BAE]/30"
          />
          <button
            onClick={addItem}
            className="px-3.5 py-2.5 bg-[#005BAE] text-white rounded-xl font-['Inter'] text-xs font-bold hover:brightness-110 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Toevoegen
          </button>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#f0f4f9]">
          <button
            onClick={handleAskChat}
            className="text-xs font-['Inter'] font-semibold text-white bg-gradient-to-r from-[#005BAE] to-[#0074d4] px-4 py-2.5 rounded-xl hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Ga naar de chat en vraag Athena om een dagplanning voor dit verblijf"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <MessageCircle className="w-4 h-4 text-white" />
            Genereer met AI in de chat
          </button>
          <button
            onClick={handleSave}
            className="text-xs font-['Inter'] font-semibold bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Opslaan & Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
