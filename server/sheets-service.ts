import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

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

function configureCloudinary(): boolean {
  const cloudName = getEnvVal("CLOUDINARY_CLOUD_NAME", "CLOUD_NAME");
  const apiKey = getEnvVal("CLOUDINARY_API_KEY", "API_KEY");
  const apiSecret = getEnvVal("CLOUDINARY_API_SECRET", "API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return true;
}

export async function uploadToCloudinary(fileInput: string, folder = "athena_avatars"): Promise<string> {
  const isConfigured = configureCloudinary();
  if (!isConfigured) {
    throw new Error("Cloudinary environment variabelen ontbreken (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).");
  }

  const result = await cloudinary.uploader.upload(fileInput, {
    folder,
    resource_type: "image",
    transformation: [
      { width: 500, height: 500, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" }
    ]
  });

  return result.secure_url;
}

function getGoogleAuth() {
  const serviceAccountEmail = getEnvVal("GOOGLE_SERVICE_ACCOUNT_EMAIL", "SERVICE_ACCOUNT_EMAIL");
  let privateKey = getEnvVal("GOOGLE_PRIVATE_KEY", "PRIVATE_KEY");

  if (serviceAccountEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    return new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
      ],
    });
  }

  const clientId = getEnvVal("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_Id", "CLIENT_ID");
  const clientSecret = getEnvVal("GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_Secret", "CLIENT_SECRET");
  const refreshToken = getEnvVal("GOOGLE_REFRESH_TOKEN", "REFRESH_TOKEN");

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
  }

  return null;
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
  return getGoogleAuth();
}

export function isGoogleAuthConfigured(): boolean {
  return !!getGoogleAuth();
}

