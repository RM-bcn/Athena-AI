# Step 04 — Reiscode-validatie + werkende share-link

## Probleem

1. **Elke willekeurige string** wordt geaccepteerd als reiscode: `handleAccessTripCode`
   in `src/App.tsx` valideert niets; "XYZ" opent gewoon de gastmodus met de default trip.
2. De app kent eigenlijk maar **één trip**: alles wordt opgeslagen onder
   `athena_trip_ATH-2026`, ongeacht welke "nieuwe reis" je aanmaakt (`NewTripModal`).
3. De **share-link** in `ShareModal` kopieert `window.location.href` zonder reiscode —
   de ontvanger komt op het inlogscherm terecht en moet de code alsnog handmatig
   invoeren. De tekst belooft een directe link.
4. `ShareModal` heeft "ATH-2026" op enkele plekken hardcoded (titel, knoptekst).

## Doel

1. Reiscodes worden **gevalideerd** (server of lokaal tegen de bekende tripcode) voordat
   de gastmodus start; ongeldige code → duidelijke foutmelding.
2. Trips worden opgeslagen onder hun **eigen code-key** (dus `athena_trip_<code>`),
   zodat nieuwe reizen elkaar niet overschrijven.
3. De share-link bevat `?code=ATH-2026`; bij het openen van de app wordt de code uit de
   URL gelezen en wordt de gastmodus direct gestart (of het veld vooraf ingevuld).
4. ShareModal gebruikt de werkelijke `tripCode`-prop in plaats van hardcoded strings.

## Betrokken bestanden

- `src/App.tsx` — `handleAccessTripCode` async valideren; trip-state key per code;
  `useEffect` die `?code=` uit de URL leest; `tripCode`-state doorgeven zoals nu.
- `server.ts` — nieuw endpoint `GET /api/trips/:code` (of `/api/trips/validate?code=`)
  dat checkt of de code bestaat (Sheet TripInfo, kolom `TripCode`).
- `server/sheets-service.ts` — hulpfunctie `getTripCodeFromSheet()` of lezen van
  TripInfo-rij; bestaande `loadTripFromSheet` hergebruiken waar mogelijk.
- `src/components/Modals/ShareModal.tsx` — link met `?code=`, hardcoded teksten vervangen.
- `src/components/LoginView.tsx` — foutmelding bij ongeldige code tonen (via nieuwe
  prop of returnwaarde van `onAccessTripCode`).
- `src/components/MyItineraryView.tsx` — alleen indien er "ATH-2026"-hardcodes staan
  (grep), deze vervangen door `tripCode`-prop.

## Uitwerking

### Server: validatie-endpoint

- `GET /api/trips/validate?code=ATH-2026` → `{ valid: true }` of `{ valid: false }`.
- Implementatie:
  - Sheet geconfigureerd → lees TripInfo-tabblad, check kolom `TripCode`
    (row[6] op basis van de seed-header `["TripID", "Title", ..., "TripCode"]`).
  - Sheet niet geconfigureerd → valideer tegen de server-side default
    (`ATH-2026`) zodat de app ook lokaal/offline consistent blijft.
- Geen auth vereist (gastflow moet werken zonder login).

### Client: validatie in gastflow

- `handleAccessTripCode` wordt async:
  1. `fetch('/api/trips/validate?code=' + code)`.
  2. Geldig → gastmodus starten (bestaand gedrag).
  3. Ongeldig → `LoginView` toont foutmelding:
     "Deze reiscode bestaat niet. Controleer de code of vraag de organisator."
     (geef de fout terug via een returnvalue of een `onError`-callback; kies de
     eenvoudigste aanpassing met bestaande prop-structuur).
- Bij netwerkfout: gastmodus alsnog toestaan mét waarschuwing, of weigeren? Kies:
  weigeren met "Kan reiscode niet controleren, probeer opnieuw." (veiliger en
  consistent met validatie-doel).

### Client: opslag per tripcode

- Vervang de vaste key `athena_trip_ATH-2026` door `athena_trip_${tripCode}` in:
  - `App.tsx` (initiele state + `updateAndSaveTrip`).
- `tripCode`-state wordt het pad naar de actuele trip; bij gasttoegang met een andere
  code laadt de app die trip (van sheet of default).
- Let op: `currentTrip` initialisatie gebruikt nu code `ATH-2026`; maak dat dynamisch
  op basis van de actieve `tripCode` (default `ATH-2026`).
- Zorg dat bestaande gebruikersdata migreert: als `athena_trip_ATH-2026` bestaat,
  blijft die gewoon werken (code is immers ATH-2026).

### Client: URL-parameter `?code=`

- In `App.tsx` een `useEffect` bij mount:
  - lees `new URLSearchParams(window.location.search).get('code')`;
  - indien aanwezig: direct de gastvalidatie-flow doorlopen (zelfde pad als
    `handleAccessTripCode`).
- ShareModal-link: `const url = new URL(window.location.href); url.searchParams.set('code', tripCode);`
  en die kopiëren. Fallback-tekst bij ontbrekende `window`: `https://athena-ai.studio/?code=${tripCode}`.
- Hardcoded "ATH-2026" in ShareModal-titel/knoptekst vervangen door `{tripCode}`.

## Acceptatiecriteria

- [ ] Ongeldige reiscode ("XYZ") → foutmelding in LoginView, géén gastmodus.
- [ ] Geldige code (ATH-2026) → gastmodus werkt zoals voorheen.
- [ ] Validatie werkt ook zonder Google Sheets-configuratie (lokale default).
- [ ] Nieuwe trip via NewTripModal wordt opgeslagen onder zijn eigen code-key en
      overschrijft ATH-2026 niet (controleer localStorage na aanmaken).
- [ ] Share-link bevat `?code=ATH-2026`; openen van die link start de gastvalidatie
      automatisch.
- [ ] Geen hardcoded "ATH-2026" meer in ShareModal-teksten (alleen via prop).
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → LoginView: "XYZ" invoeren → foutmelding.
2. "ATH-2026" invoeren → gastmodus.
3. ShareModal openen → link kopiëren → in nieuw tabblad openen → gastmodus start.
4. NewTripModal: nieuwe trip met andere titel aanmaken → localStorage bevat aparte key.

## Git-workflow

1. Branch vanaf verse `main`: `step/04-reiscode-sharelink`.
2. Commits, bijv.:
   - `feat(server): add GET /api/trips/validate`
   - `feat(client): validate trip code before guest mode`
   - `feat(client): persist trip under its own trip-code key`
   - `feat(share): share link with ?code= + auto-open guest mode`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Echte multi-user/multi-trip scheiding in de Google Sheet (één sheet, één reis blijft
  het uitgangspunt; deze step maakt alleen de code-key en validatie kloppend).
- Code-rotatie of reiscodes aanmaken via de UI — later indien gewenst.
