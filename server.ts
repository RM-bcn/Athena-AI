import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createHmac, timingSafeEqual } from "crypto";
import { compare } from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import {
  isGoogleAuthConfigured,
  getOrCreateSpreadsheet,
  saveTripToSheet,
  loadTripFromSheet,
  getTripCodeFromSheet,
  getUserFromSheet,
  updateUserProfileInSheet,
  saveChatHistoryToSheet,
  loadChatHistoryFromSheet,
  saveFavoritesToSheet,
  loadFavoritesFromSheet,
} from "./server/sheets-service.js";
import { handleProfileUpdate } from "./server/profile-service.js";
import { SEED_USERS } from "./server/seed-users.js";
import { getWeather, searchWeb, findRestaurants, getCityTips } from "./server/live-providers.js";
import type { ToolResult, Source } from "./server/live-providers.js";
import { transliterateGreek } from "./server/transliterate.js";
import { translateWithMyMemory } from "./server/translate-fallback.js";
import { handleFerryDisruptions } from "./server/ferry-disruptions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Flexible case-insensitive env variable reader
function getEnvVal(...names: string[]): string {
  for (const name of names) {
    if (process.env[name] && process.env[name]!.trim()) {
      return process.env[name]!.trim();
    }
  }
  const lowerNames = names.map((n) => n.toLowerCase());
  for (const key of Object.keys(process.env)) {
    if (lowerNames.includes(key.toLowerCase()) && process.env[key] && process.env[key]!.trim()) {
      return process.env[key]!.trim();
    }
  }
  return "";
}

// API: Trip code validation (guest flow; no auth required)
app.get("/api/trips/validate", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code.trim().toUpperCase() : "";
  if (!code) {
    return res.json({ valid: false });
  }

  try {
    let validCodes: string[] = [];
    if (isGoogleAuthConfigured()) {
      validCodes = await getTripCodeFromSheet();
    }
    if (validCodes.length === 0) {
      validCodes = ["ATH-2026"];
    }
    return res.json({ valid: validCodes.some((c) => c.trim().toUpperCase() === code) });
  } catch (err: any) {
    console.error("Trip validation error:", err?.message || err);
    return res.json({ valid: code === "ATH-2026" });
  }
});

// API: Google Sheets Status
app.get("/api/sheets/status", async (req, res) => {
  try {
    const configured = isGoogleAuthConfigured();
    if (!configured) {
      return res.json({
        configured: false,
        message: "Google OAuth parameters (CLIENT_ID, CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) missing or inactive.",
      });
    }

    const { spreadsheetId, spreadsheetUrl } = await getOrCreateSpreadsheet();
    res.json({
      configured: true,
      spreadsheetId,
      spreadsheetUrl,
    });
  } catch (err: any) {
    res.json({
      configured: false,
      error: err.message || "Failed to query Google Sheets status",
    });
  }
});

// API: Load Trip from Google Sheets
app.get("/api/sheets/load", async (req, res) => {
  try {
    if (!isGoogleAuthConfigured()) {
      return res.json({ error: "Google OAuth is niet volledig geconfigureerd op Vercel. Controleer of GOOGLE_REFRESH_TOKEN ook is aangevinkt voor 'Preview' en 'Production' in Vercel settings." });
    }
    const data = await loadTripFromSheet();
    res.json(data);
  } catch (err: any) {
    console.error("Sheets load error:", err);
    res.json({ error: err.message || "Fout bij laden van reis uit Google Sheets" });
  }
});

// API: Save Trip to Google Sheets
app.post("/api/sheets/save", requireAuth, async (req, res) => {
  try {
    if (!isGoogleAuthConfigured()) {
      return res.json({
        success: false,
        error: "Google OAuth parameter GOOGLE_REFRESH_TOKEN ontbreekt. In Vercel staat deze op 'Production' maar niet op 'Preview'. Pas de Vercel Environment Variable instelling aan naar 'Production and Preview'."
      });
    }
    const { trip, customBookings, stayBookingLinks, transportEntries } = req.body;
    await saveTripToSheet(trip, customBookings || [], stayBookingLinks || {}, transportEntries || []);
    const { spreadsheetUrl } = await getOrCreateSpreadsheet();
    res.json({ success: true, spreadsheetUrl });
  } catch (err: any) {
    console.error("Sheets save error:", err);
    res.json({
      success: false,
      error: err.message || "Fout bij opslaan naar Google Sheets."
    });
  }
});

// API: Live weather via Open-Meteo (reuses getWeather provider)
app.get("/api/weather", async (req, res) => {
  try {
    const city = String(req.query.city || "Athens");
    const result = await getWeather(city);

    const lines = result.text.split("\n");
    const tempLine = lines.find((l) => l.startsWith("- "));
    const descLine = lines.find((l) => l.startsWith("Weer in"));

    let temperature: number | null = null;
    if (tempLine) {
      const m = tempLine.match(/(-?\d+)/);
      if (m) temperature = parseInt(m[1], 10);
    }

    let condition = "";
    if (descLine) {
      const before = descLine.split("(")[0];
      condition = before.replace("Weer in ", "").trim();
    }

    // Sunrise/sunset from the first forecast day ("Vandaag: zonsopgang HH:MM, zonsondergang HH:MM")
    const sunLine = lines.find((l) => l.startsWith("- Vandaag:"));
    let sunrise = "";
    let sunset = "";
    if (sunLine) {
      const sr = sunLine.match(/zonsopgang\s+(\d{2}:\d{2})/);
      const ss = sunLine.match(/zonsondergang\s+(\d{2}:\d{2})/);
      if (sr) sunrise = sr[1];
      if (ss) sunset = ss[1];
    }

    res.json({
      location: result.sources?.[0]?.title?.replace("Open-Meteo weersverwachting ", "") || city,
      temperature,
      condition,
      sunrise,
      sunset,
      sources: result.sources || [],
    });
  } catch (err: any) {
    console.error("Weather API error:", err?.message || err);
    res.status(500).json({ error: "Weer niet beschikbaar" });
  }
});

// API: Chat History (Google Sheets backed; client keeps localStorage fallback)
app.get("/api/chat/history", async (req, res) => {
  try {
    if (!isGoogleAuthConfigured()) {
      return res.json({ messages: [] });
    }
    const messages = await loadChatHistoryFromSheet();
    res.json({ messages });
  } catch (err: any) {
    console.warn("Chat history load error:", err?.message || err);
    res.json({ messages: [] });
  }
});

app.post("/api/chat/history", requireAuth, async (req, res) => {
  try {
    if (!isGoogleAuthConfigured()) {
      return res.json({ success: false, error: "Google Sheets niet geconfigureerd." });
    }
    const { messages } = req.body;
    await saveChatHistoryToSheet(messages || []);
    res.json({ success: true });
  } catch (err: any) {
    console.warn("Chat history save error:", err?.message || err);
    res.json({ success: false, error: err?.message || "Failed to save chat history" });
  }
});

// API: Favorites (saved Athena answers; Google Sheets backed)
app.get("/api/chat/favorites", async (req, res) => {
  try {
    if (!isGoogleAuthConfigured()) {
      return res.json({ favorites: [] });
    }
    const favorites = await loadFavoritesFromSheet();
    res.json({ favorites });
  } catch (err: any) {
    console.warn("Favorites load error:", err?.message || err);
    res.json({ favorites: [] });
  }
});

app.post("/api/chat/favorites", requireAuth, async (req, res) => {
  try {
    if (!isGoogleAuthConfigured()) {
      return res.json({ success: false, error: "Google Sheets niet geconfigureerd." });
    }
    const { favorites } = req.body;
    await saveFavoritesToSheet(favorites || []);
    res.json({ success: true });
  } catch (err: any) {
    console.warn("Favorites save error:", err?.message || err);
    res.json({ success: false, error: err?.message || "Failed to save favorites" });
  }
});

