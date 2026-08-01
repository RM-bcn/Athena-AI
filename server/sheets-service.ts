import { google } from "googleapis";

let cachedSheetId: string | null = null;

function getOAuthClient() {
  const clientId = (process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || process.env.REFRESH_TOKEN || "").trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function isGoogleAuthConfigured(): boolean {
  const clientId = (process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || process.env.REFRESH_TOKEN || "").trim();
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
    throw new Error("OAuth parameters missing (requires CLIENT_ID, CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).");
  }

  const sheets = google.sheets({ version: "v4", auth });

  // 1. If explicit env variable GOOGLE_SHEET_ID or SHEET_ID is set, return it
  const explicitSheetId = (process.env.GOOGLE_SHEET_ID || process.env.SHEET_ID || "").trim();
  if (explicitSheetId) {
    await ensureTabsExist(sheets, explicitSheetId);
    return {
      spreadsheetId: explicitSheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${explicitSheetId}`,
    };
  }

  if (cachedSheetId) {
    await ensureTabsExist(sheets, cachedSheetId);
    return {
      spreadsheetId: cachedSheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cachedSheetId}`,
    };
  }

  const drive = google.drive({ version: "v3", auth });

  // 2. Search drive for existing file named "Athena AI - Cyclades Trip (ATH-2026)" or containing "ATH-2026"
  try {
    const searchRes = await drive.files.list({
      q: "(name = 'Athena AI - Cyclades Trip (ATH-2026)' or name contains 'ATH-2026') and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
      fields: "files(id, name, webViewLink, createdTime)",
      orderBy: "createdTime asc", // Pick the original primary sheet
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
    if (err?.message?.includes("Google Drive API has not been used") || err?.code === 403) {
      console.warn("[Google Sheets] Note: Google Drive API is not enabled on this Google Cloud Project. To enable automatic Drive file searches, visit: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=1097495048880 . Alternatively, set GOOGLE_SHEET_ID in your environment variables.");
    } else {
      console.warn("[Google Sheets] Could not search Google Drive:", err?.message || err);
    }
  }

  // 3. Create a brand new Google Spreadsheet
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
    throw new Error("Failed to create Google Spreadsheet.");
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
}

export async function saveTripToSheet(tripData: any, customBookings: any[] = []): Promise<void> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("OAuth parameters missing (requires CLIENT_ID, CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).");

  const { spreadsheetId } = await getOrCreateSpreadsheet();
  const sheets = google.sheets({ version: "v4", auth });

  await ensureTabsExist(sheets, spreadsheetId);

  // Format TripInfo rows
  const tripInfoValues = [
    ["TripID", "Title", "StartDate", "EndDate", "DurationDays", "Style", "TripCode"],
    [
      tripData.id || "ATH-2026",
      tripData.title || "Cyclades Odyssey",
      tripData.startDate || "2026-08-15",
      tripData.endDate || "2026-08-23",
      String(tripData.durationDays || 8),
      tripData.style || "Eilandhoppen",
      "ATH-2026"
    ]
  ];

  // Format Stays rows
  const staysHeaders = ["ID", "Island", "StartDate", "EndDate", "Nights", "AccommodationName", "Notes"];
  const staysRows = (tripData.stays || []).map((s: any) => [
    s.id,
    s.island,
    s.startDate,
    s.endDate,
    s.nights,
    s.accommodationName || "",
    s.notes || ""
  ]);
  const staysValues = [staysHeaders, ...staysRows];

  // Format Custom Bookings rows
  const bookingHeaders = ["ID", "Name", "Location", "Status", "Island", "PricePerNight"];
  const bookingRows = (customBookings || []).map((b: any) => [
    b.id,
    b.name,
    b.location,
    b.status,
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
        { range: `Stays!A1:G${staysValues.length}`, values: staysValues },
        { range: `CustomBookings!A1:F${Math.max(bookingValues.length, 2)}`, values: bookingValues }
      ]
    }
  });
}

export async function loadTripFromSheet(): Promise<{ trip: any; customBookings: any[]; sheetUrl: string }> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("Google auth not configured.");

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
}

