# Step 06 — Taalconsistentie & tekstcorrecties (UI in het Nederlands)

## Probleem

De UI is een mengelmoes van Nederlands en Engels en bevat enkele onjuiste of
misleidende teksten en labels:

- `QuickHelpView` is vrijwel volledig Engels ("How can I help you, Traveler?",
  "I missed my ferry", "Find a quiet beach", "Call Taxi", "Pharmacy Nearby", ...).
- `SupportView` is volledig Engels.
- `SettingsView` mengt Engels en Nederlands ("Preferences", "Settings & Concierge
  Options", "Ferry Delay & Gate Alerts" naast "Mijn Profiel").
- `TopHeader` toont bij `settings`/`profile`/`support` de titel "Athena AI" (fallback),
  niet de tab-naam.
- Sheets-banner in `MyItineraryView` claimt altijd "Alle wijzigingen ... worden
  realtime opgeslagen in je Google Sheet", ook als Sheets niet gekoppeld is; badge
  "Google Workspace Sync" is verwarrend.
- QuickHelp "Local Time in Cyclades" toont de apparaattijd i.p.v. Griekse tijd.
- SettingsView: badge toont altijd "GROQ READY" (ook als de Groq-key ontbreekt);
  toggles "Ferry Delay & Gate Alerts" en "Default Language" zijn niet functioneel.
- Itinerary-header: "8 Dagen Odyssey" klopt niet met 15–23 aug (9 dagen); na een
  stay-edit wordt het `nachten + 1`, dus inconsistent met de default.
- Login-tekst "locaties te beheren en te synchroniseren" beschrijft een feature die
  niet bestaat.
- Kleine fouten: "Hawen" in suggest-hotels data (`server.ts`, Koufonisia → "Haven").

## Doel

1. Alle user-facing teksten in het Nederlands (één taal).
2. Conditionele/eerlijke teksten: Sheets-banner afhankelijk van `isSheetsConnected`,
   Groq-badge afhankelijk van `hasGroqKey`.
3. Correcte tijden/labels: Griekse lokale tijd, kloppende tab-titels, kloppende
   dag-telling.
4. Niet-functionele settings eerlijk labelen ("binnenkort") of verwijderen.

## Betrokken bestanden

- `src/components/QuickHelpView.tsx` — teksten naar NL; "Local Time in Cyclades" via
  `Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' })`.
- `src/components/SupportView.tsx` — teksten naar NL.
- `src/components/SettingsView.tsx` — teksten naar NL; GROQ-badge conditioneel
  (`hasGroq`-state uit `/api/ai/status`); niet-functionele toggles als "binnenkort"
  labelen of verwijderen (kies labelen + `disabled`, kleinste impact).
- `src/components/TopHeader.tsx` — titel-mapping uitbreiden met `settings`, `profile`,
  `support` (en evt. `not-found`).
- `src/components/MyItineraryView.tsx` — Sheets-banner conditioneel maken;
  durationDays-tekst controleren (zie hieronder).
- `src/App.tsx` — default `durationDays` corrigeren naar 9 (of berekenen uit stays);
  `handleOpenNewTripModal`-melding indien gewenst aanscherpen.
- `src/components/LoginView.tsx` — zin "locaties te beheren" vervangen door wat echt
  kan: "reisschema's bewerken, boekingen toevoegen en synchroniseren".
- `src/components/Modals/ShareModal.tsx` — alleen als daar nog EN-teksten staan.
- `src/components/Modals/MissedFerryModal.tsx`, `AddBookingModal.tsx`,
  `TranslateMenuModal.tsx`, `EditStayModal.tsx`, `NewTripModal.tsx` — grep op Engelse
  user-facing teksten en vertalen (NewTripModal is al NL; check de rest).
- `server.ts` — typo "Hawen" → "Haven" (suggest-hotels data).
- `src/components/ChatInterfaceView.tsx` — subtabs al deels NL op mobiel;
  desktop-labels "Current Chat/History/Favorites" gelijktrekken met
  "Chat/Geschiedenis/Favorieten".

## Uitwerking

### Vertalingen (QuickHelpView als voorbeeld)

- Header: "Directe Hulp" / "Hoe kan ik je helpen, reiziger?"
- Intro: "Athena staat voor je klaar om je Griekse odyssee soepel te laten verlopen.
  Kies een urgente taak of beschrijf je situatie."
- Kaarten: "Ik heb mijn veerboot gemist", "Vertaal dit menu", "Een taverne in de
  buurt aanraden", "Zoek een rustig strand".
- Tags: "AUTHENTIEK", "OP LOOPAFSTAND", "AFGELEGEN", "NATUURLIJK".
- Knoppen: "Bel taxi", "Noodnummer (112)", "Apotheek in de buurt", "Open Camera" →
  "Camera openen".
- Tijdlabel: "Lokale tijd op de Cycladen" + `Europe/Athens`-berekening.
- Keep the tone warm/concierge, geen letterlijke Google-vertaling.

### Sheets-banner (MyItineraryView)

- `isSheetsConnected === true`:
  - badge: "Actief & Gekoppeld"; tekst: "Wijzigingen worden opgeslagen in je Google Sheet."
- niet gekoppeld:
  - badge: "Niet gekoppeld"; tekst: "Wijzigingen worden nu alleen lokaal bewaard.
    Koppel Google Sheets om de reis te synchroniseren en te delen."
  - knop "Koppelen & Synchroniseren" blijft (bestaat al).

### SettingsView

- GROQ-badge: `hasGroq ? 'GROQ ACTIEF' : 'GROQ NIET BESCHIKBAAR'` met bijbehorende
  kleuren (groen/oranje vs grijs). Fallback bij laadfout: neutrale badge
  "Status onbekend".
- "Ferry Delay & Gate Alerts" → subtekst "(binnenkort)" en checkbox disabled.
- "Default Language" → label "Taal" met badge "Nederlands"; subtekst
  "Vertalingen Engels/Grieks beschikbaar in de chat."

### DurationDays

- `defaultTrip.durationDays` op 9 zetten (15–23 aug = 9 dagen) óf, beter, overal
  afleiden: `stays`-nachten + 1. Kies de consistente aanpak: toon in MyItineraryView
  `totalNights + 1` (afgeleid) i.p.v. het opgeslagen veld, en fix de default-waarde.

### TopHeader

- Mapping uitbreiden:
  - `settings` → "Instellingen", `profile` → "Mijn Profiel", `support` → "Support",
    `not-found` → "Niet gevonden".

### LoginView

- "Log in als accountbeheerder om reisschema's te bewerken, locaties te beheren en te
  synchroniseren." → "Log in om reisschema's te bewerken, boekingen toe te voegen en
  wijzigingen te synchroniseren."
- "Gastmodus is uitsluitend om de reis te bekijken..." blijft (klopt).

## Acceptatiecriteria

- [ ] `grep -rn "How can I help\|missed my ferry\|Find a quiet\|Call Taxi\|Pharmacy\|Immediate Assistance" src/` → 0 hits.
- [ ] SupportView volledig NL (kaarttitels, beschrijvingen).
- [ ] TopHeader toont "Instellingen"/"Mijn Profiel"/"Support" op de juiste tabs.
- [ ] Sheets-banner toont verschillende teksten bij gekoppeld vs niet gekoppeld.
- [ ] "Lokale tijd op de Cycladen" toont Europe/Athens-tijd (controleer tegen echte
      Griekse tijd; ±1 min ok).
- [ ] GROQ-badge wisselt correct op basis van `/api/ai/status` (test: tijdelijk
      `hasGroqKey` false simuleren door de fetch te mocken of de endpoint-reactie te
      bekijken).
- [ ] "8 Dagen Odyssey" is vervangen door de correcte 9 (of afgeleide waarde).
- [ ] `server.ts`: geen "Hawen" meer.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → alle tabs doorlopen: Quick Help, Support, Settings, Chat (desktop-
   subtabs), Login, Itinerary.
2. Grep-checks uit de acceptatiecriteria draaien.
3. Tijd-check: vergelijk "Lokale tijd op de Cycladen" met actuele Griekse tijd
   (zomer: UTC+3).

## Git-workflow

1. Branch vanaf verse `main`: `step/06-taal-teksten`.
2. Commits, bijv.:
   - `style(help): translate QuickHelpView to Dutch`
   - `style(support): translate SupportView to Dutch`
   - `style(settings): Dutch labels + conditional GROQ badge`
   - `fix(ui): tab titles, sheets banner states, Athens local time`
   - `fix(data): correct trip duration and server typo`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Volledige i18n met taalwissel (NL/EN/GR) — niet gepland; NL wordt de enige UI-taal.
- Nieuwe AI-dagplannen per dag — aparte toekomstige feature.
