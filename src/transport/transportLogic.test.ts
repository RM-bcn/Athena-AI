// Self-contained unit tests for the transport logic.
// No test framework is installed, so this uses a tiny assert harness and runs
// via `tsx`:   npm run test  (tsx src/transport/transportLogic.test.ts)

import { IslandStay } from '../types';
import {
  autoLinkEntry,
  citiesMatch,
  deriveLegs,
  earliestEntry,
  normalizeCity,
  resolveLegId,
} from './transportLogic';
import { TransportEntry } from './types';

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

const stays: IslandStay[] = [
  { id: 'stay-1', island: 'Athene', startDate: '2026-09-17', endDate: '2026-09-19', nights: 2 },
  { id: 'stay-2', island: 'Naxos', startDate: '2026-09-19', endDate: '2026-09-22', nights: 3 },
  { id: 'stay-3', island: 'Koufonisia', startDate: '2026-09-22', endDate: '2026-09-24', nights: 2 },
];

// ---------------------------------------------------------------------------
// Leg derivation
// ---------------------------------------------------------------------------
console.log('deriveLegs');
{
  const legs = deriveLegs(stays);
  assert(legs.length === 2, 'two legs from three stays');
  assert(legs[0].fromCity === 'Athene' && legs[0].toCity === 'Naxos', 'leg0 Athene → Naxos');
  assert(legs[0].date === '2026-09-19', 'leg0 date = next stay startDate');
  assert(legs[1].fromCity === 'Naxos' && legs[1].toCity === 'Koufonisia', 'leg1 Naxos → Koufonisia');
  assert(legs[1].date === '2026-09-22', 'leg1 date = next stay startDate');
  assert(deriveLegs([]).length === 0, 'no legs for empty stays');
  assert(deriveLegs([stays[0]]).length === 0, 'no legs for single stay');
}

// ---------------------------------------------------------------------------
// City aliasing
// ---------------------------------------------------------------------------
console.log('normalizeCity / citiesMatch');
{
  assert(normalizeCity('Athene') === 'athene', 'Athene → athene');
  assert(normalizeCity('Athens') === 'athene', 'Athens → athene');
  assert(normalizeCity('Piraeus') === 'athene', 'Piraeus → athene');
  assert(normalizeCity('Pireas') === 'athene', 'Pireas → athene');
  assert(normalizeCity('  PIREAS ') === 'athene', 'whitespace/case tolerant');
  assert(citiesMatch('Athene', 'Piraeus') === true, 'Athene matches Piraeus');
  assert(citiesMatch('Athene', 'Pireas') === true, 'Athene matches Pireas');
  assert(citiesMatch('Athene', 'Naxos') === false, 'Athene does not match Naxos');
  assert(citiesMatch('naxos', 'Naxos Stad') === true, 'Naxos matches Naxos Stad');
}

// ---------------------------------------------------------------------------
// Auto-linking
// ---------------------------------------------------------------------------
console.log('autoLinkEntry');
{
  const legs = deriveLegs(stays);

  const ferry: TransportEntry = {
    id: 't1',
    type: 'ferry',
    from: 'Piraeus',
    to: 'Naxos',
    date: '2026-09-19',
    departureTime: '07:30',
    operator: 'Blue Star Ferries',
  };
  const linked = autoLinkEntry(ferry, legs);
  assert(linked.result === 'linked', 'Piraeus→Naxos on leg date auto-links');
  assert(linked.linkedLegId === legs[0].id, 'linked to leg0');

  const offDay: TransportEntry = { id: 't2', type: 'flight', from: 'Athene', to: 'Athene', date: '2026-09-20' };
  const unlinked = autoLinkEntry(offDay, legs);
  assert(unlinked.result === 'unlinked', 'free-day flight stays unlinked');
  assert(unlinked.linkedLegId === undefined, 'no linkedLegId when unlinked');

  const wrongCity: TransportEntry = { id: 't3', type: 'ferry', from: 'Milos', to: 'Naxos', date: '2026-09-19' };
  assert(autoLinkEntry(wrongCity, legs).result === 'unlinked', 'wrong origin stays unlinked');

  const nearMiss: TransportEntry = { id: 't4', type: 'ferry', from: 'Athene', to: 'Santorini', date: '2026-09-19' };
  const suggested = autoLinkEntry(nearMiss, legs);
  assert(suggested.suggestedLegIds.includes(legs[0].id), 'near-miss suggests leg0');

  // Multiple matches → unlinked with all candidates suggested
  const dupLegs = [
    { id: 'leg-x', index: 0, fromCity: 'Athene', toCity: 'Naxos', date: '2026-09-19', fromStayId: 'a', toStayId: 'b' },
    { id: 'leg-y', index: 1, fromCity: 'Athene', toCity: 'Naxos', date: '2026-09-19', fromStayId: 'b', toStayId: 'c' },
  ];
  const multi = autoLinkEntry(ferry, dupLegs);
  assert(multi.result === 'unlinked', 'ambiguous (2 matches) stays unlinked');
  assert(multi.suggestedLegIds.length === 2, 'ambiguous suggests both legs');
}

// ---------------------------------------------------------------------------
// resolveLegId (explicit override wins)
// ---------------------------------------------------------------------------
console.log('resolveLegId');
{
  const legs = deriveLegs(stays);
  const entry: TransportEntry = { id: 't5', type: 'transfer', from: 'Athene', to: 'Naxos', date: '2026-09-19', linkedLegId: legs[1].id };
  const resolved = resolveLegId(entry, legs);
  assert(resolved.linkedLegId === legs[1].id, 'explicit linkedLegId wins');
  assert(resolved.result === 'linked', 'explicit link is linked');

  const stale: TransportEntry = { id: 't6', type: 'ferry', from: 'Athene', to: 'Naxos', date: '2026-09-19', linkedLegId: 'leg-gone' };
  const fallback = resolveLegId(stale, legs);
  assert(fallback.linkedLegId === legs[0].id, 'stale override falls back to auto-link');
}

// ---------------------------------------------------------------------------
// earliestEntry
// ---------------------------------------------------------------------------
console.log('earliestEntry');
{
  const a: TransportEntry = { id: 'a', type: 'ferry', from: 'x', to: 'y', date: '2026-09-19', departureTime: '09:00' };
  const b: TransportEntry = { id: 'b', type: 'ferry', from: 'x', to: 'y', date: '2026-09-19', departureTime: '07:30' };
  const c: TransportEntry = { id: 'c', type: 'ferry', from: 'x', to: 'y', date: '2026-09-19' };
  assert(earliestEntry([a, b])?.id === 'b', 'earliest departure wins');
  assert(earliestEntry([c])?.id === 'c', 'entry without time is only option');
  assert(earliestEntry([]) === undefined, 'empty → undefined');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