// Helper to ensure all required tabs exist in the spreadsheet
async function ensureTabsExist(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheetTitles = (meta.data.sheets || []).map((s: any) => s.properties.title);
    
    const requiredTabs = ["TripInfo", "Stays", "Users", "CustomBookings", "BookingLinks", "Transports", "ChatHistory", "Favorites"];
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

// Helper to look up existing row by ID in a sheet
async function findRowById(sheets: any, spreadsheetId: string, sheetTitle: string, idColumnIndex: number, id: string): Promise<number | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A:Z`, // Get all columns
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) { // Skip header row
      const row = rows[i];
      if (row.length > idColumnIndex && row[idColumnIndex] === id) {
        return i; // Return row number (1-based)
      }
    }
    return null; // No matching row found
  } catch (err: any) {
    console.warn("[Google Sheets] Could not lookup row by ID:", err?.message || err);
    return null;
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
          { properties: { title: "BookingLinks" } },
          { properties: { title: "Transports" } },
          { properties: { title: "ChatHistory" } },
          { properties: { title: "Favorites" } },
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
            range: "Users!A1:I3",
            values: [
              ["Username", "Email", "Name", "Role", "TripCode", "Nickname", "AvatarUrl", "PasswordHash", "UpdatedAt"],
              ["dennisvr", "dennis.van.rooden@gmail.com", "Dennis van Rooden", "owner", "ATH-2026", "Dennis", "", "", ""],
              ["Joyce", "Joyceockeloen@gmail.com", "Joyce Ockeloen", "member", "ATH-2026", "Joyce", "", "", ""]
            ],
          },
          {
            range: "CustomBookings!A1:I1",
            values: [
              ["ID", "Name", "Location", "Status", "Island", "PricePerNight", "CheckIn", "CheckOut", "Image"]
            ],
          },
          {
            range: "BookingLinks!A1:B1",
            values: [
              ["StayID", "BookingID"]
            ],
          },
          {
            range: "Transports!A1:K1",
            values: [
              ["ID", "Type", "From", "To", "Date", "DepartureTime", "ArrivalTime", "Operator", "BookingRef", "Notes", "LinkedLegId"]
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

export async function saveTripToSheet(
  tripData: any,
  customBookings: any[] = [],
  stayBookingLinks: Record<string, string> = {},
  transportEntries: any[] = []
): Promise<void> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("OAuth parameters ontbreken (vereist GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).");

  try {
    const { spreadsheetId } = await getOrCreateSpreadsheet();
    const sheets = google.sheets({ version: "v4", auth });

    await ensureTabsExist(sheets, spreadsheetId);

    // Validate tripData - strict DTO validation
    if (!tripData.startDate || !tripData.endDate) {
      throw new Error("Ongeldige reisdata: startDate en endDate zijn verplicht.");
    }
    const start = new Date(tripData.startDate);
    const end = new Date(tripData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Ongeldige reisdata: startDate en endDate moeten in YYYY-MM-DD formaat zijn.");
    }
    if (start > end) {
      throw new Error("Ongeldige reisdata: startDate moet voor endDate liggen.");
    }
    if (!tripData.id) {
      throw new Error("Ongeldige reisdata: id is verplicht.");
    }

    // Format TripInfo rows
    const tripInfoValues = [
      ["TripID", "Title", "StartDate", "EndDate", "DurationDays", "Style", "TripCode"],
      [
        tripData.id || "ATH-2026",
        tripData.title || "Cyclades Odyssey",
        tripData.startDate,
        tripData.endDate,
        String(tripData.durationDays || Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))),
        tripData.style || "Eilandhoppen",
        "ATH-2026"
      ]
    ];

    // Validate and filter stays - strict validation with date overlap check
    const seenStayIds = new Set<string>();
    const tripStart = start;
    const tripEnd = end;

    const validStays = (tripData.stays || []).filter((s: any, index: number, self: any[]) => {
      // Basic required field validation
      if (!s.id) return false;
      if (!s.island) return false;
      if (!s.startDate || !s.endDate) return false;

      // Check for duplicate IDs within the trip
      if (seenStayIds.has(s.id)) return false;
      seenStayIds.add(s.id);

      // Parse dates
      const sStart = new Date(s.startDate);
      const sEnd = new Date(s.endDate);

      // Validate date format
      if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) {
        return false;
      }

      // Validate date range
      if (sStart > sEnd) {
        return false;
      }

      // Check if stay overlaps with trip dates
      if (sStart < tripStart || sEnd > tripEnd) {
        return false;
      }

      // Check for overlap with other stays in the same trip
      for (let i = 0; i < self.length; i++) {
        if (i === index) continue;
        const otherStay = self[i];

        const oStart = new Date(otherStay.startDate);
        const oEnd = new Date(otherStay.endDate);

        if (!isNaN(oStart.getTime()) && !isNaN(oEnd.getTime())) {
          if (!(sEnd < oStart || sStart > oEnd)) {
            return false;
          }
        }
      }

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

    // Validate and filter custom bookings - strict validation
    const seenBookingIds = new Set<string>();
    const validBookings = (customBookings || []).filter((b: any) => {
      if (!b.id) return false;
      if (!b.name || !b.location) return false;

      if (seenBookingIds.has(b.id)) return false;
      seenBookingIds.add(b.id);

      return true;
    });

    // Format Custom Bookings rows
    const bookingHeaders = ["ID", "Name", "Location", "Status", "Island", "PricePerNight", "CheckIn", "CheckOut", "Image"];
    const bookingRows = validBookings.map((b: any) => [
      b.id,
      b.name,
      b.location,
      b.status || "PENDING",
      b.island || "",
      b.pricePerNight || "",
      b.checkIn || "",
      b.checkOut || "",
      b.image || ""
    ]);
    const bookingValues = [bookingHeaders, ...bookingRows];

// Format Booking Links rows (stayId -> bookingId)
    const linkHeaders = ["StayID", "BookingID"];
    const linkRows = Object.entries(stayBookingLinks || {})
      .filter(([stayId, bookingId]) => stayId && bookingId)
      .map(([stayId, bookingId]) => [stayId, bookingId]);
    const linkValues = [linkHeaders, ...linkRows];

    // Validate and format transport entries (booked ferries/flights/transfers)
    const seenTransportIds = new Set<string>();
    const validTransports = (transportEntries || []).filter((t: any) => {
      if (!t.id) return false;
      if (!t.date) return false;
      if (seenTransportIds.has(t.id)) return false;
      seenTransportIds.add(t.id);
      return true;
    });

    // Format Transports rows
    const transportHeaders = ["ID", "Type", "From", "To", "Date", "DepartureTime", "ArrivalTime", "Operator", "BookingRef", "Notes", "LinkedLegId"];
    const transportRows = validTransports.map((t: any) => [
      t.id,
      t.type || "ferry",
      t.from || "",
      t.to || "",
      t.date,
      t.departureTime || "",
      t.arrivalTime || "",
      t.operator || "",
      t.bookingRef || "",
      t.notes || "",
      t.linkedLegId || ""
    ]);
    const transportValues = [transportHeaders, ...transportRows];

    // Overwrite values
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          { range: "TripInfo!A1:G2", values: tripInfoValues },
          { range: `Stays!A1:G${Math.max(staysValues.length, 2)}`, values: staysValues },
          { range: `CustomBookings!A1:I${Math.max(bookingValues.length, 2)}`, values: bookingValues },
          { range: `BookingLinks!A1:B${Math.max(linkValues.length, 2)}`, values: linkValues },
          { range: `Transports!A1:K${Math.max(transportValues.length, 2)}`, values: transportValues }
        ]
      }
    });
  } catch (err: any) {
    throw new Error(formatGoogleError(err));
  }
}

export async function loadTripFromSheet(): Promise<{ trip: any; customBookings: any[]; stayBookingLinks: Record<string, string>; transportEntries: any[]; sheetUrl: string }> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("Google auth parameters ontbreken.");

  try {
    const { spreadsheetId, spreadsheetUrl } = await getOrCreateSpreadsheet();
    const sheets = google.sheets({ version: "v4", auth });

    await ensureTabsExist(sheets, spreadsheetId);

    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ["TripInfo!A2:G2", "Stays!A2:G20", "CustomBookings!A2:I50", "BookingLinks!A2:B50", "Transports!A2:K100"],
    });

    const valueRanges = res.data.valueRanges || [];
    const tripRow = valueRanges[0]?.values?.[0];
    const staysRows = valueRanges[1]?.values || [];
    const bookingRows = valueRanges[2]?.values || [];
    const linkRows = valueRanges[3]?.values || [];
    const transportRows = valueRanges[4]?.values || [];

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
        checkIn: row[6] || "",
        checkOut: row[7] || "",
        image: row[8] || "",
      }));

const stayBookingLinks = linkRows
      .filter((row: any) => row && row[0] && row[1])
      .reduce<Record<string, string>>((acc, row: any) => {
        acc[row[0]] = row[1];
        return acc;
      }, {});

    const transportEntries = transportRows
      .filter((row: any) => row && row[4]) // Must have a date
      .map((row: any) => ({
        id: row[0] || `transport-${Math.random()}`,
        type: (row[1] || "ferry") as string,
        from: row[2] || "",
        to: row[3] || "",
        date: row[4],
        departureTime: row[5] || undefined,
        arrivalTime: row[6] || undefined,
        operator: row[7] || undefined,
        bookingRef: row[8] || undefined,
        notes: row[9] || undefined,
        linkedLegId: row[10] || undefined,
      }));

    return { trip, customBookings, stayBookingLinks, transportEntries, sheetUrl: spreadsheetUrl };
  } catch (err: any) {
    throw new Error(formatGoogleError(err));
  }
}

const USER_HEADERS = ["Username", "Email", "Name", "Role", "TripCode", "Nickname", "AvatarUrl", "PasswordHash", "UpdatedAt"];

// Ensure the Users sheet has the required profile columns (Nickname, AvatarUrl, PasswordHash, UpdatedAt)
async function ensureUserSheetHeaders(sheets: any, spreadsheetId: string) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Users!A1:I1",
    });

    const existingHeaders = (res.data.values && res.data.values[0]) || [];
    const missingColumns: { column: string; index: number }[] = [];

    USER_HEADERS.forEach((header, index) => {
      const existing = (existingHeaders[index] || "").trim().toLowerCase();
      if (existing !== header.toLowerCase()) {
        missingColumns.push({ column: header, index });
      }
    });

    if (missingColumns.length > 0) {
      const values = [...USER_HEADERS];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Users!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });
      console.log("[Google Sheets] Users sheet headers updated to include profile columns.");
    }
  } catch (err: any) {
    console.warn("[Google Sheets] Could not ensure Users headers:", err?.message || err);
  }
}

// Find the row number (1-based, including header) for a user by email or username
async function findUserRowByEmailOrUsername(sheets: any, spreadsheetId: string, email: string, username: string): Promise<number | null> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Users!A:I",
  });

  const rows = res.data.values || [];
  const emailLower = (email || "").trim().toLowerCase();
  const usernameLower = (username || "").trim().toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.length) continue;
    const rowUsername = (row[0] || "").trim().toLowerCase();
    const rowEmail = (row[1] || "").trim().toLowerCase();
    if ((emailLower && rowEmail === emailLower) || (usernameLower && rowUsername === usernameLower)) {
      return i + 1; // Convert 0-based array index to 1-based sheet row number
    }
  }
  return null;
}

export interface UserProfileUpdate {
  nickname?: string;
  avatarUrl?: string;
  passwordHash?: string;
}

export async function updateUserProfileInSheet(
  identifier: { email?: string; username?: string },
  updates: UserProfileUpdate
): Promise<any | null> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("Google credentials ontbreken (OAuth of Service Account).");

  const { spreadsheetId } = await getOrCreateSpreadsheet();
  const sheets = google.sheets({ version: "v4", auth });

  await ensureTabsExist(sheets, spreadsheetId);
  await ensureUserSheetHeaders(sheets, spreadsheetId);

  const rowNumber = await findUserRowByEmailOrUsername(sheets, spreadsheetId, identifier.email || "", identifier.username || "");
  const updatedAt = new Date().toISOString();

  if (rowNumber) {
    // Update existing row: merge with current values so untouched columns are preserved
    const existing = await getUserFromSheet(identifier.email || "", identifier.username || "");
    const values = [
      updates.nickname !== undefined ? updates.nickname : (existing?.nickname || ""),
      updates.avatarUrl !== undefined ? updates.avatarUrl : (existing?.avatarUrl || ""),
      updates.passwordHash !== undefined ? updates.passwordHash : (existing?.passwordHash || ""),
      updatedAt,
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Users!F${rowNumber}:I${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
  } else {
    // User not found: append a new row with the identifier + updates
    const existing = await getUserFromSheet(identifier.email || "", identifier.username || "");
    const baseRow = existing
      ? [existing.username, existing.email, existing.name, existing.role, existing.tripCode]
      : [identifier.username || "", identifier.email || "", "", "member", "ATH-2026"];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Users!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          baseRow[0], baseRow[1], baseRow[2], baseRow[3], baseRow[4],
          updates.nickname || baseRow[0] || "",
          updates.avatarUrl || "",
          updates.passwordHash || "",
          updatedAt,
        ]],
      },
    });
  }

  return getUserFromSheet(identifier.email || "", identifier.username || "");
}

// Retrieve a user from the Users sheet by email or username
export async function getUserFromSheet(email: string, username: string): Promise<any | null> {
  const auth = getOAuthClient();
  if (!auth) return null;

  try {
    const { spreadsheetId } = await getOrCreateSpreadsheet();
    const sheets = google.sheets({ version: "v4", auth });

    await ensureTabsExist(sheets, spreadsheetId);
    await ensureUserSheetHeaders(sheets, spreadsheetId);

    const rowNumber = await findUserRowByEmailOrUsername(sheets, spreadsheetId, email, username);
    if (!rowNumber) return null;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Users!A${rowNumber}:I${rowNumber}`,
    });

    const row = (res.data.values && res.data.values[0]) || [];
    return {
      username: row[0] || "",
      email: row[1] || "",
      name: row[2] || "",
      role: row[3] || "member",
      tripCode: row[4] || "ATH-2026",
      nickname: row[5] || row[2] || row[0] || "",
      avatarUrl: row[6] || "",
      passwordHash: row[7] || "",
      updatedAt: row[8] || "",
    };
  } catch (err: any) {
    console.warn("[Google Sheets] Could not fetch user:", err?.message || err);
    return null;
  }
}

