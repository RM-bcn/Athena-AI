# Step 14 — Proactief bestand tegen Groq-modelrotatie (dynamische modelselectie)

## Probleem

Groq wisselt periodiek hun (OSS) modelaanbod om: modellen worden gedeprecieerd en
vervangen door nieuwere (deels andere model-IDs). De huidige code **hardcodeert**
model-IDs op meerdere plekken in `server.ts`:

- `callGroqAI` (regel 800): `["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]`
- `callGroqAgent` (regel 1043): `["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]`
- Gemini: `"gemini-3.6-flash"` hardcoded op regels 1526, 1654, 1717, 1868, 1945.

Zodra Groq zo'n model-ID verwijdert, geeft de API een 400/404-model-not-found. De
huidige fallbackketen vangt dat per-model af en valt daarna terug op Gemini, maar:

1. Als **beide** hardcoded Groq-modellen verdwijnen, faalt de hele Groq-keten en
   werken alle AI-functies alleen nog op Gemini.
2. Nieuwe/vervangen modellen worden **niet automatisch** opgepikt; er is geen
   dynamische ontdekking van wat er nu beschikbaar is.
3. Herstellen vereist een code-wijziging + redeploy — precies wat de gebruiker wil
   voorkomen (niet naar een laptop grijpen tijdens de vakantie).

## Doel

De server wordt **zelfherstellend** rondom modelrotatie:

- **Dynamische model-ontdekking**: bij serverstart én periodiek (met TTL-cache)
  de Groq `/models`-endpoint bevragen en de beschikbare, actieve modellen laden.
- **Voorkeurs-ladder**: kies automatisch het beste beschikbare model op basis van
  voorkeurs-patronen (bv. `70b-versatile` > `8b-instant`), met env-var override
  (`GROQ_MODEL_PREFERENCE` / `GROQ_MODELS`) voor handmatig bijsturen.
- **Self-healing bij 400/404-model-not-found**: de cache invalideren, de lijst
  herladen en opnieuw proberen met de verversde lijst (zonder redeploy).
- **Laatste-redmiddel-fallback**: als er écht geen Groq-model meer werkt, transparant
  doorgaan naar Gemini en dat loggen — nooit een harde crash.
- **Gemini-model ook configureerbaar** maken via env (`GEMINI_MODEL`), zodat ook die
  rotatie zonder code-wijziging op te vangen is.

## Betrokken bestanden

- `server.ts` — centrale wijziging; vervang hardcoded lijsten door dynamische
  resolutie met cache.
- `.env.example` — nieuwe optionele env-vars documenteren.
- `docs/plans/README.md` — stap 14 toevoegen aan de roadmap.

## Uitwerking

### 1. Groq-modellijst ophalen (`GET https://api.groq.com/openai/v1/models`)

Voeg een helper toe die de beschikbare actieve modellen ophaalt:

```ts
// Cache: { models: string[], fetchedAt: number }
let groqModelCache: { models: string[]; fetchedAt: number } | null = null;
const GROQ_MODEL_TTL_MS = 6 * 60 * 60 * 1000; // 6 uur; ook een manual refresh-knop later

async function fetchGroqModels(): Promise<string[]> {
  const apiKey = getEnvVal("GROQ_API_KEY", "GROQ_KEY", "GROQ_API_TOKEN", "GROQ_SECRET", "groq_api_key");
  if (!apiKey) return [];

  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Groq models status ${res.status}`);
  const data = await res.json();
  // data.data = [{ id, active, owned_by, ... }]
  return (data.data || [])
    .filter((m: any) => m && typeof m.id === "string" && m.active !== false)
    .map((m: any) => m.id);
}

async function getGroqModelList(): Promise<string[]> {
  if (groqModelCache && Date.now() - groqModelCache.fetchedAt < GROQ_MODEL_TTL_MS) {
    return groqModelCache.models;
  }
  const models = await fetchGroqModels().catch((err) => {
    console.warn(`[Groq] models fetch failed, falling back to known list:`, err?.message || err);
    return [];
  });
  const merged = models.length ? models : [...DEFAULT_GROQ_MODELS]; // fallback naar bekende lijst
  groqModelCache = { models: merged, fetchedAt: Date.now() };
  return merged;
}
```

Let op: wanneer de fetch mislukt (bv. netwerk/status), gebruik dan de vorige
(cache)lijst of de hardcoded default — nooit een lege lijst.

### 2. Voorkeurs-ladder (modelranking)

Rank de beschikbare modellen zodat we het "beste" eerst proberen. Simple score-functie:

```ts
function rankGroqModels(models: string[]): string[] {
  const score = (id: string) => {
    const l = id.toLowerCase();
    let s = 0;
    if (/versatile|70b/.test(l)) s += 100;      // beste kwaliteit/context
    if (/llama-3\.3/.test(l)) s += 50;
    if (/llama-3\.1/.test(l)) s += 40;
    if (/8b/.test(l)) s -= 20;                  // kleiner, minder capabel
    if (/instant/.test(l)) s -= 10;
    if (/flash/.test(l)) s -= 5;
    return s;
  };
  return [...models].sort((a, b) => score(b) - score(a));
}
```

**Env-override** (als iemand handmatig wil sturen):

```ts
function resolveGroqModels(): string[] {
  const pref = getEnvVal("GROQ_MODEL_PREFERENCE", "GROQ_MODELS");
  const explicit = pref
    ? pref.split(",").map((m) => m.trim()).filter(Boolean)
    : [];
  // expliciete lijst eerst, aangevuld met gerankte beschikbare modellen erachter
  const dynamic = rankGroqModels(/* opgehaald uit cache */);
  return [...explicit, ...dynamic.filter((m) => !explicit.includes(m))];
}
```

`DEFAULT_GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]`.

### 3. `callGroqAI` en `callGroqAgent` herschrijven

Beide functies krijgen dezelfde nieuwe logica i.p.v. de hardcoded `models`-array:

```ts
const models = await resolveGroqModels();  // voorkeur + dynamisch gerankt

