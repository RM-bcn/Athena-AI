# Step 19 — Foto plaatsen vanaf Tijdlijn + S24-responsiveness

## Probleem

1. De nieuwe **Tijdlijn**-pagina (stap 17) heeft geen eigen manier om een foto te
   plaatsen: je moet terug naar Mijn Reis. Inglogde gebruikers willen op de Tijdlijn
   direct een foto **uploaden of met de camera maken** (voor- én achtercamera).
2. Op een Samsung Galaxy S24 (viewport 360×780 CSS-px) klopt de uitlijning niet:
   - de mobiele terug-balk van de Tijdlijn staat bij scroll-top *achter* de vaste
     TopHeader;
   - de OfflineBanner rekent op een header-hoogte van 52px terwijl de echte header
     mobiel ~60–64px is, dus sluit hij niet aan;
   - de TopHeader wordt krap op 360px;
   - de feed-kaart-header (auteur + tijd + NIEUW + prullenbak) kan overflowen;
   - de StoriesModal-pijlen overlappen de foto op smalle schermen.
   Stap 15/16 fixte al touch-targets, het tablet-gat en paddings (doelwit 375px +
   tablet) — deze stap is een verse audit/fix specifiek op 360px.

## Doel

- **A.** "Foto toevoegen"-knop op de Tijdlijn (alleen ingelogd) die de bestaande
  upload-modal opent, met keuze uit galerij + voorcamera + achtercamera.
- **B.** Geen horizontale scroll op 360px op geen enkele tab; header/terug-balk/
  banner/feed uitlijning gecorrigeerd.

Uitgesteld (stap 20+): GPS-locatiekeuze, Tijdlijn/Story-type-keuze, story-archief.

## Betrokken bestanden

### Deel A — upload vanaf Tijdlijn

- `src/components/TijdlijnView.tsx`:
  - Props uitbreiden met `onAddDayPhoto` en `onGenerateCaption` (handlers bestaan al
    in `App.tsx`).
  - "Foto toevoegen"-knop in de pagina-header, zichtbaar alleen voor `canEdit`
    (`!!currentUser && !isGuestMode`).
  - Eigen `ReisdagboekUploadModal`-instantie + `isReisdagboekUploadOpen`-state
    (patroon als in `MyItineraryView`). Na opslaan vult de feed/tray automatisch via
    de `dayPhotos`-prop (App state update bestaat al).
- `src/components/Modals/ReisdagboekUploadModal.tsx`:
  - Drie invoer-opties i.p.v. één: "Kies een foto" (bestaand `image/*`-input),
    "Camera achter" (`input accept="image/*" capture="environment"`),
    "Camera voor" (`input accept="image/*" capture="user"`).
  - Cameraknoppen alleen zichtbaar op touch-apparaten (`window.matchMedia('(pointer: coarse)').matches`),
    zodat desktop niet drie identieke knoppen krijgt. Alle inputs delen dezelfde
    `handleFileSelect`/`compressImage`-pipeline.
  - Knoppen ≥40px touch-target (richtlijn stap 16).
- `src/App.tsx`: `onAddDayPhoto={handleAddDayPhoto}` en
  `onGenerateCaption={handleGenerateCaption}` doorgeven aan `<TijdlijnView>`.

### Deel B — S24-responsiveness

- **Stap 0 — audit**: Playwright op 360×780 over login, gast-itinerary, tijdlijn,
  chat, quick-help, settings, support + modals; automatische horizontale-overflow-
  check (`document.documentElement.scrollWidth <= innerWidth`). Voor/na-screenshots
  in de PR.
- **Fixes** (alleen classname/JSX, per bestand een commit):
  - `TijdlijnView.tsx`: mobiele terug-balk krijgt een header-offset (`pt-[64px]` op
    de pagina of `top-[64px]` + eigen ruimte); feed-kaart-header `min-w-0`/`flex-wrap`
    + tijd `truncate`.
  - `OfflineBanner.tsx`: header-hoogte gelijktrekken met `TopHeader`
    (`top-[64px] md:top-[68px]` of gedeelde constante).
  - `TopHeader.tsx`: `min-w-0`/`truncate` op titel + badges; Gastmodus-badge
    eventueel verbergen onder ~400px (`max-[400px]:hidden`).
  - `StoriesModal.tsx`: pijl-knoppen op mobiel compacter/onderaan plaatsen zodat ze
    de foto niet overlappen.
  - `MyItineraryView.tsx` / grids: alleen controleren, geen wijziging tenzij nodig.

## Acceptatiecriteria

- [x] Ingelogd: "Foto toevoegen" op de Tijdlijn opent de modal; upload én beide
      camera's werken; nieuwe foto verschijnt direct in tray + feed.
- [x] Gasten zien de knop niet.
- [x] Geen horizontale scroll op 360px op geen enkele tab; terug-knop zichtbaar;
      banner sluit aan op de header.
- [x] `npm run lint` + `npm run test` slagen; voor/na-screenshots in de PR; na
      merge live op Vercel.