const CHAT_HISTORY_HEADERS = ["ID", "SessionID", "Role", "SenderName", "Timestamp", "SavedAt", "Content", "Sources"];
const FAVORITES_HEADERS = ["ID", "Content", "SenderName", "Timestamp", "SavedAt", "Sources"];

export interface SheetChatMessage {
  id: string;
  sessionId?: string;
  role: string;
  senderName?: string;
  timestamp?: string;
  savedAt?: string;
  content: string;
  sources?: { title: string; url: string }[];
}

export interface SheetFavorite {
  id: string;
  content: string;
  senderName?: string;
  timestamp?: string;
  savedAt?: string;
  sources?: { title: string; url: string }[];
}

export async function saveChatHistoryToSheet(messages: SheetChatMessage[]): Promise<void> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("Google credentials ontbreken.");

  const { spreadsheetId } = await getOrCreateSpreadsheet();
  const sheets = google.sheets({ version: "v4", auth });
  await ensureTabsExist(sheets, spreadsheetId);

  try {
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "ChatHistory!A2:H1000" });
  } catch (err: any) {
    console.warn("[Google Sheets] Could not clear ChatHistory:", err?.message || err);
  }

  const rows = (messages || []).slice(-200).map((m) => [
    m.id || "",
    m.sessionId || "",
    m.role || "user",
    m.senderName || "",
    m.timestamp || "",
    m.savedAt || "",
    m.content || "",
    m.sources && m.sources.length ? JSON.stringify(m.sources) : "",
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "ChatHistory!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [CHAT_HISTORY_HEADERS, ...rows] },
  });
}

