# Step 17 — Vandaag-knop 24u-regel + Tijdlijn-pagina (Instagram-stijl)

## Probleem

1. De "Vandaag"-knop (Reisdagboek in Mijn Reis) toont bij afwezigheid van foto's
   van vandaag een **fallback naar de meest recente dag**. Een foto van 21 augustus
   verschijnt daardoor op 23 augustus nog steeds onder "Vandaag". Daarnaast gebruikte
   de vergelijking `toISOString()` (UTC), wat tussen 00:00–02:00 NL-tijd de verkeerde
   kalenderdag pakt.
2. Er is geen plek waar **alle** gedeelde Reisdagboek-foto's als één doorrollende
   tijdlijn bekeken kunnen worden (zoals een Instagram-feed).

## Doel

- **A.** De Vandaag-knop (header + zwevend) toont alleen foto's die **minder dan
  24 uur geleden geplaatst** zijn (op `CreatedAt`). Zonder recente foto's verdwijnen
  de knoppen volledig. Oude foto's blijven zichtbaar in het Reisdagboek-grid.
- **B.** Nieuwe pagina **"Tijdlijn"**: stories-tray (cirkel per dag, tik = fullscreen)
  + verticale feed van kaarten (auteur, relatieve tijd, eiland, foto 4:5, bijschrift,
  datum). Zichtbaar voor ingelogden én gasten (reiscode); verwijderen alleen voor
  admins. Hergebruik van het bestaande `StoriesModal` (nieuw: optionele `startIndex`).

Visualisatie-first: de goedgekeurde mockup staat in
`docs/mockups/step-17-tijdlijn-mockup.html` (statisch, zelfstandig te openen).

## Betrokken bestanden

### Deel A (bugfix)

- `src/components/MyItineraryView.tsx`:
  - Nieuwe module-helpers `DAY_MS` en `localDateString()` (lokale tijd i.p.v. UTC).
  - `storiesDayPhotos`/`showStoriesButton` op basis van `createdAt` < 24u;
    fallback op kalenderdatum alleen als `CreatedAt` ontbreekt (oude rijen).
  - Geen fallback meer naar "meest recente dag"; knop-titeltekst aangepast.

### Deel B (nieuwe pagina)

- `src/types.ts` — `'tijdlijn'` toegevoegd aan `ActiveTab`.
- `src/components/TijdlijnView.tsx` — **nieuw**: pagina-header met tellers
  (momenten/eilanden), stories-tray per dag (amber-ring + puls = <24u, blauw = ouder),
  verticale feed (nieuwste eerst op `createdAt`), NIEUW-badge <24u, relatieve tijden
  in het Nederlands, verwijder-optie voor `canEdit`, lege state.
- `src/components/Modals/StoriesModal.tsx` — optionele `startIndex`-prop zodat een
  tik op een feed-foto de viewer op die foto opent.
- `src/components/Sidebar.tsx` — nav-item "Tijdlijn" (icoon Camera) voor
  `isAuthenticated` (incl. gasten).
- `src/components/TopHeader.tsx` — nav-entry "Tijdlijn" naast "Mijn Reis" + titel-mapping.
- `src/App.tsx` — render `<TijdlijnView>` bij `activeTab === 'tijdlijn'` met props
  `dayPhotos`, `currentUser`, `isGuestMode`, `onBack`, `onDeleteDayPhoto`.

Geen backend-wijzigingen: `GET /api/dayphotos` is al open en bevat `CreatedAt`.

## Acceptatiecriteria

- [ ] Foto geplaatst binnen 24 uur → Vandaag-knoppen zichtbaar en tonen die foto('s).
- [ ] Nieuwste foto ouder dan 24 uur → géén Vandaag-knop (header noch zwevend).
- [ ] Foto van 21 aug is op 23 aug niet meer onder "Vandaag" te zien.
- [ ] Tijdlijn-pagina bereikbaar via Sidebar (desktop) en TopHeader (mobiel),
      ook voor gasten met reiscode.
- [ ] Tray-cirkel opent de fullscreen viewer met alle foto's van die dag.
- [ ] Tik op een feed-foto opent de viewer op precies die foto.
- [ ] Admins kunnen foto's vanuit de Tijdlijn verwijderen (met bevestiging).
- [ ] `npm run lint` en `npm run test` slagen.
