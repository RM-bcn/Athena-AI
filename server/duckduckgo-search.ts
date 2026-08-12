export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  abstract?: string;
  abstractUrl?: string;
  results: SearchResult[];
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 AthenaAIConcierge/1.0";

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "...")
    .replace(/&#x27;/g, "'");
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function resolveDdgHref(href: string): string {
  const uddg = href.match(/[?&]uddg=([^&]+)/);
  if (uddg) {
    try {
      return decodeURIComponent(uddg[1]);
    } catch {
      // fall through to raw href
    }
  }
  if (href.startsWith("//")) return `https:${href}`;
  return href;
}

const SEARCH_STOPWORDS = new Set([
  "wat", "is", "zijn", "een", "de", "het", "voor", "op", "in", "aan", "en", "of",
  "met", "te", "van", "die", "dat", "er", "waar", "hoe", "wanneer", "welke",
  "kan", "ik", "je", "jij", "mij", "me", "mijn", "graag", "even", "maar", "dat", "aanraden",
]);

function cleanSearchQuery(raw: string): string {
  const tokens = raw
    .replace(/[?!.]+/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const kept = tokens.filter((t) => !SEARCH_STOPWORDS.has(t.toLowerCase()) && t.length > 1);
  return kept.join(" ") || raw.trim();
}

// Official DuckDuckGo Instant Answer API (no key required, returns clean JSON)
async function fetchInstantAnswer(query: string): Promise<SearchResponse | null> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;

  const text = await res.text();
  if (!text.trim()) return null;

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const results: SearchResult[] = [];

  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.Heading || data.AbstractSource || "DuckDuckGo",
      url: data.AbstractURL,
      snippet: data.AbstractText,
    });
  }
  if (data.Answer && data.AnswerType !== "calc") {
    results.push({
      title: data.Heading || "DuckDuckGo Answer",
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: data.Answer,
    });
  }

  const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
  for (const topic of related) {
    if (topic && topic.Text && topic.FirstURL) {
      results.push({
        title: (topic.Text || "").split(" - ")[0].slice(0, 120),
        url: topic.FirstURL,
        snippet: topic.Text || "",
      });
    } else if (topic && Array.isArray(topic.Topics)) {
      for (const sub of topic.Topics) {
        if (sub && sub.Text && sub.FirstURL) {
          results.push({
            title: (sub.Text || "").split(" - ")[0].slice(0, 120),
            url: sub.FirstURL,
            snippet: sub.Text || "",
          });
        }
      }
    }
  }

  return {
    query,
    abstract: data.AbstractText || undefined,
    abstractUrl: data.AbstractURL || undefined,
    results,
  };
}

// Organic search results via DuckDuckGo HTML endpoint (best-effort, no deps)
async function fetchHtmlResults(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
    },
    body: `q=${encodeURIComponent(query)}`,
  });
  if (!res.ok) return [];
  const html = await res.text();

  const titleRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*href="[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

  const titles: Array<{ url: string; title: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = titleRe.exec(html)) !== null) {
    titles.push({
      url: resolveDdgHref(stripTags(match[1])),
      title: stripTags(match[2]),
    });
  }

  const snippets: string[] = [];
  while ((match = snippetRe.exec(html)) !== null) {
    snippets.push(stripTags(match[1]));
  }

  return titles.map((t, i) => ({
    title: t.title || t.url,
    url: t.url,
    snippet: snippets[i] || "",
  }));
}

// Fallback organic results via DuckDuckGo Lite endpoint (simpler markup)
async function fetchLiteResults(query: string): Promise<SearchResult[]> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } });
  if (!res.ok) return [];
  const html = await res.text();

  const titleRe = /<a[^>]*rel="nofollow"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/a>/g;

  const titles: Array<{ url: string; title: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = titleRe.exec(html)) !== null) {
    titles.push({
      url: resolveDdgHref(stripTags(match[1])),
      title: stripTags(match[2]),
    });
  }

  const snippets: string[] = [];
  while ((match = snippetRe.exec(html)) !== null) {
    snippets.push(stripTags(match[1]));
  }

  return titles.map((t, i) => ({
    title: t.title || t.url,
    url: t.url,
    snippet: snippets[i] || "",
  }));
}

function dedupeResults(results: SearchResult[], limit: number): SearchResult[] {
  const map = new Map<string, SearchResult>();
  for (const r of results) {
    if (!r.url) continue;
    const key = r.url.replace(/\/+$/, "").replace(/^https?:\/\//, "");
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values()).slice(0, limit);
}

async function runSearch(query: string): Promise<SearchResponse | null> {
  let instant: SearchResponse | null = null;
  try {
    instant = await fetchInstantAnswer(query);
  } catch (err) {
    console.warn("DuckDuckGo Instant Answer API error:", err);
  }

  let htmlResults: SearchResult[] = [];
  try {
    htmlResults = await fetchHtmlResults(query);
  } catch (err) {
    console.warn("DuckDuckGo HTML search error:", err);
  }

  let liteResults: SearchResult[] = [];
  if (htmlResults.length === 0) {
    try {
      liteResults = await fetchLiteResults(query);
    } catch (err) {
      console.warn("DuckDuckGo Lite search error:", err);
    }
  }

  const all: SearchResult[] = [];
  if (instant?.abstract) {
    all.push({
      title: "DuckDuckGo Samenvatting",
      url: instant.abstractUrl || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: instant.abstract,
    });
  }
  (instant?.results || []).forEach((r) => all.push(r));
  htmlResults.forEach((r) => all.push(r));
  liteResults.forEach((r) => all.push(r));

  const results = dedupeResults(all, 8);
  return {
    query,
    abstract: instant?.abstract,
    abstractUrl: instant?.abstractUrl,
    results,
  };
}

export async function searchDuckDuckGo(rawQuery: string): Promise<SearchResponse | null> {
  const query = rawQuery.trim().slice(0, 300);
  if (!query) return null;

  const cleaned = cleanSearchQuery(query);

  const first = await runSearch(cleaned || query);
  if (first && first.results.length > 0) return first;

  // Retry once with the original (uncleaned) phrasing if the cleaned query returned nothing.
  if (cleaned !== query) {
    const retry = await runSearch(query);
    if (retry && retry.results.length > 0) return retry;
  }

  return first && first.results.length > 0 ? first : null;
}
