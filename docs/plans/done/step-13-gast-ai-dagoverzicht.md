# Step 13 — AI Dagoverzicht voor gasten (geen chat, één-klik-samenvatting)

## Probleem

Gasten kunnen de reis volgen via `?code=ATH-2026` maar hebben geen toegang
tot de chat. Ze zien de dagplanning (activiteiten, eettips) maar krijgen geen
contextuele uitleg: wat is het weer vandaag? Welke restaurants zijn aanbevolen
rondom dit eiland? Wat zijn de highlights van de regio? Er is geen manier voor
gasten om Athena om een samenvatting te vragen zonder chat.

## Doel

Bied gasten een **één-klik AI-dagoverzicht** per verblijfsdag dat de volgende
informatie bevat:
- Weerbericht voor het eiland op die dag
- Geplande activiteiten (uit de dagplanning)
- Informatie over de regio (highlights, bezienswaardigheden)
- Restaurant-specialiteiten van het eiland

Dit is een **non-chat** functionaliteit: één knop, één API-call, één
samenvattingskaart. Geen conversatie, geen geschiedenis.

## Betrokken bestanden

### Server

- `server.ts` — nieuw endpoint `POST /api/dayoverview` dat:
  - Input: `{ island, date, dayPlan? }` (dagplanning is optioneel)
  - Output: `{ success: true, overview: string }` (Markdown-achtige samenvatting)
  - Gebruikt Groq (primair) / Gemini (fallback) met een specifiek systeem-prompt
  - Haalt weer op via bestaande `getWeather()` uit `server/live-providers.ts`
    (of fallback naar static data)
  - Geen auth nodig (gasten mogen lezen)

### Client

- `src/components/MyItineraryView.tsx` — nieuwe knop "Vraag Athena" per dagkaartje
  die het overzicht toont in een collapsible sectie of modal.
- `src/types.ts` — eventueel nieuw type `DayOverview` (optioneel, kan ook inline).

## Uitwerking

### 1. Server-endpoint `POST /api/dayoverview`

```ts
app.post("/api/dayoverview", async (req, res) => {
  const { island, date, dayPlan } = req.body || {};
  // Valideer input
  // Haal weer op (getWeather of static fallback)
  // Bouw prompt met weer + dagplanning + eilandinfo
  // Call Groq/Gemini
  // Retourneer samenvatting
});
```

**Systeem-prompt:**
```
Je bent Athena AI, een persoonlijke reisconcierge voor de Cycladen.
Geef een kort, warm overzicht van de dag voor een gast die de reis volgt.
Inclusief:
- Weerbericht (kort, als het beschikbaar is)
- Geplande activiteiten (uit de dagplanning)
- Highlights van het eiland/-regio
- Aanbevolen restaurants of lokale specialiteiten

Antwoord in het Nederlands. Max 150 woorden. Geen markdown, geen opsommingstekens.
Gebruik een vriendelijke, persoonlijke toon.
```

**Weer-integratie:**
- Gebruik `getWeather(island)` uit `server/live-providers.ts` (regel ~100+)
- Bij fout: gebruik standaard-weertekst "Warm en zonnig, typisch voor de Cycladen in augustus"

### 2. Client — knop + weergave

**MyItineraryView.tsx:**
- Per dagkaartje (regel 664-742) een nieuwe knop "Vraag Athena" (alleen voor gasten)
- Knop-stijl: amber/geel thema (consistent met gastmodus-kleuren)
- Bij klik: `POST /api/dayoverview` → toon resultaat in een uitklapbare sectie
  onder het dagkaartje (geen modal, gewoon inline)

```tsx
{isGuestMode && (
  <button
    onClick={() => handleAskDayOverview(stay, dayIdx)}
    className="text-xs font-['Inter'] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
  >
    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
    Vraag Athena
  </button>
)}
```

**State management:**
- `dayOverviews: Record<string, string>` — key = `${stay.id}-${dayIdx}`
- `loadingOverview: string | null` — key van het momenteel ladende overzicht
- Bij klik: check cache → anders API-call → sla op in state

### 3. Weergave van het overzicht

Onder het dagkaartje, na de bestaande content:

```tsx
{dayOverviews[`${stay.id}-${dayIdx}`] && (
  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
    <p className="text-xs font-['Inter'] text-amber-900 leading-relaxed">
      {dayOverviews[`${stay.id}-${dayIdx}`]}
    </p>
  </div>
)}
```

Bij laden:
```tsx
{loadingOverview === `${stay.id}-${dayIdx}` && (
  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
    <p className="text-xs font-['Inter'] text-amber-600 animate-pulse">
      Athena denkt na...
    </p>
  </div>
)}
```

## Acceptatiecriteria

- [ ] Gast (via `?code=ATH-2026`) ziet een "Vraag Athena"-knop per dagkaartje.
- [ ] Bij klik wordt een AI-samenvatting opgehaald en inline getoond.
- [ ] De samenvatting bevat weer (indien beschikbaar), activiteiten, regio-info
      en restaurant-tips.
- [ ] Het overzicht wordt gecachet (tweede klik laadt niet opnieuw).
- [ ] Laden toont een "Athena denkt na..."-indicatie.
- [ ] Ingelogde gebruikers zien de knop NIET (alleen voor gasten).
- [ ] Geen nieuwe dependencies; geen nieuwe betaalde diensten.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → gastmodus (`?code=ATH-2026`) → "Vraag Athena" per dag.
2. Klik → overzicht verschijnt met weer + activiteiten + tips.
3. Nogmaals klikken → direct uit cache (geen API-call).
4. Ingelogd → knop niet zichtbaar.

## Git-workflow

1. Branch vanaf verse `main`: `step/13-gast-ai-dagoverzicht`.
2. Commits, bijv.:
   - `feat(server): POST /api/dayoverview with AI summary`
   - `feat(client): guest day overview button with inline display`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Chat voor gasten (blijft geblokkeerd).
- Meerdere AI-calls per dag (caching voorkomt dit).
- Dynamische weer-integratie met live API (gebruik fallback voor nu).