for (const model of models) {
  // bestaande try/catch
  // bij 400/404 waarin "model" of "not found" zit (of status 404):
  if (res.status === 400 || res.status === 404) {
    groqModelCache = null;              // cache invalideren
    const refreshed = await getGroqModelList();
    if (refreshed.length && !models.includes(refreshed[0])) {
      console.warn(`[Groq] model ${model} niet meer beschikbaar; herladen en retry met ${refreshed[0]}`);
      return callGroqAI(systemPrompt, userPrompt, retriesLeft); // herstart met verse lijst
    }
  }
  // 429-handling blijft zoals nu
}
```

Belangrijk: voorkom oneindige recursie — alleen 1 extra refresh-poging per call
(bv. via een `refreshAttempted`-param/flag), anders een `null`-retour → Gemini.

### 4. Gemini-model configureerbaar

Maak een helper:

```ts
function getGeminiModel(): string {
  return getEnvVal("GEMINI_MODEL") || "gemini-3.6-flash";
}
```

Vervang alle 5 hardcoded `model: "gemini-3.6-flash"` door `model: getGeminiModel()`.
Zo kan ook Gemini-rotatie per env worden opgevangen zonder redeploy.

### 5. Logging & status

- Log bij serverstart de gerankte actieve Groq-lijst: `[Groq] actieve modellen: ...`.
- Log wanneer een model wordt herladen/geruild (self-healing zichtbaar).
- `/api/ai/status` uitbreiden met de huidige actieve Groq-modellen (`groqModels`)
  en het gebruikte Gemini-model (`geminiModel`), zodat de SettingsView later de
  werkelijke modellen kan tonen (optioneel, niet verplicht voor deze stap).

### 6. Env-vars (`server.ts` lezen + `.env.example`)

```env
# GROQ_MODEL_PREFERENCE: handmatige model-voorkeur (komma-gescheiden).
# Leeg = automatisch gerankt uit de beschikbare modellen van Groq.
# GROQ_MODEL_PREFERENCE="llama-3.3-70b-versatile"

# GEMINI_MODEL: Gemini-model (default: gemini-3.6-flash).
# GEMINI_MODEL="gemini-3.6-flash"
```

## Acceptatiecriteria

- [ ] Bij serverstart wordt de Groq-modellijst dynamisch opgehaald en gelogd.
- [ ] De voorkeursladder kiest automatisch het beste actieve model (70b > 8b).
- [ ] Wanneer een model een 400/404-model-not-found teruggeeft, wordt de cache
      geïnvalideerd, de lijst herladen en zonder redeploy opnieuw geprobeerd
      (max. 1 refresh per call).
- [ ] Wanneer de Groq-modellijst niet op te halen is, wordt de vorige lijst of de
      bekende default-lijst gebruikt (geen lege lijst, geen crash).
- [ ] Wanneer alle Groq-modellen falen, valt de server terug op Gemini zoals nu —
      en dat wordt gelogd.
- [ ] `GEMINI_MODEL`-env-var overschrijft het Gemini-model (default `gemini-3.6-flash`).
- [ ] `GROQ_MODEL_PREFERENCE`-env-var overschrijft/voegt modellen toe bovenaan.
- [ ] Geen nieuwe dependencies.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → console toont `[Groq] actieve modellen: ...`.
2. Tijdelijk een nep-model-ID bovenaan `GROQ_MODEL_PREFERENCE` zetten → server
   slaat het over en valt terug op een werkend actief model (of Gemini).
3. `GEMINI_MODEL="gemini-3.6-flash"` expliciet zetten → status toont dit.
4. `npm run lint` + `npm run test`.

## Git-workflow

1. Branch vanaf verse `main`: `step/14-groq-model-rotatie`.
2. Commits, bijv.:
   - `feat(server): dynamic Groq model discovery with ranking and TTL cache`
   - `feat(server): self-heal on model-not-found (invalidate + refresh + retry)`
   - `feat(server): make Gemini model configurable via GEMINI_MODEL`
   - `docs(env): document GROQ_MODEL_PREFERENCE and GEMINI_MODEL`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Fallback naar een heel andere provider (bv. OpenRouter) als Groq én Gemini
  uitvallen — aparte stap.
- Dynamische ontdekking voor Gemini (`models.list`) — voor nu env-var genoeg.
- Automatische retry met terugschakelen van Groq naar Gemini per model (bestaat
  al via de fallbackketen; hier niet wijzigen).
