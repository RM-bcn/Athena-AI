# Step 16 — Mobiele responsive polijsting (touch-targets, tablet-gat, paddings)

## Probleem

Na step 15 (kritieke overflows/onbereikbare modals) blijven er verfijningen over
die de mobiele ervaring verbeteren maar niets kapot maken:

1. **Te kleine touch-targets**: veel actieknoppen/icon-knoppen zijn 22–36px hoog
   (richtlijn: ≥40px).
2. **"Tablet-gat" 768–1023px**: de sidebar neemt vanaf `md:` (768px) 256px vast
   in (`md:ml-64` overal), terwijl multi-kolom layouts al op `md:` schakelen.
   Daardoor staan kaarten daar extreem geplet (LoginView 2 kolommen,
   SupportView 3 kolommen, QuickHelpView bento-kolommen).
3. **Ruime vaste paddings** (p-8, p-6) waar op mobiel p-4 mooier is.
4. **Kleine grid- en footer-fixes** in modals (grid-cols-2 klapt niet terug,
   footers zonder flex-wrap).
5. **Kleine cosmetische issues**: StoriesModal-dots te breed bij veel foto's,
   chat scroll-reserve onder input-balk te krap met bijlage, lange placeholders,
   een kapotte font-classname, zwevende "Vandaag"-knop overlapt content.

## Doel

Na deze stap voelt de app op 375px "af" aan: alles bedienbaar (≥40px targets),
geen geplette layout op tablets, consistente paddings. Alleen classname-/
JSX-wijzigingen; geen logica, geen nieuwe dependencies.

## Algemene instructies

- Bestand voor bestand; elk blok = eigen commit.
- Zoek de classname-string met zoeken; regelnummers zijn hints (±5 regels).
- Wijzig ALLEEN wat hier staat.
- `npm.cmd run lint` + `npm.cmd run test` vóór de laatste commit (tests raken
  geen CSS; visuele check is handmatig in de browser).

---

## Blok 1 — Touch-targets (alle knoppen ≥ ~40px)

### 1a. `src/components/ChatInterfaceView.tsx`
- Regels 329 en 338 (export- en favoriet-knop): `p-1` → `p-2`; icon
  `w-3.5 h-3.5` → `w-4 h-4`.
- Regel 486 (verwijder-bijlage): `p-1` → `p-2`.
- Regels 436/445/453/461/469 (quick-action chips): `px-4 py-2` → `px-4 py-2.5`.

### 1b. `src/components/TripRequestsView.tsx`
- Regel 127 ("Verblijven tonen"): `px-3 py-1.5` → `px-3 py-2.5`.
- Regels 139 en 147 (Goedkeuren/Afkeuren): `px-4 py-2` → `px-4 py-2.5`.
- Regels 172 en 179 (Annuleren/Bevestig): `py-1.5` → `py-2.5`.

### 1c. `src/components/ProfileView.tsx`
- Regel 208 (camera-knop avatar): `w-9 h-9` → `w-10 h-10`.

