// Self-contained unit tests for the trip-request validation helper.
// No test framework is installed, so this uses a tiny assert harness and runs
// via `tsx`:   npm run test  (tsx ... && tsx server/trip-validation.test.ts)

import { validateTrip } from "./trip-validation.js";

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

const validTrip = {
  id: "ATH-2026",
  title: "Cyclades Odyssey",
  startDate: "2026-08-15",
  endDate: "2026-08-23",
  durationDays: 8,
  style: "Eilandhoppen",
  stays: [
    { id: "stay-1", island: "Milos", startDate: "2026-08-15", endDate: "2026-08-18", nights: 3 },
  ],
};

assert(validateTrip(validTrip).valid, "valid trip accepted");
assert(!validateTrip(null).valid, "null trip rejected");
assert(!validateTrip(undefined).valid, "undefined trip rejected");
assert(!validateTrip({}).valid, "missing dates rejected");
assert(!validateTrip({ ...validTrip, startDate: "" }).valid, "empty startDate rejected");
assert(!validateTrip({ ...validTrip, endDate: "" }).valid, "empty endDate rejected");
assert(!validateTrip({ ...validTrip, startDate: "not-a-date" }).valid, "invalid date format rejected");
assert(!validateTrip({ ...validTrip, startDate: "2026-08-23", endDate: "2026-08-15" }).valid, "start after end rejected");
assert(!validateTrip({ ...validTrip, id: "" }).valid, "missing id rejected");
assert(!validateTrip({ ...validTrip, stays: "nope" }).valid, "non-array stays rejected");
assert(validateTrip({ ...validTrip, stays: [] }).valid, "empty stays accepted");
assert(validateTrip({ ...validTrip, stays: undefined }).valid, "undefined stays accepted");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
