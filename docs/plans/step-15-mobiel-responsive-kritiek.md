# Step 15 — Mobiele responsiveness: kritieke fixes (content buiten scherm / onbereikbaar)

## Probleem

Op mobiel (375px breedte, 568–667px hoogte) vallen diverse functies buiten het
scherm of zijn onbereikbaar:

1. **Vijf modals knippen hun bovenkant af**: de container centreert de kaart
   verticaal (`flex items-center justify-center` + `overflow-y-auto`), maar de
   kaart zelf heeft geen `max-h`/eigen scroll. Bij een hoge kaart steekt de
   bovenkant (incl. sluitknop) boven de scrollcontainer uit en is onbereikbaar.
2. **Vier andere modals hebben helemaal geen scroll** — onderkant (knoppen)
   onbereikbaar op kleine schermen.
3. **Timeline op de kaart** knipt stops af bij 3+ eilanden (parent heeft
   `overflow-hidden`, stops zijn `flex-shrink-0`).
4. **Knoppengroep in stay-header** (Bewerken/hotelnaam/Vraag Athena/Dagplanning
   bewerken) loopt uit de pagina.
5. **Hero-knoppen** (Deelcode/Afdrukken) en **sheets-banner-knoppen** zitten op
   de rand / lopen net over.
6. **TopHeader** overloopt in gastmodus (hamburger + titel + "Gastmodus (code)"
   badge + Inloggen-knop).
7. **Chatbubbles** breken lange woorden/URLs niet (`whitespace-pre-line` zonder
   `break-words`); quickButtons-rij wrap niet.
8. **SettingsView** profiel-header loopt buiten de kaart (e-mail zonder truncate).
9. **QuickHelpView** badge-rijen (AUTHENTIEK / OP LOOPAFSTAND) steken buiten
   hun kaarten.

Belangrijk: `App.tsx:1546` heeft `overflow-x-hidden` op de root — uitlopende
content geeft dus géén scrollbar maar valt stilletjes buiten beeld. Daarom
zijn deze issues onzichtbaar op desktop en alleen op mobiel storend.

## Doel

Alle functionaliteit bereikbaar en binnen het scherm houden op 375px, zonder
de desktop-layout te veranderen. Alleen classname-wijzigingen (geen logica,
geen nieuwe dependencies).

## Algemene instructies

- Werk bestand voor bestand. Elk hieronder beschreven blok is een atomische
  commit waard.
- Zoek de genoemde classname-string op met de zoekfunctie; gebruik de
  regelnummers als hint (ze kunnen ±5 regels afwijken).
- Wijzig ALLEEN wat hier staat. Geen refactoring.
- Check na afloop: `npm.cmd run lint` (tsc) en `npm.cmd run test`.
  De tests raken geen CSS; visuele verificatie = handmatig in de browser
  (375px, zie "Verificatie").
- UI-teksten blijven Nederlands; geen comments toevoegen.

---

## Blok 1 — Modals: scrollbaar maken (kritiek patroon)

**Patroon:** voeg `max-h-[90vh] overflow-y-auto` toe aan de modal-KAART
(de binnenste div, niet de container). Zo is de kaart altijd volledig
scrollbaar en blijft de sluitknop (`absolute top-6 right-6`) bereikbaar.

### 1a. `src/components/Modals/AddBookingModal.tsx` (regel 229)

Zoek: `bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200`

Vervang door: `bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto`

### 1b. `src/components/Modals/NewTripModal.tsx` (regel 147)

Zoek: `bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-8 animate-in fade-in zoom-in duration-200`

Vervang door: dezelfde string + ` max-h-[90vh] overflow-y-auto` (vóór `animate-in` is niet belangrijk, plak het achter `duration-200`).

### 1c. `src/components/Modals/ReisdagboekUploadModal.tsx` (regel 176)

Zoek: `bg-white rounded-[28px] max-w-xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200`

Vervang door: dezelfde string + ` max-h-[90vh] overflow-y-auto` achteraan.

