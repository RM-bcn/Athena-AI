import { searchDuckDuckGo } from "./duckduckgo-search.js";

export interface ToolResult {
  text: string;
  sources?: { title: string; url: string }[];
}

export interface Source {
  title: string;
  url: string;
}

const TIMEOUT_MS = 9000;
const UA =
  "AthenaAIConcierge/1.0 (Mediterranean travel assistant; contact: local app)";

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

// ---------------------------------------------------------------------------
// WMO weather codes → Dutch descriptions
// ---------------------------------------------------------------------------
function describeWeatherCode(code: number): string {
  const map: Record<number, string> = {
    0: "Helder",
    1: "Overwegend helder",
    2: "Half bewolkt",
    3: "Bewolkt",
    45: "Mist",
    48: "Rijpmist",
    51: "Lichte motregen",
    53: "Motregen",
    55: "Dichte motregen",
    61: "Lichte regen",
    63: "Regen",
    65: "Hevige regen",
    71: "Lichte sneeuwval",
    73: "Sneeuwval",
    75: "Hevige sneeuwval",
    80: "Lichte buien",
    81: "Regenbuien",
    82: "Hevige buien",
    95: "Onweer",
    96: "Onweer met hagel",
    99: "Zwaar onweer met hagel",
  };
  return map[code] || `Code ${code}`;
}

// ---------------------------------------------------------------------------
// Tool 1: get_weather — Open-Meteo (free, no key)
// ---------------------------------------------------------------------------
export async function getWeather(location: string): Promise<ToolResult> {
  const loc = location?.trim();
  if (!loc) return { text: "Geen locatie opgegeven." };

  const geo = await fetchWithTimeout(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=nl&format=json`
  );
  if (!geo.ok) return { text: "Weer niet beschikbaar (geocoding mislukt)." };
  const geoData = await geo.json();
  const place = geoData?.results?.[0];
  if (!place) return { text: `Geen plaats gevonden voor "${loc}".` };

  const forecast = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,sunrise,sunset&timezone=auto&forecast_days=5`
  );
  if (!forecast.ok) return { text: "Weer niet beschikbaar (forecast mislukt)." };
  const f = await forecast.json();
  const cur = f?.current || {};
  const daily = f?.daily || {};

  const lines: string[] = [];
  const desc = describeWeatherCode(cur.weather_code);
  lines.push(`Weer in ${place.name}, ${place.country || ""} (nu):`);
  lines.push(`- ${desc}, ${cur.temperature_2m ?? "?"}°C (gevoel ${cur.apparent_temperature ?? "?"}°C)`);
  lines.push(`- Wind: ${cur.wind_speed_10m ?? "?"} km/u, Vochtigheid: ${cur.relative_humidity_2m ?? "?"}%`);
  lines.push(`- Neerslag nu: ${cur.precipitation ?? 0} mm`);

  const days = (daily.time || []).map((_: unknown, i: number) => ({
    day: daily.time[i],
    max: daily.temperature_2m_max?.[i],
    min: daily.temperature_2m_min?.[i],
    code: daily.weather_code?.[i],
    precip: daily.precipitation_sum?.[i],
    sunrise: daily.sunrise?.[i],
    sunset: daily.sunset?.[i],
  }));
  if (days.length > 0) {
    lines.push(`\nVerwachting (${days.length} dagen):`);
    days.forEach((d: { day?: string; max?: number; min?: number; code?: number; precip?: number; sunrise?: string; sunset?: string }) => {
      const date = (d.day || "").slice(5).replace("-", "/");
      lines.push(
        `- ${date}: ${describeWeatherCode(d.code || 0)}, ${d.min ?? "?"}°C tot ${d.max ?? "?"}°C, neerslag ${d.precip ?? 0} mm`
      );
    });
    if (days[0]?.sunrise) {
      lines.push(`- Vandaag: zonsopgang ${(days[0].sunrise || "").slice(11, 16)}, zonsondergang ${(days[0].sunset || "").slice(11, 16)}`);
    }
  }

  return {
    text: lines.join("\n"),
    sources: [{ title: `Open-Meteo weersverwachting ${place.name}`, url: `https://open-meteo.com/en/docs#latitude=${place.latitude}&longitude=${place.longitude}` }],
  };
}

