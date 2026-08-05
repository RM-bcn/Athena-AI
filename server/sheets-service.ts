import { google } from "googleapis";

let cachedSheetId: string | null = null;

function getEnvVal(...names: string[]): string {
  for (const name of names) {
    const val = process.env[name];
    if (val && typeof val === "string" && val.trim()) {
      return val.trim().replace(/^["']|["']$/g, "");
    }
  }
  const lowerNames = names.map((n) => n.toLowerCase());
  for (const key of Object.keys(process.env)) {
    if (lowerNames.includes(key.toLowerCase())) {
      const val = process.env[key];
      if (val && typeof val === "string" && val.trim()) {
        return val.trim().replace(/^["']|["']$/g, "");
      }
    }
  }
  return "";
}

function cleanSpreadsheetId(id: string): string {
  if (!id) return "";
  const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return id.replace(/[^a-zA-Z0-9-_]/g, "");
}

function formatGoogleError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes("invalid_grant")) {
    return "Google OAuth Refresh Token is verlopen of ongeldig (invalid_grant). Genereer een nieuwe GOOGLE_REFRESH_TOKEN.";
  }
  if (msg.includes("invalid_client")) {
    return "Google Client ID of Client Secret is onjuist ingesteld (invalid_client).";
  }
  if (msg.includes("404") || msg.includes("Requested entity was not found")) {
    return "Google Sheet kon niet gevonden worden (404). Controleer GOOGLE_SHEET_ID in Vercel of verwijder deze variabele om automatisch een nieuwe aan te maken.";
  }
  if (msg.includes("403") || msg.includes("permission")) {
    return "Geen toegang tot Google Sheet (403 Permission Denied). Zorg dat de Google Sheet is gedeeld met het OAuth account.";
  }
  return msg;
}

function getOAuthClient() {
  const clientId = getEnvVal("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_Id", "CLIENT_ID");
  const clientSecret = getEnvVal("GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_Secret", "CLIENT_SECRET");
  const refreshToken = getEnvVal("GOOGLE_REFRESH_TOKEN", "REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function isGoogleAuthConfigured(): boolean {
  const clientId = getEnvVal("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_Id", "CLIENT_ID");
  const clientSecret = getEnvVal("GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_Secret", "CLIENT_SECRET");
  const refreshToken = getEnvVal("GOOGLE_REFRESH_TOKEN", "REFRESH_TOKEN");
  return !!(clientId && clientSecret && refreshToken);
}

// Helper to ensure all required tabs exist in the spreadsheet
async function ensureTabsExist(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheetTitles = (meta.data.sheets || []).map((s: any) => s.properties.title);
    
    const requiredTabs = ["TripInfo", "Stays", "Users", "CustomBookings"];
    const missingTabs = requiredTabs.filter((title) => !existingSheetTitles.includes(title));

    if (missingTabs.length > 0) {
      console.log(`[Google Sheets] Automatically creating missing tabs: ${missingTabs.join(", ")}`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: missingTabs.map((title) => ({
            addSheet: { properties: { title } },
          })),
        },
      });
    }
  } catch (err: any) {
    console.warn("[Google Sheets] Note when checking tabs:", err?.message || err);
  }
}