// API: Update User Profile (nickname, avatar, password)
app.post("/api/profile/update", requireAuth, (req, res) => {
  const authIdentity = ((req as any).authEmail || "").trim().toLowerCase();
  const bodyEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const bodyUsername = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const isOwner =
    (bodyEmail !== "" && bodyEmail === authIdentity) ||
    (bodyUsername !== "" && bodyUsername === authIdentity);
  if (!isOwner) {
    return res.status(403).json({ success: false, error: "Je kunt alleen je eigen profiel bewerken." });
  }
  return handleProfileUpdate(req, res);
});

// API: Get current user profile from Google Sheets (used after login to restore avatar/nickname)
app.get("/api/user", async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
    const username = typeof req.query.username === "string" ? req.query.username.trim() : "";
    if (!email && !username) {
      return res.status(400).json({ success: false, error: "E-mailadres of gebruikersnaam is verplicht." });
    }

    const user = await getUserFromSheet(email, username);
    if (!user) {
      return res.status(404).json({ success: false, error: "Gebruiker niet gevonden." });
    }

    const { passwordHash: _removed, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error("[User] Fetch error:", err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || "Fout bij ophalen van gebruiker." });
  }
});

// Auth: HMAC-signed session token (payloadBase64.signature met { email, exp }).
function getSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.trim() && fromEnv !== "MY_SESSION_SECRET") {
    return fromEnv.trim();
  }
  return "athena-ai-local-dev-secret";
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dagen

function signToken(email: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ email, exp: expiresAt }), "utf8").toString("base64url");
  const signature = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt };
}

function verifyToken(token: string): { email: string } | null {
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  let payloadText: string;
  try {
    payloadText = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", getSessionSecret()).update(payloadB64).digest("base64url");
  const supplied = Buffer.from(signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    return null;
  }
  if (typeof parsed.email !== "string" || typeof parsed.exp !== "number") return null;
  if (Date.now() > parsed.exp) return null;
  return { email: parsed.email };
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: "Niet ingelogd of sessie verlopen." });
  }
  (req as any).authEmail = payload.email;
  next();
}

const GENERIC_LOGIN_ERROR = "Ongeldige gebruikersnaam of wachtwoord.";

// API: Server-side login with bcrypt verification
// (Google Sheets Users tab, met SEED_USERS-fallback als Sheets niet is geconfigureerd)
app.post("/api/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body || {};
    const identifier = typeof usernameOrEmail === "string" ? usernameOrEmail.trim() : "";
    const candidatePassword = typeof password === "string" ? password : "";

    if (!identifier || !candidatePassword) {
      return res.status(400).json({ success: false, error: "Gebruikersnaam en wachtwoord zijn verplicht." });
    }

    let user: any = null;
    if (isGoogleAuthConfigured()) {
      try {
        user = await getUserFromSheet(identifier, identifier);
      } catch (err: any) {
        console.warn("[Login] Sheets lookup skipped:", err?.message || err);
      }
    }

    const seedUser = SEED_USERS.find(
      (u) =>
        u.username.toLowerCase() === identifier.toLowerCase() ||
        u.email.toLowerCase() === identifier.toLowerCase()
    );

    if (user?.passwordHash) {
      const valid = await compare(candidatePassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
      }
    } else {
      if (!seedUser) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
      }
      const valid = await compare(candidatePassword, seedUser.passwordHash);
      if (!valid) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
      }
      if (user && !user.passwordHash) {
        try {
          await updateUserProfileInSheet(
            { email: user.email || "", username: user.username || "" },
            { passwordHash: seedUser.passwordHash }
          );
          user = await getUserFromSheet(identifier, identifier);
        } catch (err: any) {
          console.warn("[Login] Hash migration to sheet skipped:", err?.message || err);
        }
      }
    }

    const { token, expiresAt } = signToken(identifier);
    const safeUser = {
      username: user?.username || seedUser?.username || "",
      email: user?.email || seedUser?.email || "",
      name: user?.name || seedUser?.name || "",
      nickname: user?.nickname || seedUser?.nickname || "",
      avatar: seedUser?.avatar || "",
      avatarUrl: user?.avatarUrl || seedUser?.avatarUrl || "",
      role: user?.role || seedUser?.role || "member",
      tripCode: user?.tripCode || seedUser?.tripCode || "ATH-2026",
      updatedAt: user?.updatedAt || "",
    };
    return res.json({ success: true, user: safeUser, token, expiresAt });
  } catch (err: any) {
    console.error("[Login] Error:", err?.message || err);
    return res.status(500).json({ success: false, error: "Er is een onverwachte serverfout opgetreden." });
  }
});

// API: Blue Star Ferries "Itineraries Modifications" (scraped, no API key)
app.get("/api/ferry/disruptions", handleFerryDisruptions);

// Helper to get Gemini AI instance safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Helper to call Groq API safely (Primary AI Engine with multi-model fallback)
async function callGroqAI(systemPrompt: string, userPrompt: string, retriesLeft = 2): Promise<{ content: string; model: string } | null> {
  const apiKey = getEnvVal("GROQ_API_KEY", "GROQ_KEY", "GROQ_API_TOKEN", "GROQ_SECRET", "groq_api_key");
  if (!apiKey) {
    return null;
  }

  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return { content, model };
        }
      } else {
        const errText = await res.text();
        console.warn(`Groq API model ${model} error (${res.status}):`, errText);
        if (res.status === 429) {
          if (retriesLeft <= 0) break;
          const waitMs = parseRetryAfterMs(errText, res.headers.get("retry-after")) || 4000;
          if (waitMs > 5000) break; // sustained limit (e.g. daily budget) — hand over to Gemini quickly
          await sleep(waitMs);
          return callGroqAI(systemPrompt, userPrompt, retriesLeft - 1);
        }
      }
    } catch (err) {
      console.warn(`Groq API exception for model ${model}:`, err);
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfterMs(errText: string, retryAfter: string | null): number | null {
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) return secs * 1000;
  }
  const m = (errText || "").match(/try again in ([\d.]+)s/);
  if (m) return Math.ceil(Number(m[1])) * 1000;
  return null;
}

function parseFailedGeneration(errText: string): { name: string; arguments: any } | null {
  let gen = errText || "";
  try {
    const parsed = JSON.parse(errText);
    gen = parsed?.error?.failed_generation || gen;
  } catch {
    // raw text fallback below
  }
  const m = gen.match(/<\s*function=(\w+)[\s=]*(\{[\s\S]*?\})\s*(?:>\s*)?<\s*\/\s*function\s*>/i);
  if (!m) return null;
  try {
    return { name: m[1], arguments: JSON.parse(m[2]) };
  } catch {
    return null;
  }
}

// API: AI Engine Status
app.get("/api/ai/status", (req, res) => {
  const groqKey = getEnvVal("GROQ_API_KEY", "GROQ_KEY", "GROQ_API_TOKEN", "GROQ_SECRET", "groq_api_key");
  const geminiKey = process.env.GEMINI_API_KEY;

  const hasGroq = !!(groqKey && groqKey !== "MY_GROQ_API_KEY");
  const hasGemini = !!(geminiKey && geminiKey !== "MY_GEMINI_API_KEY");
  const duckduckgoEnabled = getEnvVal("DUCKDUCKGO_ENABLED", "duckduckgo_enabled") !== "false";

  res.json({
    activeEngine: hasGroq
      ? "Groq Llama-3.3-70B (Primary Ultra-Fast)"
      : hasGemini
      ? "Gemini 3.6 Flash"
      : "Athena Greek Concierge Engine",
    hasGroqKey: hasGroq,
    hasGeminiKey: hasGemini,
    liveSearch: duckduckgoEnabled
      ? "DuckDuckGo (gratis, geen API-sleutel nodig)"
      : "Uitgeschakeld",
  });
});

