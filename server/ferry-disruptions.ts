// Blue Star Ferries "Itineraries Modifications" scraper.
// No API key required: Blue Star publishes current modifications as regular
// HTML pages (e.g. weather-related cancellations per vessel) which we fetch,
// parse and match against the user's booked vessel.
//
// STATUS: ready to wire up, but intentionally NOT imported from server.ts yet
// because another agent has uncommitted changes in server.ts. To activate,
// add two lines to server.ts:
//
//   import { handleFerryDisruptions } from "./server/ferry-disruptions.js";
//   ...
//   app.get("/api/ferry/disruptions", handleFerryDisruptions);
//
// (Place the route before the Vite/static middleware near the other /api routes.)

import type { Request, Response } from "express";

const HOME_URL = "https://www.bluestarferries.com/en-gb";
const NEWS_URL = "https://www.bluestarferries.com/en-gb/news";
const INFO_LINK_PATTERN = /\/en-gb\/informations\/[\w-]+\/[\w-]+/g;
const CACHE_TTL_MS = 30 * 60 * 1000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface DisruptionMatch {
  title: string;
  url: string;
  lastUpdate?: string;
  excerpt: string;
}

interface CachedNotices {
  at: number;
  matches: DisruptionMatch[];
}

let cache: CachedNotices | null = null;

function normalizeVesselName(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchText(url: string, timeoutMs = 10_000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return text.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function findInfoLinks(html: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(INFO_LINK_PATTERN)) {
    links.add("https://www.bluestarferries.com" + match[0]);
  }
  return [...links].slice(0, 3);
}

function extractArticle(url: string, html: string): DisruptionMatch | null {
  const text = stripHtml(html);

  const titleMatch = text.match(/^([^\n]{5,120})\n/im);
  const title = titleMatch ? titleMatch[1].trim() : "Itineraries Modification";

  const updateMatch = text.match(/Last Update:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})\s*[-–]\s*([0-9]{2}:[0-9]{2})/i);
  const lastUpdate = updateMatch ? `${updateMatch[1]} ${updateMatch[2]}` : undefined;

  return { title, url, lastUpdate, excerpt: text.slice(0, 400) };
}

async function fetchCurrentNotices(): Promise<DisruptionMatch[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.matches;
  }

  let links: string[] = [];
  try {
    const home = await fetchText(HOME_URL);
    links = findInfoLinks(home);
  } catch (err) {
    console.warn("[ferry-disruptions] home fetch failed:", (err as Error)?.message || err);
  }

  if (links.length === 0) {
    try {
      const news = await fetchText(NEWS_URL);
      links = findInfoLinks(news);
    } catch (err) {
      console.warn("[ferry-disruptions] news fetch failed:", (err as Error)?.message || err);
    }
  }

  const notices: DisruptionMatch[] = [];
  for (const url of links) {
    try {
      const html = await fetchText(url);
      const article = extractArticle(url, html);
      if (article) notices.push(article);
    } catch (err) {
      console.warn(`[ferry-disruptions] article ${url} failed:`, (err as Error)?.message || err);
    }
  }

  cache = { at: Date.now(), matches: notices };
  return notices;
}

/** Match active notices against a vessel name (e.g. "Blue Star Delos"). */
function matchNotices(notices: DisruptionMatch[], vessel: string): DisruptionMatch[] {
  const normalized = normalizeVesselName(vessel);
  if (!normalized) return [];

  const tokens = normalized.split(" ");
  const results: DisruptionMatch[] = [];
  for (const notice of notices) {
    const haystack = normalizeVesselName(`${notice.title} ${notice.excerpt}`);
    // Require the full normalized name ("blue star delos") or a distinctive
    // token ("delos" with length >= 4) to be present.
    const hit = haystack.includes(normalized) || tokens.some((t) => t.length >= 4 && haystack.includes(t));
    if (hit) results.push(notice);
  }
  return results;
}

export async function handleFerryDisruptions(req: Request, res: Response): Promise<void> {
  const vessel = typeof req.query.vessel === "string" ? req.query.vessel.trim() : "";
  try {
    const notices = await fetchCurrentNotices();
    const matches = vessel ? matchNotices(notices, vessel) : notices;
    res.json({
      vessel,
      checkedAt: new Date().toISOString(),
      source: HOME_URL,
      matches: matches.slice(0, 3),
    });
  } catch (err) {
    console.error("[ferry-disruptions] error:", (err as Error)?.message || err);
    res.json({
      vessel,
      checkedAt: new Date().toISOString(),
      source: HOME_URL,
      matches: [],
      error: (err as Error)?.message || "Kon de Blue Star mededelingen niet ophalen.",
    });
  }
}