export async function getOrCreateSpreadsheet(): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const auth = getOAuthClient();
  if (!auth) {
    throw new Error("OAuth parameters ontbreken (vereist GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).");
  }

  const sheets = google.sheets({ version: "v4", auth });

  // 1. If explicit env variable GOOGLE_SHEET_ID or SHEET_ID is set, return it
  const rawSheetId = getEnvVal("GOOGLE_SHEET_ID", "GOOGLE_SHEETS_ID", "SHEET_ID");
  const explicitSheetId = cleanSpreadsheetId(rawSheetId);

  if (explicitSheetId) {
    try {
      await ensureTabsExist(sheets, explicitSheetId);
      return {
        spreadsheetId: explicitSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${explicitSheetId}`,
      };
    } catch (err: any) {
      throw new Error(formatGoogleError(err));
    }
  }

  if (cachedSheetId) {
    try {
      await ensureTabsExist(sheets, cachedSheetId);
      return {
        spreadsheetId: cachedSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cachedSheetId}`,
      };
    } catch (err: any) {
      cachedSheetId = null; // reset cached sheet if failed
    }
  }

  const drive = google.drive({ version: "v3", auth });

  // 2. Search drive for existing file named "Athena AI - Cyclades Trip (ATH-2026)" or containing "ATH-2026"
  try {
    const searchRes = await drive.files.list({
      q: "(name = 'Athena AI - Cyclades Trip (ATH-2026)' or name contains 'ATH-2026') and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
      fields: "files(id, name, webViewLink, createdTime)",
      orderBy: "createdTime asc",
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      const file = searchRes.data.files[0];
      if (file.id) {
        cachedSheetId = file.id;
        console.log(`[Google Sheets] Reusing existing spreadsheet ID: ${file.id}`);
        await ensureTabsExist(sheets, file.id);
        return {
          spreadsheetId: file.id,
          spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`,
        };
      }
    }
  } catch (err: any) {
    console.warn("[Google Sheets] Could not search Google Drive:", err?.message || err);
  }

  // 3. Create a brand new Google Spreadsheet
  try {
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: "Athena AI - Cyclades Trip (ATH-2026)",
        },
        sheets: [
          { properties: { title: "TripInfo" } },
          { properties: { title: "Stays" } },
          { properties: { title: "Users" } },
          { properties: { title: "CustomBookings" } },
        ],
      },
    });

    const spreadsheetId = createRes.data.spreadsheetId;
    if (!spreadsheetId) {
      throw new Error("Aanmaken van Google Spreadsheet is mislukt.");
    }

    cachedSheetId = spreadsheetId;

    // Initialize Headers and default rows
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          {
            range: "TripInfo!A1:G2",
            values: [
              ["TripID", "Title", "StartDate", "EndDate", "DurationDays", "Style", "TripCode"],
              ["ATH-2026", "Cyclades Island Hopping Odyssey", "2026-08-15", "2026-08-23", "8", "Eilandhoppen met Dennis & Joyce", "ATH-2026"]
            ],
          },
          {
            range: "Stays!A1:G4",
            values: [
              ["ID", "Island", "StartDate", "EndDate", "Nights", "AccommodationName", "Notes"],
              ["stay-1", "Milos", "2026-08-15", "2026-08-18", 3, "Milos Breeze Boutique", "Sarakiniko & Kleftiko boottocht"],
              ["stay-2", "Naxos", "2026-08-18", "2026-08-21", 3, "Nissaki Beach Hotel", "Portara & Naxian kaasproeverij"],
              ["stay-3", "Koufonisia", "2026-08-21", "2026-08-23", 2, "Paradisos Seaview Suites", "Pori Beach & Devil's Eye rotszwembad"]
            ],
          },
          {
            range: "Users!A1:E3",
            values: [
              ["Username", "Email", "Name", "Role", "TripCode"],
              ["dennisvr", "dennis.van.rooden@gmail.com", "Dennis van Rooden", "owner", "ATH-2026"],
              ["Joyce", "Joyceockeloen@gmail.com", "Joyce Ockeloen", "member", "ATH-2026"]
            ],
          },
          {
            range: "CustomBookings!A1:F1",
            values: [
              ["ID", "Name", "Location", "Status", "Island", "PricePerNight"]
            ],
          },
        ],
      },
    });

    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  } catch (err: any) {
    throw new Error(formatGoogleError(err));
  }
}

export async function saveTripToSheet(tripData: any, customBookings: any[] = []): Promise<void> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("OAuth parameters ontbreken (vereist GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).");

  try {
    const { spreadsheetId } = await getOrCreateSpreadsheet();
    const sheets = google.sheets({ version: "v4", auth });

    await ensureTabsExist(sheets, spreadsheetId);

    // Validate tripData
    if (!tripData.id || !tripData.title) {
      throw new Error("Ongeldige reisdata: id en title zijn verplicht.");
    }
    if (!tripData.startDate || !tripData.endDate) {
      throw new Error("Ongeldige reisdata: startDate en endDate zijn verplicht.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tripData.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(tripData.endDate)) {
      throw new Error("Ongeldige datumindeling: gebruik YYYY-MM-DD.");
    }
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Ongeldige reisdata: ongeldige datumwaarde.");
    }
    if (start > end) {
      throw new Error("Ongeldige reisdata: startDate moet voor endDate liggen.");
    }

    // Format TripInfo rows
    const tripInfoValues = [
      ["TripID", "Title", "StartDate", "EndDate", "DurationDays", "Style", "TripCode"],
      [
        tripData.id,
        tripData.title,
        tripData.startDate,
        tripData.endDate,
        String(tripData.durationDays || Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))),
        tripData.style || "Eilandhoppen",
        "ATH-2026"
      ]
    ];

    // Validate and filter stays with strict DTO checks
    const seenStayKeys = new Set<string>();
    const validStays = (tripData.stays || []).filter((s: any) => {
      if (!s.id || !s.island || !s.startDate || !s.endDate || !s.nights) return false;
      if (typeof s.nights !== "number" || s.nights < 1) return false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(s.endDate)) return false;
      const sStart = new Date(s.startDate);
      const sEnd = new Date(s.endDate);
      if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) return false;
      if (sStart > sEnd) return false;
      const dupKey = `${s.island.toLowerCase()}|${s.startDate}|${s.endDate}`;
      if (seenStayKeys.has(dupKey)) return false;
      seenStayKeys.add(dupKey);
      return true;
    });

    // Format Stays rows
    const staysHeaders = ["ID", "Island", "StartDate", "EndDate", "Nights", "AccommodationName", "Notes"];
    const staysRows = validStays.map((s: any) => [
      s.id,
      s.island,
      s.startDate,
      s.endDate,
      s.nights || Math.ceil((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / (1000 * 60 * 60 * 24)),
      s.accommodationName || "",
      s.notes || ""
    ]);
    const staysValues = [staysHeaders, ...staysRows];

    // Validate and filter custom bookings with strict DTO checks
    const seenBookingKeys = new Set<string>();
    const validBookings = (customBookings || []).filter((b: any) => {
      if (!b.id || !b.name || !b.location) return false;
      if (typeof b.name !== "string" || b.name.trim().length === 0) return false;
      if (typeof b.location !== "string" || b.location.trim().length === 0) return false;
      const dupKey = `${b.name.toLowerCase()}|${b.location.toLowerCase()}`;
      if (seenBookingKeys.has(dupKey)) return false;
      seenBookingKeys.add(dupKey);
      if (b.status && !["CONFIRMED", "PAID", "PENDING", "CANCELLED"].includes(b.status)) return false;
      return true;
    });

    // Format Custom Bookings rows
    const bookingHeaders = ["ID", "Name", "Location", "Status", "Island", "PricePerNight"];
    const bookingRows = validBookings.map((b: any) => [
      b.id,
      b.name,
      b.location,
      b.status || "PENDING",
      b.island || "",
      b.pricePerNight || ""
    ]);
    const bookingValues = [bookingHeaders, ...bookingRows];

    // Overwrite values
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          { range: "TripInfo!A1:G2", values: tripInfoValues },
          { range: `Stays!A1:G${Math.max(staysValues.length, 2)}`, values: staysValues },
          { range: `CustomBookings!A1:F${Math.max(bookingValues.length, 2)}`, values: bookingValues }
        ]
      }
    });
  } catch (err: any) {
    throw new Error(formatGoogleError(err));
  }
}

export async function loadTripFromSheet(): Promise<{ trip: any; customBookings: any[]; sheetUrl: string }> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("Google auth parameters ontbreken.");

  try {
    const { spreadsheetId, spreadsheetUrl } = await getOrCreateSpreadsheet();
    const sheets = google.sheets({ version: "v4", auth });

    await ensureTabsExist(sheets, spreadsheetId);

    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ["TripInfo!A2:G2", "Stays!A2:G20", "CustomBookings!A2:F50"],
    });

    const valueRanges = res.data.valueRanges || [];
    const tripRow = valueRanges[0]?.values?.[0];
    const staysRows = valueRanges[1]?.values || [];
    const bookingRows = valueRanges[2]?.values || [];

    const loadedStays = staysRows
      .filter((row: any) => row && row[1]) // Must have an island name
      .map((row: any) => ({
        id: row[0] || `stay-${Math.random()}`,
        island: row[1],
        startDate: row[2] || "2026-08-15",
        endDate: row[3] || "2026-08-18",
        nights: Number(row[4]) || 3,
        accommodationName: row[5] || "",
        notes: row[6] || "",
      }));

    const trip = {
      id: tripRow?.[0] || "ATH-2026",
      title: tripRow?.[1] || "Cyclades Island Hopping Odyssey",
      startDate: tripRow?.[2] || "2026-08-15",
      endDate: tripRow?.[3] || "2026-08-23",
      durationDays: Number(tripRow?.[4]) || 8,
      style: tripRow?.[5] || "Eilandhoppen met Dennis & Joyce",
      stays: loadedStays.length > 0 ? loadedStays : undefined,
    };

    const customBookings = bookingRows
      .filter((row: any) => row && row[1])
      .map((row: any) => ({
        id: row[0] || `booking-${Math.random()}`,
        name: row[1],
        location: row[2] || "Greek Islands",
        status: row[3] || "CONFIRMED",
        island: row[4] || "",
        pricePerNight: Number(row[5]) || 150,
      }));

    return { trip, customBookings, sheetUrl: spreadsheetUrl };
  } catch (err: any) {
    throw new Error(formatGoogleError(err));
  }
}