### 1d. `src/transport/TransportBookingModal.tsx` (regel 88)

Zoek: `bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200`

Vervang door: dezelfde string + ` max-h-[90vh] overflow-y-auto` achteraan.

### 1e. `src/transport/TransportDetailPopup.tsx` (regel 97)

Zoek: `bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200`

Vervang door: dezelfde string + ` max-h-[90vh] overflow-y-auto` achteraan.

### 1f. `src/components/Modals/EditStayModal.tsx` (regel 86)

Zoek: `bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#005BAE]/20 relative`

Vervang door: `bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#005BAE]/20 relative max-h-[90vh] overflow-y-auto`

### 1g. `src/components/Modals/ShareModal.tsx` (regel 37)

Zoek: `bg-white rounded-[28px] max-w-lg w-full p-8 shadow-2xl border border-[#005BAE]/20 relative animate-in fade-in zoom-in duration-200 font-['Plus_Jakarta_Sans']`

Vervang door: `bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative animate-in fade-in zoom-in duration-200 font-['Plus_Jakarta_Sans'] max-h-[90vh] overflow-y-auto`

### 1h. `src/components/Modals/TranslateMenuModal.tsx` (regel 74)

Zoek: `bg-white rounded-[28px] max-w-xl w-full p-8 shadow-2xl border border-[#005BAE]/20 relative animate-in fade-in zoom-in duration-200`

Vervang door: `bg-white rounded-[28px] max-w-xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto`

### 1i. `src/components/LoginView.tsx` (regel 622, "Wachtwoord Herstellen"-modal)

Zoek: `bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative text-[#0B1D2D]`

Vervang door: `bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative text-[#0B1D2D] max-h-[90vh] overflow-y-auto`

---

## Blok 2 — Timeline op de kaart: scrollbaar i.p.v. afgeknipt

### 2a. `src/components/MyItineraryView.tsx` (regel 623)

Zoek: `<div className="absolute inset-x-0 bottom-0 p-6">`

Vervang door: `<div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 overflow-x-auto no-scrollbar">`

(`no-scrollbar` is een bestaande utility in `src/index.css`.)

### 2b. `src/components/MyItineraryView.tsx` (regel 624)

Zoek: `<div className="flex justify-between items-center max-w-4xl mx-auto gap-4">`

Vervang door: `<div className="flex items-center max-w-4xl mx-auto gap-4 min-w-max sm:min-w-0 sm:justify-between">`

### 2c. `src/transport/TransportRouteConnector.tsx` (regels 56 en 96)

Twee keer komt voor: `flex-1 min-w-[50px] h-[2px]`

Vervang beide door: `flex-1 min-w-[50px] h-[2px] w-[50px] sm:w-auto`

(vaste breedte op mobiel zodat `min-w-max` klopt; desktop gedrag blijft gelijk)

### 2d. `src/transport/TransportRouteConnector.tsx` (regel 76-82, het tijdslabel)

Zoek in de label-classname: `whitespace-nowrap`

Voeg daar vóór toe: `hidden sm:inline-block max-w-[90px] truncate ` en verwijder `whitespace-nowrap` (het label mag op mobiel weg; op sm+ truncated).

---

## Blok 3 — Stay-header knoppengroep (`src/components/MyItineraryView.tsx`)

### 3a. Regel 700

Zoek: `<div className="flex items-center gap-2">` direct ná de datumregel
van de stay-header (de div die de knoppen Bewerken/hotelnaam/Vraag Athena/
Dagplanning bewerken bevat; ter onderscheid: hij staat ná de div met
`Verblijf in {stay.island}`).

Vervang door: `<div className="flex flex-wrap items-center gap-2">`

### 3b. Hotelnaam-knop (regel 715-721)

Zoek: de knop met classname
`text-xs font-['Inter'] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1`

Vervang door: zelfde string + ` max-w-full` en verpak de inhoud
`{linkInfo.matchedBooking.name}` in een span:
`<span className="truncate max-w-[160px]">{linkInfo.matchedBooking.name}</span>`

---

