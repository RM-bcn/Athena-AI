/**
 * One-off script: upgrade the Google Sheet schema for the smart accommodation
 * linking feature WITHOUT changing any existing data.
 *
 * It loads the current trip + bookings + links from the Sheet, then saves the
 * exact same data back. Because the save always writes the full header row,
 * this adds the new CustomBookings columns (CheckIn/CheckOut/Image) and creates
 * the BookingLinks tab on existing spreadsheets.
 *
 * Requirements:
 * - Google OAuth env vars set (same as the app):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   (or service account vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)
 * - Optionally GOOGLE_SHEET_ID to target a specific spreadsheet.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/upgrade-sheet-schema.ts
 *   (or:  node --env-file=.env.local --import tsx scripts/upgrade-sheet-schema.ts)
 */
import { isGoogleAuthConfigured, loadTripFromSheet, saveTripToSheet } from "../server/sheets-service.js";

async function main() {
  if (!isGoogleAuthConfigured()) {
    console.error(
      "❌ Google credentials niet gevonden.\n" +
      "   Zet GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en GOOGLE_REFRESH_TOKEN in je omgeving\n" +
      "   (bijv. via `vercel env pull` of door ze toe te voegen aan je shell)."
    );
    process.exit(1);
  }

  console.log("🔄 Huidige trip, boekingen en links laden uit de Sheet...");
  const { trip, customBookings, stayBookingLinks, sheetUrl } = await loadTripFromSheet();

  console.log(`   Trip: ${trip.title} (${trip.stays?.length ?? 0} stays)`);
  console.log(`   Bookingen: ${customBookings.length}`);
  console.log(`   Bestaande links: ${Object.keys(stayBookingLinks).length}`);

  console.log("💾 Zelfde data terugschrijven (upgradet schema: CheckIn/CheckOut/Image + BookingLinks tab)...");
  await saveTripToSheet(trip, customBookings, stayBookingLinks);

  console.log("✅ Schema-upgrade voltooid.");
  console.log(`   Spreadsheet: ${sheetUrl}`);

  // Verify the round-trip: dates and links must come back.
  console.log("🔎 Round-trip verifiëren...");
  const reloaded = await loadTripFromSheet();
  const bookingsWithDates = reloaded.customBookings.filter(
    (b: any) => b.checkIn || b.checkOut
  ).length;
  console.log(`   Bookingen met checkIn/checkOut: ${bookingsWithDates} (opnieuw geladen: ${reloaded.customBookings.length})`);
  console.log(`   Links opnieuw geladen: ${Object.keys(reloaded.stayBookingLinks).length}`);
  if (bookingsWithDates === 0 && reloaded.customBookings.length > 0) {
    console.warn("   ⚠️  Geen enkele boeking had datums (dat is OK als er nog nooit datums zijn ingevoerd).");
  }
}

main().catch((err) => {
  console.error("❌ Upgrade mislukt:", err?.message || err);
  process.exit(1);
});
