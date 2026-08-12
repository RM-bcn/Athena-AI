export async function translateWithMyMemory(
  text: string,
  sourceLang = "el",
  targetLang = "en"
): Promise<string | null> {
  const cleaned = (text || "").trim();
  if (!cleaned) return null;

  const chunks: string[] = [];
  for (const line of cleaned.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 450) {
      chunks.push(trimmed);
      continue;
    }
    for (let i = 0; i < trimmed.length; i += 450) {
      chunks.push(trimmed.slice(i, i + 450));
    }
  }
  if (!chunks.length) return null;

  const translated: string[] = [];
  for (const chunk of chunks.slice(0, 12)) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${sourceLang}|${targetLang}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data: any = await res.json();
      const status = Number(data?.responseDataStatus ?? 0);
      const t = data?.responseData?.translatedText;
      if (status === 200 && typeof t === "string" && t.trim()) {
        translated.push(t.trim());
      }
    } catch {
      // silent: fallback chain continues
    }
  }
  return translated.length ? translated.join("\n") : null;
}
