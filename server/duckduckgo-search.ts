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

// Official DuckDuckGo Instant Answer API (no key required, returns clean JSON)
async function fetchInstantAnswer(query: string): Promise<SearchResponse | null> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;

  const data = await res.json();
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
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
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

export async function searchDuckDuckGo(rawQuery: string): Promise<SearchResponse | null> {
  const query = rawQuery.trim().slice(0, 300);
  if (!query) return null;

  let response: SearchResponse | null = null;
  try {
    response = await fetchInstantAnswer(query);
  } catch (err) {
    console.warn("DuckDuckGo Instant Answer API error:", err);
  }

  const fallback = response?.results?.length ? response : null;

  try {
    const htmlResults = await fetchHtmlResults(query);
    if (htmlResults.length > 0) {
      const combined = new Map<string, SearchResult>();
      const push = (r: SearchResult) => {
        if (!r.url) return;
        const key = r.url.replace(/\/+$/, "");
        if (!combined.has(key)) combined.set(key, r);
      };
      if (response?.abstract) {
        push({ title: "DuckDuckGo Samenvatting", url: response.abstractUrl || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, snippet: response.abstract });
      }
      (response?.results || []).forEach(push);
      htmlResults.forEach(push);
      return {
        query,
        abstract: response?.abstract,
        abstractUrl: response?.abstractUrl,
        results: Array.from(combined.values()).slice(0, 8),
      };
    }
  } catch (err) {
    console.warn("DuckDuckGo HTML search error:", err);
  }

  return fallback;
}
