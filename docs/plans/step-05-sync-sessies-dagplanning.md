# Step 05 — Transport-sync, nieuwe chat-sessie en DAG-nummering

## Probleem

1. **Transport-entries syncen niet naar Google Sheets** bij toevoegen/wijzigen/
   verwijderen. `useTransportEntries` schrijft alleen naar localStorage; de sheet-sync
   gebeurt pas bij een andere trip-wijziging of handmatige sync. De UI belooft
   "realtime opgeslagen". Bovendien zit er een stale-closure risico in
   `updateAndSaveTrip` (`App.tsx`), die `transportEntries` uit de render-closure
   meestuurt.
2. **Geen nieuwe chat-sessie mogelijk**: `sessionId` in `App.tsx` wordt één keer
   aangemaakt en nooit ververst. "Current Chat" groeit oneindig en History toont maar
   één sessie.
3. **DAG-nummering is fout** bij verblijven die niet exact 3 nachten duren:
   `MyItineraryView.tsx` rekent `stayIdx * 3 + dayIdx + 1`. Met bijvoorbeeld een eerste
   verblijf van 2 nachten klopt dag 3 van verblijf 2 niet meer.

## Doel

1. Transport-wijzigingen worden (met debounce) automatisch naar de sheet gesynchroniseerd
   zodra er een ingelogde gebruiker is — net als trip/chat/favorites.
2. De chat krijgt een "Nieuw gesprek"-knop; een nieuwe sessie start met een lege
   current view terwijl oude sessies in History blijven staan.
3. DAG-nummering wordt berekend op basis van cumulatieve nachten (correcte dagtelling
   voor willekeurige verblijflengtes).

## Betrokken bestanden

- `src/transport/useTransportEntries.ts` — optionele `onPersist`-callback of een
  "changed"-signaal voor de host.
- `src/App.tsx` — debounced sheet-save voor transport; "nieuwe sessie"-logica;
  `handleStartNewSession`; doorgeven aan `ChatInterfaceView`.
- `src/components/ChatInterfaceView.tsx` — knop "Nieuw gesprek" (header of boven het
  invoerveld); lege-state na nieuwe sessie.
- `src/components/MyItineraryView.tsx` — DAG-nummering fixen.
- `src/types.ts` — indien nodig klein type voor sessie (bestaande `ChatMessage.sessionId`
  is voldoende, waarschijnlijk geen wijziging).

## Uitwerking

### 1. Transport-sync naar Sheets

- In `App.tsx` een `transportSyncRef` (timeout) naar analogie van `historySyncRef`:
  - Een `useEffect` op `transportEntries` die, wanneer `currentUser` bestaat, na
    1500 ms debounce `POST /api/sheets/save` doet met `{ trip: currentTrip,
    customBookings, stayBookingLinks, transportEntries }`.
  - Gebruik refs (`currentTripRef`, `customBookingsRef`, `stayBookingLinksRef`,
    `transportEntriesRef`) of voeg de waarden toe aan de dependencies, zodat er geen
    stale closures meer zijn. Kies de ref-aanpak (minst re-renders) maar let op dat de
    effect dependencies kloppen.
  - Dit vervangt NIET de bestaande `updateAndSaveTrip`-save; die blijft voor trip-
    wijzigingen. Voorkom dubbele saves door beide paden via één gedeelde
    `syncToSheets(snapshot)`-hulpfunctie te laten lopen (één debounce-klok).
- Alternatief (kleiner): `useTransportEntries` een `onChange`-callback geven die App
  gebruikt. Kies wat het schoonst past; hulpfunctie `syncToSheets` blijft verplicht
  om dubbele debounces te voorkomen.
- Gasten (`isGuestMode`) en niet-ingelogden blijven uitgesloten van sheet-saves.

### 2. Nieuwe chat-sessie

- In `App.tsx`:
  - `sessionId` van lazy `useState`-initializer naar een normale `useState` +
    `startNewSession()`-functie: genereert `session-${Date.now()}`, schrijft
    `athena_chat_session` naar localStorage en `setSessionId`.
  - `handleStartNewSession` = `startNewSession()` (history blijft intact; alleen de
    huidige view wordt leeg).
- In `ChatInterfaceView`:
  - Knop "Nieuw gesprek" (bijv. naast de subtab-bar of boven het invoerveld) met
    `MessageSquarePlus`- of `Plus`-icoon; roept nieuwe prop `onStartNewSession` aan.
  - Alleen tonen als er al berichten in de huidige sessie staan (of altijd — kies:
    altijd tonen is eenvoudiger en voorspelbaar; bij lege sessie doet de knop niets).
- History-tab blijft werken (sessions groeperen op `sessionId` — bestaande logica).

### 3. DAG-nummering

- In `MyItineraryView.tsx`: bereken per stay een `stayStartDay` (cumulatief):
  ```ts
  let dayCursor = 0;
  const stayStartDays = currentTrip.stays.map((s) => { const start = dayCursor; dayCursor += s.nights; return start; });
  ```
  en gebruik `stayStartDays[stayIdx] + dayIdx + 1` in plaats van `stayIdx * 3 + dayIdx + 1`.
- Let op: huidige map-loop zit genest; hou de berekening buiten de JSX (bovenaan de
  component, memo niet nodig — klein genoeg).

## Acceptatiecriteria

- [ ] Transport toevoegen/wijzigen/verwijderen als ingelogde gebruiker → binnen ±2s
      een `/api/sheets/save`-call met de actuele transportEntries (verifieer in
      netwerk-tab én in de Google Sheet).
- [ ] Geen dubbele save-calls wanneer trip én transport tegelijk veranderen
      (debounce bundelt ze).
- [ ] Als gast/uitgelogd: geen sheet-save bij transport-wijzigingen.
- [ ] "Nieuw gesprek" start een lege sessie; History toont de oude sessie(s);
      na refresh blijft de laatste sessie actief.
- [ ] DAG-nummers kloppen bij een trip met verblijven van bv. 2-3-2 nachten
      (geen gaten of dubbele dagen).
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → inloggen → ferry toevoegen via TransportSidebarCard/RouteConnector →
   devtools Network: na ±1,5 s een POST `/api/sheets/save`.
2. Chat: bericht sturen → "Nieuw gesprek" → current leeg, History bevat oude sessie.
3. NewTripModal: verblijven 2/3/2 nachten aanmaken → dagkaarten tonen 1-2, 3-5, 6-7.

## Git-workflow

1. Branch vanaf verse `main`: `step/05-sync-sessies-dagnummers`.
2. Commits, bijv.:
   - `fix(sheets): sync transport entries to Google Sheets with debounce`
   - `refactor(app): shared syncToSheets helper to avoid stale closures`
   - `feat(chat): new conversation button with fresh session id`
   - `fix(itinerary): correct day numbering based on cumulative nights`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Sessie-hernoemen/archiveren — niet gepland.
- Automatische dagplan-content per dag (AI-invulling) — grotere feature, later
  apart oppakken.
