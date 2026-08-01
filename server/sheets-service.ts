import { google } from "googleapis";

let cachedSheetId: string | null = null;

function getOAuthClient() {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const refreshToken = process.env.REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function isGoogleAuthConfigured(): boolean {
  return !!(process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.REFRESH_TOKEN);
}

export async function getOrCreateSpreadsheet(): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const auth = getOAuthClient();
  if (!auth) {
    throw new Error("Google OAuth environment variables (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) are missing.");
  }

  // 1. If explicit env variable GOOGLE_SHEET_ID is set, return it
  if (process.env.GOOGLE_SHEET_ID) {
    const sheetId = process.env.GOOGLE_SHEET_ID.trim();
    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
    };
  }

  if (cachedSheetId) {
    return {
      spreadsheetId: cachedSheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cachedSheetId}`,
    };
  }

  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  // 2. Search drive for existing file named "Athena AI - Cyclades Trip (ATH-2026)"
  try {
    const searchRes = await drive.files.list({
      q: "name = 'Athena AI - Cyclades Trip (ATH-2026)' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
      fields: "files(id, name, webViewLink)",
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      const file = searchRes.data.files[0];
      if (file.id) {
        cachedSheetId = file.id;
        return {
          spreadsheetId: file.id,
          spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`,
        };
      }
    }
  } catch (err) {
    console.warn("Could not list Google Drive files, creating new spreadsheet directly:", err);
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
          range: "Stays!A1:G5",
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
  if (!auth) throw new Error("Google auth not configured.");

  const { spreadsheetId } = await getOrCreateSpreadsheet();
  const sheets = google.sheets({ version: "v4", auth });

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

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ["TripInfo!A2:G2", "Stays!A2:G20", "CustomBookings!A2:F50"],
  });

  const valueRanges = res.data.valueRanges || [];
  const tripRow = valueRanges[0]?.values?.[0];
  const staysRows = valueRanges[1]?.values || [];
  const bookingRows = valueRanges[2]?.values || [];

  const trip = {
    id: tripRow?.[0] || "ATH-2026",
    title: tripRow?.[1] || "Cyclades Island Hopping Odyssey",
    startDate: tripRow?.[2] || "2026-08-15",
    endDate: tripRow?.[3] || "2026-08-23",
    durationDays: Number(tripRow?.[4]) || 8,
    style: tripRow?.[5] || "Eilandhoppen met Dennis & Joyce",
    stays: staysRows.map((row: any) => ({
      id: row[0] || `stay-${Date.now()}`,
      island: row[1] || "Naxos",
      startDate: row[2] || "2026-08-15",
      endDate: row[3] || "2026-08-18",
      nights: Number(row[4]) || 3,
      accommodationName: row[5] || "",
      notes: row[6] || "",
    })),
  };

  const customBookings = bookingRows.map((row: any) => ({
    id: row[0] || `booking-${Date.now()}`,
    name: row[1] || "Hotel",
    location: row[2] || "Greek Islands",
    status: row[3] || "CONFIRMED",
    island: row[4] || "",
    pricePerNight: Number(row[5]) || 150,
  }));

  return { trip, customBookings, sheetUrl: spreadsheetUrl };
}
