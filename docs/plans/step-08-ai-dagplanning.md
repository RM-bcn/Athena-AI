# Step 08 — AI-dagplanning per verblijfsdag

## Probleem

De dagkaarten in `src/components/MyItineraryView.tsx` (regels 636-691) zijn
**statisch** en generiek: dag 1 is altijd "Aankomst & Verkenning", de laatste dag
altijd "Highlight Tour & Voorbereiding Volgende Stop", en alle tussenliggende dagen
"Stranden, Cultuur & Gastronomie" met één vage zin. De zin "Athena AI past de
dagplanning automatisch aan je reisstijl aan" (regel 677) is dus niet waar: er wordt
niets aangepast of gegenereerd.

## Doel

1. Per verblijf (per eiland-stop) kan de gebruiker een **AI-dagplanning laten
   genereren**: voor elke nacht een dag met titel, activiteiten, eet- en praktische
   tips — in het Nederlands, passend bij het eiland en de verblijfsdatums.
2. De gegenereerde planning wordt opgeslagen (localStorage, key per tripcode + stay)
   en getoond in plaats van de statische teksten.
3. Werkende flow: een "Regenereer dagplanning"-knop per verblijf → de chat-endpoint
   `/api/chat` wordt gebruikt met een gerichte prompt → JSON terug → renderen.
4. Graceful fallback: als de AI niet beschikbaar is, blijven de bestaande statische
   teksten staan (met een korte melding).

## Betrokken bestanden

- `src/App.tsx` — handler `generateDayPlan(stay)` die `/api/chat` aanroept en de
  response opslaat; state `dayPlans` (Record `<stayId, DayPlan[]>`); key per tripcode.
- `src/components/MyItineraryView.tsx` — "Regenereer dagplanning"-knop per verblijf;
  dagkaarten renderen uit `dayPlans` wanneer beschikbaar, anders de huidige statische
  content.
- `src/types.ts` — nieuw type `DayPlan` (dagvelden hieronder).
- `.env.example` — geen wijziging nodig (hergebruikt AI-keys van `/api/chat`).

## Uitwerking

### Type

```ts
export interface DayPlan {
  day: number;            // globale dag (1-gebaseerd) of lokale dag-index in de stop
  title: string;          // bv. "Sarakiniko maanstrand & Kleftiko boottocht"
  activities: string[];   // 3-5 punten, concreet per eiland
  dining: string;         // bv. "Lunch bij vissers-taverne in Pollonia"
  tips: string[];         // praktische tips (tijdig boeken, cash, etc.)
}
```

Kies lokale dag-index (0 = aankomstdag) zodat opslag per stop onafhankelijk is van
de positie in de reis; renderen combineert met de bestaande `globalDayNum`.

### Server: hergebruik `/api/chat`

- Geen nieuw endpoint: de bestaande `/api/chat` (zonder attachment, met live tools)
  kan een dagplanning in JSON teruggeven via `parseAIJsonBlock`. Maar de prompt voor
  een *structuur* verschilt van de concierge-prompt. Eenvoudigste robuuste route:
  een **nieuw klein endpoint** `POST /api/dayplan` in `server.ts` dat:
  - body: `{ island, startDate, endDate, nights, accommodationName, style }`;
  - met Groq/Gemini (hergebruik `callGroqAI` / `getGeminiClient`) een JSON-array
    `[{ day, title, activities[], dining, tips[] }]` genereert;
  - via `parseAIJsonBlock` uit de response parst en `{ plans }` teruggeeft;
  - foutafhandeling: `{ error }` teruggeven zodat de client kan fallbacken.
- Dit houdt de concierge-chat-prompt ongemoeid en geeft een voorspelbare API.
  Kies deze aanpak (nieuw endpoint) — vriendelijk voor de client.

### Client

- `App.tsx`:
  - state `dayPlans: Record<string, DayPlan[]>` (key: `${tripCode}:${stay.id}`),
    geïnitialiseerd uit localStorage, opgeslagen bij wijziging.
  - `generateDayPlan(stay)`: POST `/api/dayplan`; bij succes state bijwerken en
    opslaan; bij fout een toonbare melding (kan via `alert` of een subtiele
    inline-boodschap in MyItineraryView — kies inline-boodschap, geen `alert`).
  - doorgeven aan `MyItineraryView` als `dayPlans` + `onGenerateDayPlan`.
- `MyItineraryView.tsx`:
  - Per stay-kaart (boven de dagkaarten) een knop "Regenereer dagplanning" (alleen
    bij `canEdit`? Nee — gasten mogen ook lezen; kies: zichtbaar voor iedereen die
    de reis ziet, genereren vereist geen bewerking) met een laad-indicator.
  - In de dagkaarten: als `dayPlans[stay.id]` bestaat, de geplande content renderen
    (titel, activiteiten als lijst met icoontjes, dining, tips) i.p.v. de statische
    blokken; anders de huidige statische content.
  - Let op: de bestaande `TransportDayRows` blijft onderaan elke dagkaart staan.

## Acceptatiecriteria

- [ ] Per verblijf is een "Regenereer dagplanning"-knop zichtbaar.
- [ ] Na klik toont de knop een laad-indicator; bij succes verschijnt per dag een
      eigen titel + activiteiten + dining + tips (in het Nederlands, eiland-specifiek).
- [ ] De gegenereerde planning blijft behouden na refresh (localStorage, key per
      tripcode + stay).
- [ ] Her-genereren vervangt de oude planning van dat verblijf.
- [ ] Wanneer de AI niet beschikbaar is, blijft de statische content staan met een
      subtiele melding (geen crash, geen `alert`).
- [ ] TransportDayRows blijft op elke dagkaart zichtbaar.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → Itinerary → verblijf Milos → "Regenereer dagplanning" → check
   response in devtools/netwerk en de gerenderde kaarten.
2. Refresh → planning blijft.
3. AI-keys tijdelijk uitzetten (dev) → fallback-melding controleren.

## Git-workflow

1. Branch vanaf verse `main`: `step/08-ai-dagplanning`.
2. Commits, bijv.:
   - `feat(server): add POST /api/dayplan returning per-day plans as JSON`
   - `feat(client): generate and render per-stay AI day plans`
   - `feat(client): persist day plans in localStorage per trip+stay`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Dagplannen synchroniseren naar Google Sheets (blijft lokaal; kan later).
- Automatisch regenereren bij elke trip-wijziging (nu expliciet per knop).
- Print-vriendelijke opmaak van dagplannen (bestaat al via stap 03 print-CSS,
  controleren dat het er goed uitziet is wel onderdeel van de acceptatie).