// Helper to parse JSON from AI response if embedded
function parseAIJsonBlock(text: string): any | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const raw = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(raw);
    }
  } catch {
    return null;
  }
  return null;
}

const GREEK_ISLAND_NAMES = [
  "naxos", "milos", "koufonisia", "santorini", "mykonos", "paros", "antiparos", "ios",
  "tinos", "syros", "sifnos", "amorgos", "folegandros", "serifos", "kimolos", "samos",
  "crete", "kreta", "rhodes", "corfu", "zakynthos", "kefalonia", "hydra", "poros", "egina",
];

const LIVE_INFO_KEYWORDS = [
  // Restaurants & food
  "restaurant", "taverna", "tavern", "eten", "eet", "eetcafé", "food", "menu", "menukaart",
  "prijs", "prijzen", "kosten", "ontbijt", "lunch", "diner", "dinner", "gyros", "souvlaki",
  "seafood", "fish", "octopus", "wijn", "drinks", "café", "cafe", "bistro", "grieks eten",
  // Weather
  "weer", "weersverwachting", "temperature", "temperatuur", "regen", "zon", "wind",
  "meltemi", "graden", "forecast", "degrees", "het weer",
  // Events
  "events", "evenement", "evenementen", "festival", "feest", "concert", "party",
  "panigiri", "celebratie",
  // Ferry & transport
  "ferry", "ferries", "veer", "timetable", "dienstregeling", "afvaart", "schepen", "boot",
  "catamaran", "hydrofoil", "seajets", "blue star", "haven", "port", "veerboten",
  // Sights & activities
  "strand", "beach", "bezienswaardigheid", "bezienswaardigheden", "sights", "attracties",
  "hike", "wandeling", "wandelen", "beste", "best", "top", "must-see", "shop", "shopping",
  "winkels", "markt", "activities",
  // Practical info
  "open", "openingsuren", "openingstijden", "geopend", "entree", "ticket", "tickets",
  "reserveren", "reservation", "booking", "hoe laat", "wanneer", "waar", "tips",
];

function needsLiveSearch(message: string): boolean {
  const lower = message.toLowerCase();
  return LIVE_INFO_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Groq tool-calling agent (live info tools: search_web, get_weather,
// find_restaurants, get_city_tips) — all providers are free & keyless.
// ---------------------------------------------------------------------------
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Live zoekopdracht op het web (DuckDuckGo, met Wikipedia/Wikivoyage als fallback) voor actuele info en algemene vragen: prijzen, openingstijden, evenementen, ferry's, excursies, bezienswaardigheden, lokale weetjes. Gebruik NIET voor een lijst van concrete restaurants: daarvoor is find_restaurants beter (via OpenStreetMap). Geef een gerichte Nederlandse zoekopdracht, b.v. 'veerboot Naxos Koufonisia tijden'.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "De zoekopdracht, in het Nederlands, b.v. 'beste restaurants Naxos 2026'" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Huidige weersverwachting (vandaag + 5 dagen) voor een plaats of eiland via Open-Meteo (gratis, geen sleutel). Gebruik dit wanneer de reiziger vraagt naar het weer, temperaturen, regen of wind.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Plaats of eiland, b.v. 'Naxos, Griekenland'" },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_restaurants",
      description:
        "Live restaurants rond een locatie opvragen via OpenStreetMap (namen, keuken, adres, openingstijden). Gebruik dit voor concrete restaurants in de buurt van een plaats.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Plaats of eiland, b.v. 'Naxos Stad'" },
          radius: { type: "number", description: "Zoekstraal in meters (optioneel, standaard 5000)" },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_city_tips",
      description:
        "Reistips over een stad of eiland uit Wikipedia en Wikivoyage: bezienswaardigheden, wat te doen, achtergrond. Gebruik dit voor algemene vragen over een bestemming.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Stad of eiland, b.v. 'Naxos'" },
        },
        required: ["city"],
      },
    },
  },
];

async function executeTool(name: string, args: any): Promise<ToolResult> {
  try {
    switch (name) {
      case "search_web":
        return await searchWeb(args?.query || "");
      case "get_weather":
        return await getWeather(args?.location || "");
      case "find_restaurants":
        return await findRestaurants(args?.location || "", args?.radius);
      case "get_city_tips":
        return await getCityTips(args?.city || "");
      default:
        return { text: `Onbekende tool: ${name}` };
    }
  } catch (err: any) {
    console.warn(`Tool ${name} error:`, err?.message || err);
    return { text: `Fout bij het uitvoeren van ${name}: ${err?.message || err}` };
  }
}

async function callGroqAgent(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; model: string; sources: Source[]; rateLimited: boolean } | null> {
  const apiKey = getEnvVal("GROQ_API_KEY", "GROQ_KEY", "GROQ_API_TOKEN", "GROQ_SECRET", "groq_api_key");
  if (!apiKey) return null;

  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  let hardRateLimited = false;

  for (const model of models) {
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const collectedSources: Source[] = [];
    let rounds = 0;
    let toolRoundsUsed = false;
    let consecutive429 = 0;
    try {
      while (rounds < 4) {
        rounds++;
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 1600,
            tools: TOOL_DEFINITIONS,
            tool_choice: "auto",
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`Groq agent model ${model} error (${res.status}):`, errText);
          if (res.status === 429) {
            const waitMs = parseRetryAfterMs(errText, res.headers.get("retry-after")) || 4000;
            if (consecutive429 >= 1 || waitMs > 5000) {
              hardRateLimited = true;
              break; // sustained rate limit (e.g. daily budget) — hand over to Gemini quickly
            }
            consecutive429++;
            await sleep(Math.min(waitMs, 4000));
            rounds--; // retry this round after a short backoff
            continue;
          }
          if (res.status === 400 && errText.includes("tool_use_failed")) {
            const parsed = parseFailedGeneration(errText);
            if (parsed) {
              toolRoundsUsed = true;
              const result = await executeTool(parsed.name, parsed.arguments);
              if (result.sources) {
                for (const s of result.sources) {
                  if (!collectedSources.some((x) => x.url === s.url)) collectedSources.push(s);
                }
              }
              messages.push({
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_retry_0",
                    type: "function",
                    function: { name: parsed.name, arguments: JSON.stringify(parsed.arguments) },
                  },
                ],
              });
              messages.push({ role: "tool", tool_call_id: "call_retry_0", content: result.text });
              continue;
            }
          }
          break;
        }

        const data = await res.json();
        const msg = data.choices?.[0]?.message;
        const content = msg?.content || "";
        const toolCalls = msg?.tool_calls || [];

        if (toolCalls.length > 0) {
          toolRoundsUsed = true;
          messages.push(msg);
          for (const tc of toolCalls) {
            let args: any = {};
            try {
              args = JSON.parse(tc.function?.arguments || "{}");
            } catch {
              args = {};
            }
            const result = await executeTool(tc.function?.name, args);
            if (result.sources) {
              for (const s of result.sources) {
                if (!collectedSources.some((x) => x.url === s.url)) collectedSources.push(s);
              }
            }
            messages.push({ role: "tool", tool_call_id: tc.id, content: result.text });
          }
          continue;
        }

        // Sommige modellen (vooral Groq 8b) verwerken de functie-aanroep als raw
        // tekst in de content: <function=name{...}</function>, in plaats van via
        // het gestructureerde tool_calls-veld. Parse + execute die tag en blijf in
        // de agent-loop, anders wordt de rauwe tag als eind-antwoord getoond.
        if (!toolCalls.length && content && /<\s*function=\w+[\s=]*\{/i.test(content)) {
          const embedded = parseFailedGeneration(content);
          if (embedded) {
            toolRoundsUsed = true;
            const result = await executeTool(embedded.name, embedded.arguments);
            if (result.sources) {
              for (const s of result.sources) {
                if (!collectedSources.some((x) => x.url === s.url)) collectedSources.push(s);
              }
            }
            messages.push({
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: `call_embedded_${rounds}`,
                  type: "function",
                  function: { name: embedded.name, arguments: JSON.stringify(embedded.arguments) },
                },
              ],
            });
            messages.push({ role: "tool", tool_call_id: `call_embedded_${rounds}`, content: result.text });
            continue;
          }
        }

        if (content) {
          return { content, model, sources: collectedSources.slice(0, 8), rateLimited: hardRateLimited };
        }
        return { content: "", model: "", sources: [], rateLimited: hardRateLimited };
      }

      // Tool rounds exhausted without a final answer: synthesize from the tool results.
      if (toolRoundsUsed && collectedSources.length > 0) {
        const finalRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 1600,
          }),
        });
        if (finalRes.ok) {
          const finalData = await finalRes.json();
          const finalContent = finalData.choices?.[0]?.message?.content;
          if (finalContent) {
            return { content: finalContent, model, sources: collectedSources.slice(0, 8), rateLimited: hardRateLimited };
          }
        }
      }
    } catch (err) {
      console.warn(`Groq agent exception for model ${model}:`, err);
    }
  }
  return { content: "", model: "", sources: [], rateLimited: hardRateLimited };
}

