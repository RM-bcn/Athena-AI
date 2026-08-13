import type { DayPlan, DayPlanItem, DayPlanItemType } from '../types';

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
  if (type === 'dining' || type === 'tip' || type === 'activity') return type;
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
