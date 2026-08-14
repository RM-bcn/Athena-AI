// Pure, framework-free validation for trip data shared between the
// /api/trips/request endpoint and the Google Sheets persistence layer.

export interface TripValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTrip(trip: any): TripValidationResult {
  if (!trip || typeof trip !== "object") {
    return { valid: false, error: "Reisgegevens ontbreken." };
  }
  if (!trip.startDate || !trip.endDate) {
    return { valid: false, error: "Ongeldige reisdata: startDate en endDate zijn verplicht." };
  }
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: "Ongeldige reisdata: startDate en endDate moeten in YYYY-MM-DD formaat zijn." };
  }
  if (start > end) {
    return { valid: false, error: "Ongeldige reisdata: startDate moet voor endDate liggen." };
  }
  if (!trip.id) {
    return { valid: false, error: "Ongeldige reisdata: id is verplicht." };
  }
  if (trip.stays !== undefined && !Array.isArray(trip.stays)) {
    return { valid: false, error: "Ongeldige reisdata: stays moet een lijst zijn." };
  }
  return { valid: true };
}
