# Step 20 — Vlucht-aftelklok (split-flap) + tickets + live vertraging & incheck-alert

## Probleem
1. Geen visuele "bijna vertrek"-prikkel in de app.
2. Een ouderwetse station-klok met omslaande flaps (dagen/uren/minuten) moet in de
   **header** verschijnen, gebaseerd op de vertrektijd van de **eerste vlucht**.
3. De klok mag **alleen tonen zolang de reis "klaar staat maar nog niet begonnen is"**
   (er is minstens één vlucht-ticket en de eerste vlucht ligt in de toekomst) en moet
   **verdwijnen zodra de eerste vlucht is vertrokken** (reis begonnen) of als er geen
   vlucht is.
4. Vliegtickets moeten toegevoegd kunnen worden (vluchtnummer, boekingsref, IATA, stoel).
5. Bijna vertrek: **live vertraging** via AviationStack en een **incheck-alert 24u
   van tevoren** (alleen in-app, geen mail).

## Doel
- **A.** Split-flap aftelklok in `TopHeader`, gevoed door de vroegste `type:'flight'`
  in `transportEntries`; verbergt automatisch na vertrek / bij geen vlucht.
- **B.** Vliegticket-formulier uitgebreid (vluchtnummer, IATA, stoel, boekingsref) en
  persistent gemaakt in Sheets (`Transports` krijgt kolommen M–P).
- **C.** Live vluchtstatus via AviationStack (`GET /api/flights/status`), met nette
  fallback naar geplande tijden.
- **D.** Incheck-banner/ribbon 24u voor vertrek (in-app).

## Betrokken bestanden
- `src/transport/types.ts`: `TransportEntry` + optioneel `flightNumber`, `fromIata`,
  `toIata`, `seat`.
- `server/sheets-service.ts`: `Transports`-header en load/save uitgebreid met kolommen
  **M FlightNumber, N FromIata, O ToIata, P Seat** (backward compatible).
- `src/data/initialData.ts`: `initialTransportEntries` met een voorbeeld-heenvlucht op
  een datum in de toekomst (demo; wordt overschreven zodra een Sheet is geladen).
- `server/flight-status.ts` (nieuw): `getFlightStatus({flightIata, depIata, depDate})`
  → AviationStack `/v1/flights`, normaliseert naar `{found,status,scheduledDep,
  estimatedDep,delayMinutes,gate,terminal,depIata,arrIata,live}`, 5-min server-cache.
  Geen key / HTTP-only-fallback → `{found:false}`.
- `server.ts`: nieuwe `GET /api/flights/status` met `requireAuth`.
- `src/api/flightStatus.ts` (nieuw): `fetchFlightStatus(...)` + `normalizeFlightIata`.
- `src/transport/transportLogic.ts`: `combineDateTime` + `getFirstFlightDeparture`.
- `src/transport/useFlightStatus.ts` (nieuw): haalt status **alleen binnen 24u van
  vertrek**, pollt elke 3 min; anders `null`.
- `src/components/TripCountdown.tsx` (nieuw): 3 flap-groepen Dagen/Uren/Minuten,
  CSS-keyframe omslag, status-chip + "Inchecken kan nu"-pill; compacte mobiele variant.
- `src/index.css`: `.flap-card` / `.flap-digit` / `@keyframes flapIn`.
- `src/components/TopHeader.tsx`: 3-sectie layout (titel/nav · klok · user); klok alleen
  als `countdownFlight` niet `null`.
- `src/App.tsx`: `firstFlight` via `useMemo` op `transportEntries`; demo-seed effect
  (alleen zonder Sheet); `countdownFlight` doorgegeven aan `TopHeader`.
- `src/transport/TransportBookingModal.tsx`: bij `type==='flight'` extra velden
  Vluchtnummer / Stoel / Vertrek IATA / Aankomst IATA; titel/icoon "Vlucht toevoegen".
- `src/transport/TransportDetailPopup.tsx`: toont vluchtnummer/route/stoel voor vluchten.

## Config
- `AVIATIONSTACK_API_KEY` → `.env.local` + Vercel env (free tier: 100 req/maand,
  HTTP-only op sommige plannen → nette fallback).

## Acceptatiecriteria
- [x] Klok verschijnt alleen zolang ≥1 vlucht met toekomstige vertrektijd bestaat;
  verdwijnt automatisch na vertrek van de eerste vlucht (en bij geen vlucht).
- [x] Split-flap toont D/U/M en slaat visueel om bij cijfer-wissel (stationklok-look);
  ook op mobiel leesbaar (compacte variant).
- [x] Vliegticket (vluchtnummer + boekingsref + IATA + stoel) wordt in Sheets bewaard
  (kolommen A–P).
- [x] Binnen 24u van vertrek: live-status-chip van AviationStack (of nette fallback
  "Volgens dienstregeling" zonder key/match) + incheck-pill.
- [x] `npm run lint` + `npm run test` slagen.