const WEATHER_KEYWORDS = [
  "weer", "weers", "weersverwachting", "temperatuur", "temperature", "graden",
  "degrees", "forecast", "regen", "zon", "wind", "meltemi",
];

function formatDate(dateStr: string): string {
  const parts = (dateStr || "").split("-");
  if (parts.length < 3) return dateStr || "?";
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${Number(parts[2])} ${months[Number(parts[1]) - 1] || parts[1]}`;
}

async function probeFallback(message: string, context: string, defaultIsland = ""): Promise<ToolResult | null> {
  const lower = message.toLowerCase();
  const islandMatch = (context || "").match(/([A-Za-zÀ-ÿ'-]+):\s*\d{4}-\d{2}-\d{2}/);
  const firstIsland = islandMatch ? islandMatch[1] : "";
  if (WEATHER_KEYWORDS.some((k) => lower.includes(k))) {
    const mentioned = lower.match(/\b(naxos|milos|koufonisia|santorini|mykonos|paros|antiparos|ios|tinos|syros|sifnos|amorgos|folegandros|serifos|kimolos|athene|glyfada)\b/);
    const loc = mentioned?.[1] || firstIsland || defaultIsland || "Naxos";
    return getWeather(loc);
  }
  return searchWeb(buildSearchQuery(message, context, defaultIsland));
}

function buildSearchQuery(message: string, context: string, defaultIsland = ""): string {
  const cleaned = message
    .replace(/^\/\w+\s*/i, "")
    .replace(/^athena[,\s]+/i, "")
    .trim();
  if (!cleaned) return "Griekenland Cycladen";
  const islandMatch = (context || "").match(/([A-Za-zÀ-ÿ'-]+):\s*\d{4}-\d{2}-\d{2}/);
  const firstIsland = islandMatch ? islandMatch[1] : "";
  const lower = cleaned.toLowerCase();
  const mentionsIsland = GREEK_ISLAND_NAMES.some((n) => lower.includes(n));
  if (!mentionsIsland && (firstIsland || defaultIsland)) return `${cleaned} ${firstIsland || defaultIsland}`;
  return cleaned;
}

// API: General Concierge Chat & Itinerary Auto-Parser
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, context, userName, attachment } = req.body;

    const userMsgList = messages || [];
    const lastUserMsg = userMsgList[userMsgList.length - 1]?.content || "";

    // Detect /tripupdate command: force the AI to return a structured tripUpdate
    const isTripUpdateCommand = lastUserMsg.trim().toLowerCase().startsWith("/tripupdate");
    const tripUpdateDetails = isTripUpdateCommand
      ? lastUserMsg.trim().substring("/tripupdate".length).trim()
      : "";

    const travelerName = typeof userName === "string" && userName.trim() ? userName.trim() : "Reiziger";

    const duckduckgoEnabled = getEnvVal("DUCKDUCKGO_ENABLED", "duckduckgo_enabled") !== "false";
    const needsLive = duckduckgoEnabled && !isTripUpdateCommand && !attachment && needsLiveSearch(lastUserMsg);
    let liveDataBlock = "";
    let fallbackSources: Source[] = [];

    // Build traveler context from Google Sheets so Athena knows where the traveler is staying
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let tripContextBlock = "";
    let currentIsland = "";
    if (!isTripUpdateCommand && isGoogleAuthConfigured()) {
      try {
        const { trip } = await loadTripFromSheet();
        const stays = (trip?.stays || []).sort((a: any, b: any) => (a.startDate || "").localeCompare(b.startDate || ""));
        if (stays.length > 0) {
          const current =
            stays.find((s: any) => todayStr >= s.startDate && todayStr <= s.endDate) ||
            stays.find((s: any) => s.startDate >= todayStr) ||
            stays[0];
          currentIsland = current?.island || "";
          const lines = [
            "REIZIGERCONTEXT (opgehaald uit jouw Google Sheets reisplanning — dit is de waarheid over waar de reiziger verblijft):",
            `- Huidig/volgend verblijf: ${current.island}${current.accommodationName ? ` (${current.accommodationName})` : ""}, ${formatDate(current.startDate)} t/m ${formatDate(current.endDate)}${current.nights ? `, ${current.nights} nachten` : ""}`,
            `- Volledige route: ${stays.map((s: any) => `${s.island} (${formatDate(s.startDate)}-${formatDate(s.endDate)})`).join(", ")}`,
            "- Gebruik dit verblijf als uitgangspunt bij aanbevelingen (restaurants, stranden, weer, activiteiten in de buurt).",
          ];
          tripContextBlock = lines.join("\n");
        }
      } catch (tripErr: any) {
        console.warn("Trip context load from sheet skipped:", tripErr?.message || tripErr);
      }
    }

    let systemPrompt = isTripUpdateCommand
      ? `You are Athena AI, an elite Mediterranean Travel Concierge specializing in the Greek Cyclades Islands.
You speak warmly, eloquently, and in fluent Dutch ("Kalimera", "Yassas", local tips on ferries, tavernas, hidden beaches).

CRITICAL SCRIPT RULE:
- NEVER output Greek script (Greek alphabet). Always transliterate Greek names, dishes and places into Latin characters (e.g. "O Thanasis" instead of "Ο Θανάσης", "To Stitiko" instead of "Το στιτικό", "gyros" instead of "γύρος").

CRITICAL USER IDENTIFICATION RULE:
- NEVER assume or invent a user name like "Alexandros".
- Address the user by their provided name, or use "Reiziger" (Traveler) / neutral greetings like "Kalimera!" if no name is given.
- Only use a specific name if it appears in the conversation history or context provided.
- Current traveler name: ${travelerName}

Current traveler context: ${context || "Cyclades Hopping"}.
Current traveler name: ${travelerName}.

The traveler has used the /tripupdate command. They are providing you with new travel information to update their itinerary.
You MUST parse the following details and ALWAYS return a JSON tripUpdate, even if the details are partial.
Extract as much information as possible: island name, hotel name, check-in date, check-out date, number of nights.
If a date is missing, make a reasonable estimate based on context.

Return ONLY this JSON format:
\`\`\`json
{
  "reply": "Bevestiging in warm Nederlands: wat je hebt toegevoegd of aangepast in het reisschema.",
  "tripUpdate": {
    "title": "Griekenland Cycladen Reis 2026",
    "startDate": "2026-08-10",
    "endDate": "2026-08-20",
    "stays": [
      {
        "island": "Naxos",
        "startDate": "2026-08-15",
        "endDate": "2026-08-18",
        "nights": 3,
        "accommodationName": "Nissaki Beach Hotel",
        "notes": "Toegevoegd via /tripupdate commando"
      }
    ]
  }
}
\`\`\`
IMPORTANT: The stays array must include ALL current stays from the context PLUS the new/updated stay.
Do NOT return plain text. Only return the JSON block above.`
      : `You are Athena AI, an elite Mediterranean Travel Concierge specializing in the Greek Cyclades Islands.
You speak warmly, eloquently, and in fluent Dutch ("Kalimera", "Yassas", local tips on ferries, tavernas, hidden beaches).

CRITICAL SCRIPT RULE:
- NEVER output Greek script (Greek alphabet). Always transliterate Greek names, dishes and places into Latin characters (e.g. "O Thanasis" instead of "Ο Θανάσης", "To Stitiko" instead of "Το στιτικό", "gyros" instead of "γύρος").

CRITICAL USER IDENTIFICATION RULE:
- NEVER assume or invent a user name like "Alexandros".
- Address the user by their provided name, or use "Reiziger" (Traveler) / neutral greetings like "Kalimera!" if no name is given.
- Only use a specific name if it appears in the conversation history or context provided.
- Current traveler name: ${travelerName}

CRITICAL RESEARCH RULES (use your live tools FIRST — never guess when you can look it up):
- When the traveler asks about restaurants, taverna's or food: ALWAYS call find_restaurants first. It works via OpenStreetMap and also covers cities like Athene/Glyfada. Recommend the real places it returns, including their cuisine and address.
- When the traveler asks about weather, events, ferries, sights or practical info: call the matching live tool (get_weather, search_web, get_city_tips) BEFORE answering.
- Never invent restaurant names, prices, opening hours, ratings or locations. Only list what the tool results actually contain.
- If find_restaurants (or any tool) returned concrete results, you MUST copy the found names (with cuisine and address) into your answer verbatim as a numbered list. NEVER say "geen restaurants gevonden" or "ik kon niets vinden" when the tool result contains places.
- Never claim you used Google Maps, TripAdvisor, Booking.com or any other source that is not actually present in the tool results.
- Do NOT narrate what you are about to do (e.g. "Ik zal een live zoekactie uitvoeren..."). Call the tool directly and immediately give the concrete answer.
- If a tool returns no useful results, say that honestly, then give general (non-fabricated) guidance and suggest online search.

Current traveler context: ${context || "Cyclades Hopping"}.
Current traveler name: ${travelerName}.

CRITICAL ITINERARY AUTOMATION INSTRUCTION:
If the user uploads a document/image/file or provides a text describing an itinerary, travel schedule, flight/ferry tickets, or hotel stays:
You MUST extract the travel details into a structured JSON object so the app can automatically update the trip!
Return JSON in this format:
\`\`\`json
{
  "reply": "Warm summary in Dutch explaining the trip adjustments found in the file/text.",
  "tripUpdate": {
    "title": "Griekenland Cycladen Reis 2026",
    "startDate": "2026-08-10",
    "endDate": "2026-08-20",
    "stays": [
      {
        "island": "Milos",
        "startDate": "2026-08-10",
        "endDate": "2026-08-13",
        "nights": 3,
        "accommodationName": "Milos Breeze Boutique",
        "notes": "Geïmporteerd via chat upload"
      }
    ]
  }
}
\`\`\`
If no travel schedule update is present, reply in standard conversational Dutch without JSON.

LIVE INFO TOOLS AVAILABLE (use them for any current/practical information):
- find_restaurants(location): concrete restaurants via OpenStreetMap (namen, keuken, adres, openingstijden). GEBRUIK DEZE VOOR ALLE RESTAURANT-/TAVERNA-/EETVRAGEN — werkt ook in steden als Athene/Glyfada.
- get_weather(location): live weersverwachting (vandaag + 5 dagen) via Open-Meteo.
- get_city_tips(city): reistips over een bestemming via Wikipedia & Wikivoyage.
- search_web(query): web search (DuckDuckGo, Wikipedia & Wikivoyage fallback) voor ferry's, evenementen, prijzen, openingstijden en algemene vragen (NIET voor restaurantlijsten).
Werkwijze: roep direct het juiste gereedschap aan en geef meteen het antwoord. Gebruik uitsluitend namen/feiten uit de tool-resultaten, verzin niets en claim geen bronnen die je niet echt gebruikt hebt. Citeer de bronnen.`;

    if (tripContextBlock) {
      systemPrompt += `\n\n${tripContextBlock}`;
    }

    if (liveDataBlock) {
      systemPrompt += `

LIVE DATA RETRIEVED (this is your source of truth for THIS answer):
${liveDataBlock}

RULES WHEN LIVE DATA IS PRESENT:
- You DO have real-time data now. Base your answer on it and cite the source URLs inline, e.g. "(bron: <url>)".
- Do NOT invent restaurants, prices, weather forecasts, events, or ferry times that are not present in the data.
- If the data does not fully answer the question, say so honestly and add general guidance from your own knowledge.
- Keep your warm Athena concierge tone and reply in fluent Dutch.`;
    }

    const userPromptText = userMsgList.map((m: any) => `${m.role === 'user' ? 'Traveler' : 'Athena'}: ${m.content}`).join('\n');

    // 1. Primary Engine: Groq tool-calling agent (live info tools)
    let agentRes: { content: string; model: string; sources: Source[]; rateLimited: boolean } | null = null;
    if (needsLive) {
      try {
        agentRes = await callGroqAgent(systemPrompt, userPromptText);
      } catch (agentErr) {
        console.warn("Groq agent failed, falling back:", agentErr);
      }
    }

    if (agentRes && agentRes.content) {
      const parsedJson = parseAIJsonBlock(agentRes.content);
      if (parsedJson && parsedJson.tripUpdate) {
        return res.json({
          reply: transliterateGreek(parsedJson.reply || "Kalimera! Je reisschema is bijgewerkt."),
          tripUpdate: parsedJson.tripUpdate,
          engine: `Groq (${agentRes.model})`,
          sources: agentRes.sources.length ? agentRes.sources : undefined
        });
      }
      return res.json({
        reply: transliterateGreek(agentRes.content),
        engine: `Groq (${agentRes.model})`,
        sources: agentRes.sources.length ? agentRes.sources : undefined
      });
    }

    // 1b. Fallback: live data probe (weather / DDG web search) when tool agent unavailable
    if (needsLive && !liveDataBlock) {
      try {
        const probe = await probeFallback(lastUserMsg, context || "", currentIsland);
        if (probe && probe.text && probe.text !== "Geen resultaten gevonden.") {
          liveDataBlock = probe.text;
          if (probe.sources) fallbackSources = probe.sources;
        }
      } catch (probeErr) {
        console.warn("Live data probe failed:", probeErr);
      }
    }

    // 2. Classic Groq call (skipped when the agent already hit a hard rate limit,
    //    so we hand over to Gemini earlier instead of burning more retries/time)
    const groqUserPrompt = isTripUpdateCommand
      ? `The traveler used /tripupdate with the following new booking details:\n${tripUpdateDetails}\n\nCurrent trip context: ${context}\n\nExtract and return the full updated stays array as JSON.`
      : `${userPromptText}${liveDataBlock ? `\n\n${liveDataBlock}` : ''}${
          attachment?.text ? `\n\n[Bijgevoegd Document Content (${attachment.name})]:\n${attachment.text}` : ''
        }${
          attachment?.name && !attachment?.text ? `\n\n[Bijgevoegd Bestand: ${attachment.name}]` : ''
        }`;

    if (!(agentRes && agentRes.rateLimited)) {
      const groqRes = await callGroqAI(systemPrompt, groqUserPrompt);
      if (groqRes && groqRes.content) {
        const parsedJson = parseAIJsonBlock(groqRes.content);
        if (parsedJson && parsedJson.tripUpdate) {
          return res.json({
            reply: transliterateGreek(parsedJson.reply || "Kalimera! Je reisschema is bijgewerkt door Groq AI."),
            tripUpdate: parsedJson.tripUpdate,
            engine: `Groq (${groqRes.model})`,
            sources: fallbackSources.length ? fallbackSources : undefined
          });
        }
        return res.json({
          reply: transliterateGreek(groqRes.content),
          engine: `Groq (${groqRes.model})`,
          sources: fallbackSources.length ? fallbackSources : undefined
        });
      }
    }

    // 2. Secondary Engine: Try Gemini AI safely (fallback when Groq is unavailable)
    try {
      const ai = getGeminiClient();
      if (ai) {
        // Beknopte, schone prompt voor Gemini: géén tool-instructies (die zijn
        // alleen bedoeld voor de Groq-agent), wel live-data erinline zodat het
        // een informatief antwoord kan geven.
        const geminiSystem =
          `Je bent Athena, een vriendkijke AI-reisgids voor Griekenland (met name de Cycladen). ` +
          `Beantwoord in vloeiend Nederlands, in een warme concierge-toon. ` +
          `Als er live-gegevens hieronder staan, gebruik die dan en citeer de bronnen. ` +
          `Verzin geen restaurants, prijzen of openingstijden die niet in de gegevens staan. ` +
          `Blijf beknopt en behulpzaam.`;

        const liveDataText = liveDataBlock ? `\n\nLIVE GEGEVENS (gebruik deze bij je antwoord):\n${liveDataBlock}` : "";
        const parts: any[] = [
          {
            text:
              `${geminiSystem}\n\n` +
              `Gespreksgeschiedenis:\n${userPromptText}` +
              `${liveDataText}\n\n` +
              `Antwoord:`,
          },
        ];

        if (attachment) {
          if (attachment.base64 && attachment.type?.startsWith("image/")) {
            const cleanBase64 = attachment.base64.replace(/^data:image\/\w+;base64,/, "");
            parts.push({
              inlineData: {
                data: cleanBase64,
                mimeType: attachment.type,
              },
            });
            parts.push({ text: `Bijgevoegd afbeeldingsbestand (${attachment.name}): lees de tekst/het reisplan op de afbeelding.` });
          } else if (attachment.text) {
            parts.push({ text: `Bijgevoegd document (${attachment.name}):\n${attachment.text}` });
          }
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [{ role: "user", parts }],
        });

        // Robuuste tekst-extractie: response.text kan leeg zijn als Gemini
        // bijnaam/thought-parts levert; val dan terug op candidates.
        let rawText = response.text || "";
        if (!rawText && response.candidates?.[0]?.content?.parts) {
          rawText = response.candidates[0].content.parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join("\n")
            .trim();
        }
        if (!rawText && (response as any).functionCalls?.length) {
          rawText = `(Gemini wilde een tool aanroepen maar die is hier niet beschikbaar.)`;
        }
        console.info(
          `Gemini fallback: textLen=${rawText.length} ` +
            `finishReason=${response.candidates?.[0]?.finishReason || "?"} ` +
            `thoughtsTokens=${response.usageMetadata?.thoughtsTokenCount || 0}`
        );

        const parsedJson = parseAIJsonBlock(rawText);
        if (parsedJson && parsedJson.tripUpdate) {
          return res.json({
            reply: transliterateGreek(parsedJson.reply || "Kalimera! Ik heb je reisplan verwerkt en je reisschema automatisch aangepast."),
            tripUpdate: parsedJson.tripUpdate,
            engine: "Gemini 3.6 Flash (Itinerary Parser)",
            sources: fallbackSources.length ? fallbackSources : undefined,
          });
        }

        return res.json({
          reply: transliterateGreek(rawText || "Yassou! Hoe kan ik je verder helpen met je reis?"),
          engine: "Gemini 3.6 Flash",
          sources: fallbackSources.length ? fallbackSources : undefined,
        });
      }
    } catch (geminiErr: any) {
      console.warn("Gemini AI error (falling back to local Athena Concierge):", geminiErr?.message || geminiErr);
    }

    let reply = "Kalimera! I'm Athena, your Greek Island Concierge. ";

    if (isTripUpdateCommand) {
      reply = `Kalimera! Ik heb je /tripupdate commando ontvangen maar kon de details niet volledig verwerken. Probeer het zo: /tripupdate Santorini, 17 sept - 21 sept, 4 nachten, Hotel Anastasis Apartments`;
    } else if (liveDataBlock) {
      reply = liveDataBlock;
    } else if (lastUserMsg.toLowerCase().includes("ferry")) {
      reply += "High-speed ferries (Seajets & Blue Star) meren dagelijks aan tussen Naxos, Milos, en Koufonisia. Ik raad aan 48 uur van tevoren te boeken.";
    } else {
      reply += "Typ /tripupdate gevolgd door je boekingsgegevens om je reisschema direct aan te passen! Bijv: /tripupdate Santorini, 17 sept - 21 sept, Hotel Caldera View";
    }

    res.json({ reply: transliterateGreek(reply), engine: "Greek Concierge Local Fallback", sources: fallbackSources.length ? fallbackSources : undefined });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.json({
      reply: transliterateGreek("Yassas! Je bestand/bericht is ontvangen. Ik help je graag met je reis!")
    });
  }
});