### 1d. `src/components/LoginView.tsx`
- Regel 629 (modal-sluitknop): `p-1.5` → `p-2`.
- Regels 567/524/588 (tekstknoppen "Wachtwoord vergeten?", "Terug naar
  inloggen", "Word lid"): voeg `py-2` toe (knoppen worden groter tiklbaar).

### 1e. `src/components/SettingsView.tsx`
- Regel 85 (checkbox): `w-5 h-5` → `w-6 h-6`.

---

## Blok 2 — Tablet-gat: multi-kolom pas vanaf `lg:`

### 2a. `src/components/LoginView.tsx` (regel 367)

Zoek: `grid md:grid-cols-2 gap-8 items-stretch`

Vervang door: `grid lg:grid-cols-2 gap-8 items-stretch`

### 2b. `src/components/SupportView.tsx` (regel 20)

Zoek: `grid grid-cols-1 md:grid-cols-3 gap-6`

Vervang door: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

(en op de kaarten met e-mail/telefoon: voeg `break-words` toe aan de
link-elementen, zoek op `concierge@athena-ai.studio`)

### 2c. `src/components/QuickHelpView.tsx`

Vervang alle `md:col-span-8`, `md:col-span-4`, `md:col-span-6` door
`lg:col-span-8`, `lg:col-span-4`, `lg:col-span-6` (regels ~82, 120, 145, 177).
Vervang `md:flex-row` → `lg:flex-row` (regel ~84) en `md:w-1/3` → `lg:w-1/3`
(regel ~100). Geef de knop "Vertrek oplossen" (regel ~100) `px-4 text-xs
lg:px-6 lg:text-sm`.

### 2d. `src/components/NotFoundView.tsx` (regel 70)

Zoek: `grid grid-cols-1 md:grid-cols-3 gap-3`

Vervang door: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`

---

## Blok 3 — Paddings: p-6/p-8 → p-4 sm:p-6 / p-6 md:p-8

### 3a. `src/components/MyItineraryView.tsx`
- Regel 679 (stay-kaart): `p-6` → `p-4 sm:p-6`.
- Regels 893/1084/1163 (panels rechts + reisdagboek): `p-6 pt-0`/`p-6 pt-4` →
  `p-4 sm:p-6 pt-0`/`p-4 sm:p-6 pt-4` (behoud de pt-waarde die er al staat).
- Regel 910: `p-6 pt-4 space-y-4` → `p-4 sm:p-6 pt-4 space-y-4`.
- Regel 516 (verblijfsplanning-banner): `p-6` → `p-4 sm:p-6`.

### 3b. `src/components/WeatherCard.tsx` (regel 187)
- `p-6` → `p-4 sm:p-6` (banner-variant; pas op: niet de floating-variant
  met `hidden xl:block` wijzigen).

### 3c. `src/components/Modals/MissedFerryModal.tsx` (regel 59)
- `p-8` → `p-6 md:p-8`.

---

## Blok 4 — Kleine grid- en footer-fixes

### 4a. `src/components/Modals/EditStayModal.tsx` (regel 121)

Zoek: `grid grid-cols-2 gap-3` (datumvelden)

Vervang door: `grid grid-cols-1 sm:grid-cols-2 gap-3`

### 4b. `src/transport/TransportSidebarCard.tsx` (regels 276 en 318)

Twee keer: `grid grid-cols-2 gap-2` → `grid grid-cols-1 sm:grid-cols-2 gap-2`

### 4c. `src/components/Modals/AddBookingModal.tsx` (regel 451, footer)

Zoek: `<div className="pt-4 flex items-center justify-between gap-3">`

Vervang door: `<div className="pt-4 flex flex-wrap items-center justify-between gap-3">`

### 4d. `src/components/Modals/MissedFerryModal.tsx` (regel 207)

Zoek: `p-4 bg-[#f0f4f9] rounded-2xl flex items-center justify-between gap-3`

Vervang door: `p-4 bg-[#f0f4f9] rounded-2xl flex flex-wrap items-center justify-between gap-3`

### 4e. `src/components/Modals/ShareModal.tsx` (regel 83, gebruikersrij)

Zoek: `p-3 bg-[#f0f4f9] rounded-xl flex items-center justify-between`

Vervang door: `p-3 bg-[#f0f4f9] rounded-xl flex flex-wrap items-center justify-between gap-2`

### 4f. `src/components/Modals/DayPlanEditorModal.tsx` (regels 310-319, tijd-input)

Zoek: `<div className="relative flex-shrink-0">` (de wrapper van de time-input)

Vervang door: `<div className="relative w-full sm:w-auto sm:flex-shrink-0">`

en op de input erin (zoek `type="time"` met `pl-8 pr-2 py-2.5`) voeg toe:
`w-full sm:w-auto`

### 4g. `src/components/Modals/StoriesModal.tsx` (regel 132, dots)

Zoek de progress-dots-rij: `absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5`

Vervang door: `absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[55vw] overflow-hidden`

en beperk het aantal getoonde dots tot max. 8 (slice op de array waar de
dots gemapt worden; patroon: `photos.slice(0, 8).map(...)` — als er al een
slice bestaat, wijzig de limiet naar 8).

---

## Blok 5 — Overige verfijningen

### 5a. `src/components/ChatInterfaceView.tsx` (regel 399, scroll-reserve)

Zoek: `pb-40 md:pb-44`

Vervang door: `pb-56 md:pb-44`

### 5b. `src/components/LoginView.tsx` (regel 395-396, reiscode-placeholder)

Zoek: `placeholder="Voer reiscode in (bijv. ATH-2026)"`

Vervang door: `placeholder="Reiscode (bijv. ATH-2026)"`

en verwijder `tracking-widest` van die input (laat `uppercase` staan).

### 5c. `src/components/MyItineraryView.tsx` (regel 520, kapotte font-class)

Zoek: `font-[#Plus_Jakarta_Sans']` (let op de apostrof vóór het sluithaakje)

Vervang door: `font-['Plus_Jakarta_Sans']`

### 5d. `src/components/MyItineraryView.tsx` (regel 1258, "Vandaag"-knop)

Zoek: `fixed bottom-6 right-6 z-40 px-5 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500`

Vervang door: `fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500`

### 5e. `src/components/Sidebar.tsx` (regel 52, aside)

Zoek: `h-screen w-64 fixed left-0 top-0 bg-white flex flex-col p-4`

Vervang door: `h-screen w-64 fixed left-0 top-0 bg-white flex flex-col p-4 overflow-y-auto`

(zodat het menu in landscape-telefoons scrollt i.p.v. knipt)

### 5f. `src/components/SettingsView.tsx` (regel 99, AI-engine-rij)

Zoek: `flex items-center justify-between p-4 rounded-xl bg-orange-50/50 border border-orange-200/60`

Vervang door: `flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 rounded-xl bg-orange-50/50 border border-orange-200/60`

en op de titelrij binnenin (regel ~105, `flex items-center gap-2`):
`flex items-center gap-2` → `flex flex-wrap items-center gap-2`.

### 5g. `src/components/ProfileView.tsx` (regel 337, Opslaan-knop)

Zoek: de footer `<div className="flex justify-end pt-2 border-t border-[#f0f4f9]">`

Vervang door: `<div className="flex justify-end pt-2 border-t border-[#f0f4f9]">`
en geef de knop erin `w-full sm:w-auto` (knop is full-width op mobiel).

---

## Acceptatiecriteria

- [ ] Alle interactieve knoppen in chat, reis-aanvragen, login en profile zijn
      ≥ ~40px hoog (handmatig visueel checken op 375px).
- [ ] Op 768–1024px staan LoginView en QuickHelpView in één kolom (niet
      geplet); SupportView 2 kolommen en op ≥1024px 3.
- [ ] Modals tonen nette mobiele paddings (p-4/p-6) en alle footers wrappen.
- [ ] StoriesModal met 15 foto's: dots blijven binnen het scherm (max 8 dots).
- [ ] "Vandaag"-knop overlapt geen content meer op 375px.
- [ ] Sidebar scrollt in landscape (568px hoogte).
- [ ] De font-typo is weg en alle titels renderen in Plus Jakarta Sans.
- [ ] `npm run lint` en `npm run test` slagen.
- [ ] Geen nieuwe packages; geen logica gewijzigd.

## Verificatie (lokaal)

1. `npm run dev` → DevTools responsive mode.
2. 375×667: alle tabs + modals; check touch-grootte en paddings.
3. 768×1024 (iPad-portret): LoginView/QuickHelpView 1 kolom, SupportView 2.
4. 320×568: sidebar in landscape scrollt; modals scrollen (van step 15).
5. 1440px desktop: layout onveranderd.
6. Gastmodus `?code=ATH-2026`: "Vandaag"-knop en timeline netjes.

## Git-workflow

1. Branch vanaf verse `main`: `step/16-mobiel-responsive-polijsting`.
2. Commits, bijv.:
   - `fix(ui): enlarge touch targets across views`
   - `fix(ui): switch multi-column layouts from md to lg breakpoint`
   - `fix(ui): responsive paddings on cards and modals`
   - `fix(ui): wrap modal footers and fix small grids`
   - `fix(ui): stories dots, chat scroll reserve, floating button and misc`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Dark mode, animatie-reductie, toegankelijkheid (WCAG) — aparte stap.
- Nieuwe layout-ideeën (bv. bottom-nav i.p.v. hamburger) — overleg eerst.
