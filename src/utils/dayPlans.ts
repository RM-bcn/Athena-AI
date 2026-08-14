import type { DayPlan, DayPlanItem, DayPlanItemType } from '../types';
import type { TransportEntry } from '../transport/types';

let idCounter = 0;

export function dayPlanItemId(prefix: string = 'item'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function emptyDayPlan(day: number, title?: string): DayPlan {
  return { day, title: title || `Dag ${day + 1}`, items: [] };
}

// Normaliseert een ruwe planning (uit localStorage of /api/dayplan) naar het
// item-model. Ondersteunt de legacy vorm (activities/dining/tips) én de nieuwe
// vorm met items.
export function normalizeDayPlan(raw: any, index = 0): DayPlan {
  const day = typeof raw?.day === 'number' ? raw.day : index;
  const title = typeof raw?.title === 'string' && raw.title.trim() ? raw.title : `Dag ${day + 1}`;

  if (Array.isArray(raw?.items) && raw.items.length > 0) {
    return {
      day,
      title,
      items: raw.items.map((it: any, i: number) => ({
        id: typeof it?.id === 'string' ? it.id : dayPlanItemId('item'),
        type: normalizeItemType(it?.type) || 'activity',
        text: typeof it?.text === 'string' ? it.text : '',
        time: typeof it?.time === 'string' && it.time.trim() ? it.time.trim() : undefined,
        protected: it?.protected === true,
      })),
    };
  }

  const items: DayPlanItem[] = [];
  const push = (type: DayPlanItemType, text: unknown) => {
    const s = typeof text === 'string' ? text.trim() : '';
    if (s) items.push({ id: dayPlanItemId(type), type, text: s });
  };
  (raw?.activities || []).forEach((a: unknown) => push('activity', a));
  push('dining', raw?.dining);
  (raw?.tips || []).forEach((t: unknown) => push('tip', t));

  return { day, title, items };
}

export function normalizeDayPlans(raw: any): DayPlan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p, i) => normalizeDayPlan(p, i))
    .sort((a, b) => a.day - b.day);
}

export function normalizeItemType(type: unknown): DayPlanItemType | null {
  if (
    type === 'dining' ||
    type === 'tip' ||
    type === 'activity' ||
    type === 'transport' ||
    type === 'checkin' ||
    type === 'checkout'
  ) {
    return type;
  }
  return null;
}

// Zorgt dat een planningsarray minstens `count` dagen bevat (opvullen met lege
// dagen), zodat je veilig een item aan een bestaande of nieuwe dag toevoegt.
export function ensureDayPlanCount(plans: DayPlan[], count: number): DayPlan[] {
  const next = [...plans];
  while (next.length < count) {
    next.push(emptyDayPlan(next.length));
  }
  return next.map((p, i) => ({ ...p, day: i }));
}

// Bepaalt of een item een beschermd record is (ferry, hotel-inchecken/-uitchecken).
export function isProtectedItem(item: DayPlanItem): boolean {
  return item?.protected === true || item?.type === 'transport' || item?.type === 'checkin' || item?.type === 'checkout';
}

// De vaste record-types die per verblijf automatisch kunnen worden toegevoegd.
export const DAY_PLAN_RECORD_TYPES: DayPlanItemType[] = ['transport', 'checkin', 'checkout'];

export function formatTransportRecord(entry: TransportEntry): string {
  const time = entry.departureTime ? `${entry.departureTime} ` : '';
  const operator = entry.operator ? ` (${entry.operator})` : '';
  return `${time}${entry.type === 'ferry' ? 'Veerboot' : 'Transport'} ${entry.from} → ${entry.to}${operator}`;
}

// Bouwt de vaste records voor een verblijf: aankomst (ferry + inchecken) op
// dag 0 en vertrek (uitchecken + ferry) op de laatste dag. Deze records zijn
// beschermd: ze worden alleen opnieuw ingevuld op basis van de verblijfs- en
// transportdata en gaan nooit verloren bij het toevoegen van andere items.
export function buildStayRecords(
  stay: { id: string; island: string; startDate: string; endDate: string; accommodationName?: string },
  transports: TransportEntry[]
): { arrival: DayPlanItem[]; departure: DayPlanItem[] } {
  const accommodation = stay.accommodationName?.trim() || `Boetiekhotel in ${stay.island}`;

  const arrivalFerry = transports.find(
    (t) => t.date === stay.startDate && (t.type === 'ferry' || t.type === 'flight')
  );
  const departureFerry = transports.find(
    (t) => t.date === stay.endDate && (t.type === 'ferry' || t.type === 'flight')
  );

  const arrival: DayPlanItem[] = [
    {
      id: dayPlanItemId('transport'),
      type: 'transport',
      text: arrivalFerry ? formatTransportRecord(arrivalFerry) : `Veerboot overtocht naar ${stay.island}`,
      time: arrivalFerry?.departureTime,
      protected: true,
    },
    {
      id: dayPlanItemId('checkin'),
      type: 'checkin',
      text: `Inchecken bij ${accommodation}`,
      protected: true,
    },
  ];

  const departure: DayPlanItem[] = [
    {
      id: dayPlanItemId('checkout'),
      type: 'checkout',
      text: `Uitchecken uit ${accommodation}`,
      protected: true,
    },
    {
      id: dayPlanItemId('transport'),
      type: 'transport',
      text: departureFerry ? formatTransportRecord(departureFerry) : `Veerboot vertrek vanaf ${stay.island}`,
      time: departureFerry?.departureTime,
      protected: true,
    },
  ];

  return { arrival, departure };
}

// Zet de beschermde records op hun plek: dag 0 krijgt aankomst-records en de
// laatste dag vertrek-records. Bestaande beschermde records van die dagen worden
// vervangen (opnieuw uit de actuele data), alle andere items blijven intact.
// `enabledTypes` beperkt welke record-types worden toegevoegd (individuele
// auto-sync uitschakeling); null betekent "alles aan".
export function applyStayRecords(
  plans: DayPlan[],
  stay: { id: string; island: string; startDate: string; endDate: string; accommodationName?: string; nights?: number },
  transports: TransportEntry[],
  enabledTypes: DayPlanItemType[] | null = null
): DayPlan[] {
  const nightCount = Math.max(stay?.nights || plans.length || 1, 1);
  const padded = ensureDayPlanCount(plans, nightCount);
  const lastDay = Math.max(nightCount - 1, 0);
  const sameDay = lastDay === 0;

  const { arrival, departure } = buildStayRecords(stay, transports);

  const filterEnabled = (records: DayPlanItem[]) =>
    enabledTypes ? records.filter((r) => enabledTypes.includes(r.type)) : records;
  const arrivalFiltered = filterEnabled(arrival);
  const departureFiltered = filterEnabled(departure);

  return padded.map((p) => {
    if (sameDay) {
      // Eén nacht: aankomst én vertrek vallen op dezelfde dag.
      if (p.day === 0) {
        return { ...p, items: [...arrivalFiltered, ...departureFiltered, ...(p.items || []).filter((it) => !isProtectedItem(it))] };
      }
      return p;
    }
    if (p.day === 0) {
      return { ...p, items: [...arrivalFiltered, ...(p.items || []).filter((it) => !isProtectedItem(it))] };
    }
    if (p.day === lastDay) {
      return { ...p, items: [...departureFiltered, ...(p.items || []).filter((it) => !isProtectedItem(it))] };
    }
    return p;
  });
}