export async function loadChatHistoryFromSheet(): Promise<SheetChatMessage[]> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("Google credentials ontbreken.");

  const { spreadsheetId } = await getOrCreateSpreadsheet();
  const sheets = google.sheets({ version: "v4", auth });
  await ensureTabsExist(sheets, spreadsheetId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "ChatHistory!A2:H500",
  });

  return ((res.data.values || []) as any[])
    .filter((row) => row && row[0] && row[6])
    .map((row) => {
      let sources;
      if (row[7]) {
        try {
          sources = JSON.parse(row[7]);
        } catch {
          sources = undefined;
        }
      }
      return {
        id: row[0],
        sessionId: row[1] || "",
        role: row[2] || "user",
        senderName: row[3] || "",
        timestamp: row[4] || "",
        savedAt: row[5] || "",
        content: row[6],
        sources,
      };
    });
}

export async function saveFavoritesToSheet(favorites: SheetFavorite[]): Promise<void> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("Google credentials ontbreken.");

  const { spreadsheetId } = await getOrCreateSpreadsheet();
  const sheets = google.sheets({ version: "v4", auth });
  await ensureTabsExist(sheets, spreadsheetId);

  try {
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Favorites!A2:F1000" });
  } catch (err: any) {
    console.warn("[Google Sheets] Could not clear Favorites:", err?.message || err);
  }

  const rows = (favorites || []).slice(-200).map((f) => [
    f.id || "",
    f.content || "",
    f.senderName || "",
    f.timestamp || "",
    f.savedAt || "",
    f.sources && f.sources.length ? JSON.stringify(f.sources) : "",
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Favorites!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [FAVORITES_HEADERS, ...rows] },
  });
}

export async function loadFavoritesFromSheet(): Promise<SheetFavorite[]> {
  const auth = getOAuthClient();
  if (!auth) throw new Error("Google credentials ontbreken.");

  const { spreadsheetId } = await getOrCreateSpreadsheet();
  const sheets = google.sheets({ version: "v4", auth });
  await ensureTabsExist(sheets, spreadsheetId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Favorites!A2:F500",
  });

  return ((res.data.values || []) as any[])
    .filter((row) => row && row[0] && row[1])
    .map((row) => {
      let sources;
      if (row[5]) {
        try {
          sources = JSON.parse(row[5]);
        } catch {
          sources = undefined;
        }
      }
      return {
        id: row[0],
        content: row[1],
        senderName: row[2] || "",
        timestamp: row[3] || "",
        savedAt: row[4] || "",
        sources,
      };
    });
}