// API: Translate Greek Menu / Photo OCR
app.post("/api/translate-menu", async (req, res) => {
  try {
    const { imageBase64, textPrompt } = req.body;
    const ai = getGeminiClient();

    const prompt = textPrompt || "Translate and explain this Greek restaurant menu in detail for a traveler. List dishes, ingredients, dietary notes, and local drink recommendations. Never use Greek script; transliterate all Greek names into Latin characters.";

    if (!ai) {
      const groqRes = await callGroqAI(
        "You are Athena AI, a Greek taverna menu translator. Translate the given Greek menu text for a traveler, explain the dishes, and NEVER output Greek script: transliterate all Greek names into Latin characters (e.g. 'Moussaka', 'Souvlaki').",
        prompt
      );
      if (groqRes && groqRes.content) {
        return res.json({ translation: transliterateGreek(groqRes.content) });
      }

      const mm = await translateWithMyMemory(typeof textPrompt === "string" ? textPrompt : "");
      if (mm) {
        return res.json({ translation: transliterateGreek(`🇬 **Greek Menu Decoded**:\n\n${mm}`) });
      }

      return res.json({
        translation: "🇬🇷 **Greek Menu Decoded**:\n\n1. **Arni Kleftiko** — Slow-baked lamb with herbs, garlic & Naxian potatoes.\n2. **Naxian Graviera** — PDO aged local sheep's milk cheese, mild & nutty.\n3. **Chtapodi Psito** — Grilled octopus with oregano & lemon oil.\n4. **Tomatokeftedes** — Crispy Aegean tomato fritters with fresh mint.\n\n🍷 *Recommended pairing: Local Naxian white wine (Assyrtiko) or chilled Ouzo.*"
      });
    }

    let parts: any[] = [{ text: prompt }];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg"
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts }]
    });

    res.json({ translation: transliterateGreek(response.text || "") });
  } catch (err) {
    res.json({
      translation: "🇬 **Menu Decoded**:\n- **Moussaka**: Eggplant, minced beef & creamy bechamel.\n- **Kleftiko**: Slow-baked tender lamb with local herbs.\n- **Dakos**: Barley rusk with ripe tomatoes, feta & olives."
    });
  }
});