// ---------------------------------------------------------------------------
// Tool 2: search_web — DuckDuckGo primary, Wikipedia/Wikivoyage fallback
// ---------------------------------------------------------------------------
function cleanFallbackQuery(query: string): string {
  const cleaned = query
    .toLowerCase()
    .replace(
      /\b(wat|welke|welk|hoe|waar|wanneer|wie|is|er|een|de|het|van|in|op|naar|met|voor|over|zijn|kan|kunnen|ik|je|jij|jouw|geef|moet|moeten|mijn|die|dat|aan|als|of|en|niet|graag|goede|beste|leuke|echt|even|geven|zijn er|restaurants?|tavernas?|keukens?|gerechten|menu|prijzen|openingstijden|hotels?|bezienswaardigheden|reistips|tips|excursies|ferries?|veerboot|varen|evenementen|activiteiten|suggesties|aanraders?|stad|stadjes|plaats)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || query;
}

async function wikipediaSearch(query: string, site: "wikipedia" | "wikivoyage"): Promise<ToolResult> {
  const host = site === "wikivoyage" ? "nl.wikivoyage.org" : "nl.wikipedia.org";
  const searchUrl = `https://${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5`;
  const res = await fetchWithTimeout(searchUrl, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return { text: "", sources: [] };
  const data = await res.json();
  const hits = data?.query?.search || [];
  const results: string[] = [];
  const sources: Source[] = [];

  for (const hit of hits.slice(0, 4)) {
    const title = hit.title;
    const pageUrl = `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    results.push(`- ${title}: ${truncate(hit.snippet.replace(/<[^>]+>/g, ""), 220)}`);
    sources.push({ title, url: pageUrl });
  }

  return {
    text: results.length ? `${site === "wikivoyage" ? "Wikivoyage" : "Wikipedia"}-resultaten:\n${results.join("\n")}` : "",
    sources,
  };
}

export async function searchWeb(query: string): Promise<ToolResult> {
  const q = query?.trim();
  if (!q) return { text: "Geen zoekopdracht." };

  let ddg = null;
  try {
    ddg = await searchDuckDuckGo(q);
  } catch {
    ddg = null;
  }

  const sources: Source[] = [];
  const lines: string[] = [];

  if (ddg && ddg.results.length > 0) {
    ddg.results.slice(0, 6).forEach((r, i) => {
      lines.push(`${i + 1}. ${r.title}`);
      lines.push(`   ${r.url}`);
      if (r.snippet) lines.push(`   ${truncate(r.snippet, 250)}`);
    });
    sources.push(
      ...ddg.results.slice(0, 6).map((r) => ({ title: r.title || r.url, url: r.url }))
    );
    return { text: lines.join("\n"), sources };
  }

  // Silent fallback: Wikipedia + Wikivoyage
  const cleanQ = cleanFallbackQuery(q);
  const wiki = await wikipediaSearch(cleanQ, "wikipedia");
  const voy = await wikipediaSearch(cleanQ, "wikivoyage");
  sources.push(...(wiki.sources || []), ...(voy.sources || []));
  const parts = [wiki.text, voy.text].filter(Boolean);
  if (parts.length === 0) {
    return { text: "Geen live zoekresultaten gevonden.", sources };
  }
  return { text: parts.join("\n\n"), sources };
}

// ---------------------------------------------------------------------------
// Tool 3: find_restaurants — Nominatim geocoding + Overpass (OpenStreetMap)
// ---------------------------------------------------------------------------
export async function findRestaurants(location: string, radius: number = 5000): Promise<ToolResult> {
  const loc = location?.trim();
  if (!loc) return { text: "Geen locatie opgegeven." };

  // Try several query variants so "Glyfada, Athene" also resolves (Nominatim needs "Glyfada, Griekenland")
  const variants = [loc];
  if (!/griekenland|greece|ellada|ελλαδα/i.test(loc)) {
    variants.push(`${loc}, Griekenland`, `${loc}, Greece`);
  }
  const firstToken = loc.split(",")[0].trim();
  if (firstToken && firstToken !== loc) variants.push(firstToken);

  let place: any = null;
  for (const v of variants) {
    const geo = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(v)}`,
      { headers: { "User-Agent": UA } }
    );
    if (!geo.ok) continue;
    const ps = await geo.json();
    if (ps?.[0]) {
      place = ps[0];
      break;
    }
  }
  if (!place) return { text: `Locatie "${loc}" niet gevonden op OpenStreetMap.` };

  const lat = Number(place.lat);
  const lon = Number(place.lon);
  const r = Math.min(Math.max(Number(radius) || 5000, 500), 15000);

  const query = `[out:json][timeout:15];(node["amenity"="restaurant"](around:${r},${lat},${lon});way["amenity"="restaurant"](around:${r},${lat},${lon}););out center 14;`;
  const overpass = await fetchWithTimeout("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!overpass.ok) return { text: "Restaurants niet beschikbaar (Overpass mislukt)." };

  const odata = await overpass.json();
  const elements = odata?.elements || [];
  const withName = elements
    .map((el: any) => ({
      name: el.tags?.name || "(naamloos restaurant)",
      cuisine: el.tags?.cuisine || "",
      street: el.tags?.["addr:street"] || el.tags?.["addr:city"] || "",
      hours: el.tags?.opening_hours || "",
      phone: el.tags?.phone || "",
      website: el.tags?.website || "",
    }))
    .filter((e: any) => e.name !== "(naamloos restaurant)");

  if (withName.length === 0) return { text: `Geen restaurants gevonden rond "${loc}".` };

  const lines: string[] = [`Restaurants in de buurt van ${place.display_name?.split(",")[0] || loc}:`];
  withName.slice(0, 10).forEach((e: any, i: number) => {
    const bits = [e.name];
    if (e.cuisine) bits.push(`keuken: ${e.cuisine}`);
    if (e.street) bits.push(e.street);
    if (e.hours) bits.push(`open: ${e.hours}`);
    lines.push(`${i + 1}. ${bits.join(" · ")}`);
  });

  return {
    text: lines.join("\n"),
    sources: [
      { title: `OpenStreetMap restaurants rond ${place.display_name?.split(",")[0] || loc}`, url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}` },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tool 4: get_city_tips — Wikipedia summary + Wikivoyage guide extract
// ---------------------------------------------------------------------------
export async function getCityTips(city: string): Promise<ToolResult> {
  const c = city?.trim();
  if (!c) return { text: "Geen stad/eiland opgegeven." };

  const sources: Source[] = [];
  const parts: string[] = [];

  const candidates = [c, `${c} (eiland)`, `${c} (island)`];
  const base = c.toLowerCase();

  const isBadPage = (page: any): boolean => {
    if (!page?.extract || page.missing) return true;
    if (page.pageprops?.disambiguation) return true;
    if (!String(page.title).toLowerCase().includes(base)) return true;
    const head = String(page.extract).slice(0, 120);
    if (/(kan|kunnen) verwijzen naar|verwijzing naar|is een naam voor/i.test(head)) return true;
    return false;
  };

  // Wikipedia intro (skip disambiguations / wrong redirects)
  for (const title of candidates) {
    try {
      const wiki = await fetchWithTimeout(
        `https://nl.wikipedia.org/w/api.php?action=query&prop=extracts|pageprops&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json`,
        { headers: { "User-Agent": UA, Accept: "application/json" } }
      );
      if (!wiki.ok) continue;
      const wd = await wiki.json();
      const page = Object.values(wd?.query?.pages || {})[0] as any;
      if (isBadPage(page)) continue;
      parts.push(`Wikipedia over ${page.title}: ${truncate(page.extract, 900)}`);
      sources.push({ title: `Wikipedia: ${page.title}`, url: `https://nl.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}` });
      break;
    } catch {
      // ignore
    }
  }

  // Wikivoyage guide (plain text, capped) — skip wrong redirects
  for (const title of candidates) {
    try {
      const voy = await fetchWithTimeout(
        `https://nl.wikivoyage.org/w/api.php?action=query&prop=extracts|pageprops&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json`,
        { headers: { "User-Agent": UA, Accept: "application/json" } }
      );
      if (!voy.ok) continue;
      const vd = await voy.json();
      const page = Object.values(vd?.query?.pages || {})[0] as any;
      if (isBadPage(page)) continue;
      const extract = page.extract;
      // Prefer the restaurant/eat/drink section if present
      const eatMarker = extract.search(/(Eten|Restaurants|Eetgelegenheden)/i);
      const start = eatMarker >= 0 ? Math.max(0, eatMarker - 100) : 0;
      const tip = truncate(extract.slice(start), 4000);
      parts.push(`Reisgids (Wikivoyage) ${page.title}: ${tip}`);
      sources.push({ title: `Wikivoyage: ${page.title}`, url: `https://nl.wikivoyage.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}` });
      break;
    } catch {
      // ignore
    }
  }

  if (parts.length === 0) return { text: `Geen reistips gevonden voor "${c}".`, sources };
  return { text: parts.join("\n\n"), sources };
}