## Blok 4 — Hero-knoppen en sheets-banner (`src/components/MyItineraryView.tsx`)

### 4a. Regel 496 (Deelcode / Afdrukken-PDF)

Zoek: `<div className="flex gap-3 flex-shrink-0">`

Vervang door: `<div className="flex flex-wrap gap-3">`

### 4b. Sheets-banner knoppen (rond regel 421)

Zoek in de sheets-banner de rij met knoppen "Sync nu" / "Open Google Sheet":
`flex items-center gap-2` (binnen de banner; uniek te herkennen aan de knop-tekst "Sync nu" ernaast).

Vervang door: `flex flex-wrap items-center gap-2`

---

## Blok 5 — Dagkaart-header (`src/components/MyItineraryView.tsx`, regels 784-809)

### 5a. Regel 784

Zoek: `<div className="flex justify-between items-start">` in de dagkaart
(de div met daarin de "DAG X"-badge en de titel-h4).

Vervang door: `<div className="flex flex-wrap justify-between items-start gap-2">`

### 5b. De "DAG X"-badge (regel 786)

Zoek: `px-3 py-1 rounded-full bg-[#005BAE] text-white font-['Inter'] font-semibold text-xs`

Vervang door: `px-3 py-1 rounded-full bg-[#005BAE] text-white font-['Inter'] font-semibold text-xs whitespace-nowrap`

### 5c. De titel-h4 (regel 789)

Zoek: `<h4 className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">`

Vervang door: `<h4 className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d] min-w-0 break-words">`

---

## Blok 6 — TopHeader (`src/components/TopHeader.tsx`)

### 6a. Regel 36 (header zelf)

Zoek: `fixed top-0 left-0 md:left-64 right-0 flex justify-between items-center px-4 md:px-8 py-3 md:py-4 bg-white/90 backdrop-blur-xl z-40 border-b border-[#f0f4f9]`

Vervang door: `fixed top-0 left-0 md:left-64 right-0 flex justify-between items-center gap-2 px-4 md:px-8 py-3 md:py-4 bg-white/90 backdrop-blur-xl z-40 border-b border-[#f0f4f9]`

### 6b. Regel 37 (linker container)

Zoek: `<div className="flex items-center gap-3 md:gap-8">`

Vervang door: `<div className="flex items-center gap-2 md:gap-8 min-w-0 flex-1">`

### 6c. Regel 47 (titel)

Zoek: `<span className="font-['Plus_Jakarta_Sans'] text-lg md:text-2xl font-bold text-[#005BAE] truncate">`

Vervang door: `<span className="font-['Plus_Jakarta_Sans'] text-lg md:text-2xl font-bold text-[#005BAE] truncate min-w-0">`

### 6d. Regel 149 (rechter container)

Zoek: `<div className="flex items-center gap-4">`

Vervang door: `<div className="flex items-center gap-2 md:gap-4 flex-shrink-0">`

### 6e. Regel 185 (gastmodus-badge)

Zoek: `flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-amber-900 text-xs font-bold`

Vervang door: `flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-full text-amber-900 text-[11px] font-bold whitespace-nowrap`

---

## Blok 7 — Chat (`src/components/ChatInterfaceView.tsx`)

### 7a. Bubbles: `break-words` (regels 243, 616 en 675 — drie plekken)

Op drie plekken staat (zoek op): `whitespace-pre-line ${`

Voeg aan ALLE drie `break-words` toe, dus:
`whitespace-pre-line break-words ${`

(Er zijn precies drie occurrences: huidige chat-bubble, geschiedenis-bubble,
favorieten-bubble. Zoek-string: `whitespace-pre-line`.)

### 7b. QuickButtons-rij (regel 304)

Zoek: `<div className="mt-5 flex items-center gap-3">`

Vervang door: `<div className="mt-5 flex flex-wrap items-center gap-2">`

---

## Blok 8 — SettingsView (`src/components/SettingsView.tsx`)

### 8a. Regel 47 (profiel-header)