// API: AI Hotel Search & Suggestions
app.post("/api/suggest-hotels", async (req, res) => {
  try {
    const { island, style } = req.body;
    const ai = getGeminiClient();

    const curIsland = island || "Naxos";

    if (!ai) {
      const defaultSuggestions: Record<string, any[]> = {
        "Milos": [
          {
            id: "milos-1",
            name: "Milos Breeze Boutique Hotel",
            location: "Pollonia, Milos",
            island: "Milos",
            rating: 9.6,
            ratingLabel: "Buitengewoon",
            reviewsCount: 420,
            pricePerNight: 195,
            tag: "AI Suggestie • Infinity Pool",
            amenities: ["Infinity Pool", "Panoramisch Zeezicht", "Ontbijt inbegrepen", "Cocktailbar"],
            distanceToBeach: "100m van Pollonia baai",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAOZr5gGB1weJa8rMWnTL0uY6A01WC5nthIOndYdcCtpttUQLwLh5AakhZXjrKuZAd-FlZxvC9U4iOG6J1e4uXAU0Oor1utW2UD2XdtLlyTYdPEvvsyc5BoKJauF55-AlZneX0ckYM1_LET_RPpwUyIa5WmgE0C6LF_12sbGkfLudDNSzsfAwn0fDiT4AYFxNTCRK6DUsyqEuIZGC4SIRD3jSYmMlEkbJkF-osO32NfbUjKSaFLZfFLeA"
          },
          {
            id: "milos-2",
            name: "White Coast Pool Suites",
            location: "Mytakas Beach, Milos",
            island: "Milos",
            rating: 9.4,
            ratingLabel: "Uitstekend",
            reviewsCount: 188,
            pricePerNight: 280,
            tag: "Privé Zwembad • Adult Only",
            amenities: ["Privé Plunge Pool", "Klimaatbeheersing", "Luxe Spa", "Sunset View"],
            distanceToBeach: "Direct aan de Kust",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAyhUXPPtvq8bz7gDp3yHkjbE2nRwSRYNsxxAThh5mnuZMtf8gSAisxi0LSA6sMuQ3-6c0Ly0gTldOEBIuck1WYLu9XYwPYxB1ZygQnG1LF29tdlUoqWl1o74iv7PDayCoNP2Lea4Hy3lDYilB1xof9BX2FcAUN-lNLPdjJeB4Wrx6NhCyo4Q9aGkVVHcCxQWj6UR1iRjSJ51rJe2VRjjJ8jwygei0v_UOmhcPrE29vNRDy7m3MR5udzw"
          },
          {
            id: "milos-3",
            name: "Artemis Seaside Resort",
            location: "Paliochori Beach, Milos",
            island: "Milos",
            rating: 9.1,
            ratingLabel: "Geweldig",
            reviewsCount: 310,
            pricePerNight: 140,
            tag: "Strandresort • Populair",
            amenities: ["Strandbedden gratis", "Beach Club", "Gratis Wifi", "Parkeergelegenheid"],
            distanceToBeach: "Direct aan het zandstrand",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBO2PXtkrNV1rQmK7bALaUm6APlIKnswhv2eg7XwGwJiQOEDev_6SQoHR1-oseY1Xq_qrDFULn21JCwnC8D9KI8MYN4uqNjevH9XLAu8QSoR01f-VeSHkQlyiQKBRJ8YnC3NGXII49v6sl1bnrlM0HzxqCsUuV5S49XzvRvxHJ2YB1VU3vNJXIS6ReANKM0GAYPEHwYIlFb6OteFNGnyWVzl5oJF6-RDYQynXeWGrGlJ-luu2qxVItFPA"
          }
        ],
        "Naxos": [
          {
            id: "naxos-1",
            name: "Nissaki Beach Hotel",
            location: "Agios Georgios Beach, Naxos Chora",
            island: "Naxos",
            rating: 9.5,
            ratingLabel: "Buitengewoon",
            reviewsCount: 512,
            pricePerNight: 165,
            tag: "Top Suggestie • Aan het Strand",
            amenities: ["Zwembad", "Gastronomisch Ontbijt", "Loopafstand van Chora Centrum", "Balkon met zeezicht"],
            distanceToBeach: "20m van het strand",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDaynCJsoW5hGEsjYxWiFiFTUq6FF_3wMiDJNfr8XJm_ZEteWs-Jb_pTH6oM9AxjXq1zc3uXUjcVDUil0BNaduxay62Z9Tfh2AX-yMVxdswtqGXu36U8shML7hCVe41PKcnK_SFbXPo4HkNeiZWgNFjbmLUe0Oc18nCWdBs2gwLlg7aUt1GZS_k9EMeaPGXH3zLRsDUtUPYj1MmOA-4H43cNk2KjAE70iRYUTadS1eYCfvZA84H2G7uMQ"
          },
          {
            id: "naxos-2",
            name: "Naxos Island Hotel & Spa",
            location: "Agios Prokopios, Naxos",
            island: "Naxos",
            rating: 9.3,
            ratingLabel: "Uitstekend",
            reviewsCount: 295,
            pricePerNight: 185,
            tag: "Rooftop Pool • Luxe Spa",
            amenities: ["Rooftop Infinity Pool", "Spa & Wellness", "Restaurant", "Gratis Shuttle"],
            distanceToBeach: "100m van Agios Prokopios",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHfBiyPTGMH6A0nprYOehSC76_PtO8RRUX4vI4Ieh_1j8l_CgiD8Zll_7okT16X08G3LcGVGV0YktEzwE0-c1yefk6fQUcyZWVoLKlNR1M1aRbg-ihQ6XBcS6rjALkkbFQLjZaxZS52V_EcHxf5Z_qxsEtDUs_Qf0uWRRh2nIEyGswCTugHHE3vUXLuk6icIsv0FXwVCq0FMz0WolXA0MmDPZESRLq4RdUQCUaXC0TH9EM-U6O83iIUQ"
          },
          {
            id: "naxos-3",
            name: "Portara Seaside Luxury Suites",
            location: "Naxos Chora Port",
            island: "Naxos",
            rating: 9.2,
            ratingLabel: "Geweldig",
            reviewsCount: 174,
            pricePerNight: 150,
            tag: "Zonsondergang Uitzicht",
            amenities: ["Portara Uitzicht", "Design Suites", "Kitchenette", "Gratis Koffie & Wijn"],
            distanceToBeach: "300m van de Hawen",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBGnyljvgfgiAVVRcJsYIcvifjq5T0nmamAn0qRt33WTfpzv5ju6GPyGWy0ZmBTYxxpJFoU8dv-_FrnICwIfpG_kIkMzQur1PJ3ZygJG2zIUlVNPLicldpkmEvo4WRFwKlN824h5GES-iLH0AlTHAWdMR8MhufUpaTa76Lnih1OmcVhpNzHzauFFr9gbsru5EdfkK1NqfbwiOws7DKzynf8g1305DY74ER2oW2VC_QWrzQaM9SBEPeFfA"
          }
        ],
        "Koufonisia": [
          {
            id: "kouf-1",
            name: "Koufonisia Hotel & Beach Suites",
            location: "Chora, Koufonisia",
            island: "Koufonisia",
            rating: 9.7,
            ratingLabel: "Buitengewoon",
            reviewsCount: 230,
            pricePerNight: 175,
            tag: "Top Suggestie • Cycladisch Design",
            amenities: ["Zwembad", "Biologisch Ontbijt", "Gratis Fietsverhuur", "Rustige Tuin"],
            distanceToBeach: "150m van de Hawen & Ammos Strand",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCX9IVh2F1IBAIsKj7jOD861n8sugmHDcElOR3VKlyaBLHMKRkHMtcpApETSM6CS45kARGz9dXLjdJ9suE50sTHDIcVcCsQ2OywJv15Y137fWCYEo0JeGArizL5wilGyNJwmhe_yeOqm83XRgO7IW5wVs7eZ-sVqkfzO80SLcYrpQ6s3L0oMOF9-E1zN3kSTh-PqREp5WC6d8OTrD6rtJ3XTS18aOgZzWGxiCipBwErygHLPtoKWvEl3w"
          },
          {
            id: "kouf-2",
            name: "Pori Sunset Villas",
            location: "Pori Bay, Koufonisia",
            island: "Koufonisia",
            rating: 9.5,
            ratingLabel: "Uitstekend",
            reviewsCount: 145,
            pricePerNight: 210,
            tag: "Verborgen Parel • Turquoise Baai",
            amenities: ["Panoramisch Terras", "Directe Strandtoegang", "Keukenette", "Airco"],
            distanceToBeach: "Direct aan Pori Beach",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA3FFMdo8xBV7-uf2HAOHtIioK0k8dyWwal_M7sOkja-Fjnc3rZKSxLJstWux3EghAakbbyrObm3LJ26sIPxtWfqCdPp26M_anuaoJaoxbE9Xa5UcbpZxZrrNX6DONr4D0DYoIL2eYsx4viIB68nhqpWrBo2IV-0Y3FledGzfxNPxJyo8frMATv4TCsVRk1ZZiGUiKXyO4DbMvCK9d12fIRwdwoaKcJqmEYX5qAs5LL0yIn5JBxNTGAEg"
          }
        ]
      };

      const results = defaultSuggestions[curIsland] || defaultSuggestions["Naxos"];
      return res.json({ hotels: results });
    }

    const prompt = `Act as an AI hotel search engine for the Greek island of ${curIsland} (style preference: ${style || "all"}). 
Generate 3 realistic, highly-rated boutique hotels or resorts on ${curIsland}. 
Return valid JSON array of objects with keys: id, name, location, island, rating (number like 9.4), ratingLabel (e.g. "Buitengewoon" or "Uitstekend"), reviewsCount (number), pricePerNight (number in EUR), tag (e.g. "AI Suggestie • Zeezicht"), amenities (array of string in Dutch), distanceToBeach (string in Dutch).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    try {
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "[]");
      const enriched = parsed.map((h: any, i: number) => ({
        ...h,
        image: h.image || [
          "https://lh3.googleusercontent.com/aida-public/AB6AXuDaynCJsoW5hGEsjYxWiFiFTUq6FF_3wMiDJNfr8XJm_ZEteWs-Jb_pTH6oM9AxjXq1zc3uXUjcVDUil0BNaduxay62Z9Tfh2AX-yMVxdswtqGXu36U8shML7hCVe41PKcnK_SFbXPo4HkNeiZWgNFjbmLUe0Oc18nCWdBs2gwLlg7aUt1GZS_k9EMeaPGXH3zLRsDUtUPYj1MmOA-4H43cNk2KjAE70iRYUTadS1eYCfvZA84H2G7uMQ",
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAOZr5gGB1weJa8rMWnTL0uY6A01WC5nthIOndYdcCtpttUQLwLh5AakhZXjrKuZAd-FlZxvC9U4iOG6J1e4uXAU0Oor1utW2UD2XdtLlyTYdPEvvsyc5BoKJauF55-AlZneX0ckYM1_LET_RPpwUyIa5WmgE0C6LF_12sbGkfLudDNSzsfAwn0fDiT4AYFxNTCRK6DUsyqEuIZGC4SIRD3jSYmMlEkbJkF-osO32NfbUjKSaFLZfFLeA",
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCX9IVh2F1IBAIsKj7jOD861n8sugmHDcElOR3VKlyaBLHMKRkHMtcpApETSM6CS45kARGz9dXLjdJ9suE50sTHDIcVcCsQ2OywJv15Y137fWCYEo0JeGArizL5wilGyNJwmhe_yeOqm83XRgO7IW5wVs7eZ-sVqkfzO80SLcYrpQ6s3L0oMOF9-E1zN3kSTh-PqREp5WC6d8OTrD6rtJ3XTS18aOgZzWGxiCipBwErygHLPtoKWvEl3w"
        ][i % 3]
      }));
      return res.json({ hotels: enriched });
    } catch {
      return res.json({
        hotels: [
          {
            id: `${curIsland}-1`,
            name: `${curIsland} Aegean Luxury Resort`,
            location: `${curIsland} Coast`,
            island: curIsland,
            rating: 9.5,
            ratingLabel: "Buitengewoon",
            reviewsCount: 280,
            pricePerNight: 175,
            tag: "AI Suggestie • Zeezicht",
            amenities: ["Zwembad", "Ontbijt inbegrepen", "Zeezicht", "Gratis Wifi"],
            distanceToBeach: "50m van het strand",
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDaynCJsoW5hGEsjYxWiFiFTUq6FF_3wMiDJNfr8XJm_ZEteWs-Jb_pTH6oM9AxjXq1zc3uXUjcVDUil0BNaduxay62Z9Tfh2AX-yMVxdswtqGXu36U8shML7hCVe41PKcnK_SFbXPo4HkNeiZWgNFjbmLUe0Oc18nCWdBs2gwLlg7aUt1GZS_k9EMeaPGXH3zLRsDUtUPYj1MmOA-4H43cNk2KjAE70iRYUTadS1eYCfvZA84H2G7uMQ"
          }
        ]
      });
    }
  } catch (err) {
    res.json({ hotels: [] });
  }
});

// API: Resolve Missed Ferry Emergency Assistant
app.post("/api/resolve-ferry", async (req, res) => {
  try {
    const { currentPort, destination, time } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        resolution: {
          status: "Found Alternatives",
          options: [
            {
              type: "Hydrofoil",
              operator: "Seajets WorldChampion Jet",
              departure: "14:15",
              arrival: "15:00",
              price: "€42.50",
              notes: "Fastest option. 12 seats remaining."
            },
            {
              type: "Passenger Ferry",
              operator: "Blue Star Delos",
              departure: "17:30",
              arrival: "18:45",
              price: "€28.00",
              notes: "Spacious deck, reliable in Meltemi winds."
            }
          ],
          recommendedHotel: "Porto Naxos Hotel (5 min walk from port)",
          advice: "Head to Port Gate 3 ticket office or book via the app. Your hotel in Naxos has been notified of your updated arrival time."
        }
      });
    }

    const prompt = `A traveler in ${currentPort || "Milos"} missed their ferry to ${destination || "Naxos"}. 
Generate emergency assistance options including next available hydrofoils/ferries, estimated times, ticket office guidance, and temporary port hotel recommendation. Format response as JSON with fields: status, options (array of {type, operator, departure, arrival, price, notes}), recommendedHotel, advice.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    try {
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{}");
      return res.json({ resolution: parsed });
    } catch {
      return res.json({
        resolution: {
          status: "Found Alternatives",
          options: [
            { type: "Hydrofoil", operator: "Seajets Champion Jet 2", departure: "14:15", arrival: "15:05", price: "€42.50", notes: "12 seats remaining" },
            { type: "Ferry", operator: "Blue Star Naxos", departure: "17:30", arrival: "18:45", price: "€28.00", notes: "Comfortable lounge" }
          ],
          recommendedHotel: "Porto Naxos Suites",
          advice: "You can rebook instantly or Athena can hold seats for 30 minutes."
        }
      });
    }
  } catch (error) {
    res.json({
      resolution: {
        status: "Alternatives Available",
        options: [
          { type: "Express Catamaran", operator: "Seajets", departure: "14:15", arrival: "15:05", price: "€42.50", notes: "Direct service" }
        ],
        recommendedHotel: "Naxos Beach Hotel",
        advice: "Contact Athena Concierge to confirm booking."
      }
    });
  }
});

// Global Error Handler for Vercel / Express to prevent unhandled 500 crashes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error on Vercel:", err);
  if (!res.headersSent) {
    res.status(200).json({
      success: false,
      error: err?.message || "Er is een onverwachte serverfout opgetreden op Vercel."
    });
  }
});

// Vite / Static production serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