Zoek: `<div className="flex items-center justify-between gap-4 pb-6 border-b border-[#f0f4f9]">`

Vervang door: `<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#f0f4f9]">`

### 8b. Naam/e-mail-blok (regels 57-58)

Zoek: het blok met `<span className="font-['Plus_Jakarta_Sans'] font-bold text-lg ...">{currentUser.name}</span>` en daaronder de e-mail-span.

Vervang door: zelfde spans, maar op de container-div `min-w-0` toevoegen en op de e-mail-span `break-all` toevoegen. (Container is de div direct om de naam/e-mail heen; als er geen wrapper-div is, voeg dan `min-w-0 break-all` toe aan beide spans.)

---

## Blok 9 — QuickHelpView badges (`src/components/QuickHelpView.tsx`)

### 9a. Regel 162 (taverne-badges) en 9b. Regel 194 (strand-badges)

Twee plekken, beide: `<div className="flex gap-2">` met daarin badges
(`px-3 py-1 ... text-[11px] font-bold uppercase tracking-wider`).

Vervang beide door: `<div className="flex flex-wrap gap-1.5">`

---

## Acceptatiecriteria

- [ ] Op 375px viewport: geen enkele view of modal toont horizontale overflow
      die content afknipt (handmatig door alle tabs lopen).
- [ ] Alle modals zijn scrollbaar tot onderaan én tot de sluitknop bovenaan
      (test op 568px vensterhoogte, bijv. iPhone SE-formaat).
- [ ] Timeline toont alle eilanden: óf volledig zichtbaar óf horizontaal
      scrollbaar (geen afgeknipte laatste stop).
- [ ] Stay-header knoppen wrappen netjes; hotelnaam wordt afgekapt met `...`
      en knoppen blijven binnen de kaart.
- [ ] TopHeader in gastmodus toont titel, badge en Inloggen-knop zonder
      overlap (titel mag truncaten).
- [ ] Chatbubbles breken lange URL's/tokens; quickButtons wrappen.
- [ ] Desktop (≥1280px) ziet er onveranderd uit: de wijzigingen zijn
      alleen responsive toevoegingen (sm:/md:-prefixed of flex-wrap).
- [ ] `npm run lint` en `npm run test` slagen.
- [ ] Geen nieuwe packages; geen logica gewijzigd.

## Verificatie (lokaal)

1. `npm run dev`, open http://localhost:3000 in een browser.
2. DevTools → device toolbar → 375×667. Loop ALLE tabs + alle modals door
   (itinerary, chat, quick-help, settings, profile, support, requests,
   login + wachtwoord-vergeten; modals: boeking toevoegen/wijzigen, nieuwe
   reis, dagplan-editor, reisdagboek-upload, stories, share, translate,
   missed-ferry, transport toevoegen, transport-detail, stay bewerken).
3. Controleer per modal: open → scroll naar beneden → sluiten mogelijk
   (sluitknop zichtbaar of bereikbaar via scroll).
4. Herhaal bij 390×844 en 320×568.
5. Desktop-brede check: 1440px — layout ongewijzigd.
6. Gastmodus: `?code=ATH-2026` → header check (blok 6) + itinerary.

## Git-workflow

1. Branch vanaf verse `main`: `step/15-mobiel-responsive-kritiek`.
2. Commits, bijv.:
   - `fix(modals): make modal cards scrollable on small screens (max-h-90vh)`
   - `fix(itinerary): timeline scrollable instead of clipped on mobile`
   - `fix(itinerary): wrap stay-header buttons and truncate hotel name`
   - `fix(itinerary): wrap hero, sheets-banner and day-card header rows`
   - `fix(header): prevent guest-mode header overflow on mobile`
   - `fix(chat): break long words in bubbles and wrap quick buttons`
   - `fix(settings,quickhelp): wrap profile row and badge rows`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope (→ step 16)

- Touch-targets ≥ 40px, "tablet-gat" (768–1024px) bij multi-kolom layouts,
  paddings p-8→p-6, kleine grid-fixes, StoriesModal-dots, safe-area-insets.
