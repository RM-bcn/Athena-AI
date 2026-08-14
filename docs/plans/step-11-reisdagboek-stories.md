# Step 11 — Reisdagboek & "Vandaag"-stories (foto-uploads voor gasten)

## Probleem

De reis is live volgbaar voor gasten via reiscode `ATH-2026` (itinerary, read-only),
maar er is **geen visuele dagelijkse beleving**: gasten (zoals moeder) zien alleen
datums, verblijven en hotels. Ze krijgen geen idee van wat jullie dagelijks doen.
De app heeft wel Cloudinary-upload (in gebruik voor avatar-foto's,
`server/sheets-service.ts:43`) en chat-attachments, maar er is geen
foto-dagboek/verhaal-functionaliteit.

## Doel

Bouw twee aan elkaar gekoppelde features, volledig binnen de gratis stack:

- **A. Reisdagboek** — per reisdag foto's + korte tekst uploaden (owner/member);
  gasten zien de dagen als een tijdlijn met foto's.
- **B. "Vandaag"-stories** — een knop die de foto's van vandaag (of de meest
  recente dag) als fullscreen, swipebare strip toont met een automatisch
  AI-bijschrift per foto (via Groq/Gemini).

Geen nieuwe betaalde diensten: hergebruik Google Sheets (metadata), Cloudinary
(foto-opslag, gratis tier) en Groq/Gemini (bijschriften, al geconfigureerd).

## Betrokken bestanden

### Server & sheets

- `server/sheets-service.ts`:
  - Nieuw tabblad `DayPhotos` in `requiredTabs` (regel 130) en in de seed-tabs
    (`getOrCreateSpreadsheet`) + headers bij aanmaken.
  - Nieuwe functies: `addDayPhoto`, `getDayPhotos`, `deleteDayPhoto`
    (analoog aan de bestaande `TripRequests`-functies).
  - Hergebruik `uploadToCloudinary(fileInput, folder)` met een nieuwe folder
    `athena_reisdagboek` (i.p.v. `athena_avatars`). Let op: de bestaande
    avatar-upload forceert `crop: fill, gravity: face` (portret 500×500) — voor
    reisfoto's willen we dat NIET. Breid `uploadToCloudinary` uit met een optionele
    `options`-parameter, of maak een aparte `uploadTravelPhoto` zonder face-crop.
- `server.ts` — nieuwe endpoints:
  - `POST /api/dayphotos` (`requireAuth`) — upload foto + metadata.
  - `GET /api/dayphotos` (geen auth — gasten mogen lezen) — lijst met
    `{ id, date, island, caption, imageUrl, author, createdAt }`.
  - `POST /api/dayphotos/caption` (`requireAuth`) — AI-bijschrift genereren
    (Groq/Gemini) voor een geüploade foto (optioneel; kan ook client-side via de
    bestaande chat-aanpak).
  - `DELETE /api/dayphotos/:id` (`requireAuth`) — verwijderen.

### Client

- `src/types.ts` — nieuw type `DayPhoto`.
- `src/App.tsx` — state `dayPhotos`, load bij mount (voor iedereen, incl. gast),
  handlers `handleAddDayPhoto`, `handleDeleteDayPhoto`, `handleGenerateCaption`;
  doorgeven aan `MyItineraryView`.
- `src/components/MyItineraryView.tsx` — sectie "Reisdagboek" (A) + knop
  "Vandaag" (B). Bewerken (upload/verwijder) alleen voor ingelogden (`canEdit`),
  bekijken voor gasten.
- `src/components/Modals/ReisdagboekUploadModal.tsx` — (nieuw) upload-formulier:
  foto, datum (default vandaag), eiland (dropdown uit stays), tekst/bijschrift,
  knop "Genereer bijschrift met AI".
- `src/components/Modals/StoriesModal.tsx` — (nieuw) fullscreen-strip voor optie B:
  foto, bijschrift, swipe/pijlen, sluiten.
- `src/components/Modals/DeletePhotoConfirm.tsx` — optioneel klein
  bevestigingsdialoogje (of `window.confirm`, kies consistent met codebase).

## Uitwerking

### 1. Data-model

```ts
export interface DayPhoto {
  id: string;
  date: string;        // YYYY-MM-DD
  island: string;      // bv. Milos / Naxos / Koufonisia
  caption: string;     // tekst of AI-bijschrift
  imageUrl: string;    // Cloudinary secure_url
  author?: string;     // nickname
  createdAt?: string;  // ISO
}
```

### 2. Google Sheets: tabblad `DayPhotos`

- Kolommen (14 stuks past net in dezelfde A:N-stijl als TripRequests):
  `ID | Date | Island | Caption | ImageUrl | Author | CreatedAt`
- `ensureTabsExist` (regel 130) + `getOrCreateSpreadsheet`-seed (regel 249-251
  patroon) + `ensureDayPhotosHeaders` (patroon van `ensureTripRequestsHeaders`,
  regel 959) + initialisatie van de header-rij bij aanmaken.
- Functies:
  - `addDayPhoto({ date, island, caption, imageUrl, author })` → append + retour.
  - `getDayPhotos()` → alle rijen geparsed (nieuwste eerst op `CreatedAt` of `Date`).
  - `deleteDayPhoto(id)` → rij verwijderen of leegmaken (patroon van de
    TripRequests-status-update, regel 1106+).

### 3. Cloudinary

- `uploadToCloudinary` (regel 43) breidt uit met optionele transformatie-opties,
  óf nieuwe functie `uploadTravelPhoto(fileInput)` in `sheets-service.ts`:
  ```ts
  const result = await cloudinary.uploader.upload(fileInput, {
    folder: "athena_reisdagboek",
    resource_type: "image",
    transformation: [
      { width: 1200, height: 900, crop: "fill" },  // breed, geen face-crop
      { quality: "auto", fetch_format: "auto" }
    ]
  });
  return result.secure_url;
  ```

### 4. Server-endpoints (`server.ts`)

- `POST /api/dayphotos` (`requireAuth`):
  body `{ imageBase64, date, island, caption, author }` → validatie (data-URI,
  max ~5MB net als avatar) → `uploadTravelPhoto` → `addDayPhoto` →
  `{ success: true, photo }`.
- `GET /api/dayphotos` (open, gasten lezen):
  → `getDayPhotos()` → `{ success: true, photos }`.
- `POST /api/dayphotos/caption` (`requireAuth`):
  body `{ photoContext }` (bv. eiland + datum + optioneel OCR/bijschrift) →
  `callGroqAI`/Gemini om een kort, warm Nederlands bijschrift te genereren →
  `{ success: true, caption }`. Fallback bij geen AI: vriendelijke standaardtekst.
- `DELETE /api/dayphotos/:id` (`requireAuth`):
  → `deleteDayPhoto(id)` → `{ success: true }`.

### 5. Client — Reisdagboek (A)

- `MyItineraryView`: nieuwe sectie "Reisdagboek" (na de WeatherCard, rechts of
  onder de bento-grid, kies wat het best past in de layout) met:
  - titel + uitleg "Dagelijkse hoogtepunten van Dennis & Joyce";
  - per dag (gegroepeerd op `date`) kaartjes: foto-thumbnail, eiland-chip, datum,
    bijschrift; klik op foto → fullscreen (hergebruik `StoriesModal` met één foto);
  - lege-state: "Nog geen foto's — check straks onze dagelijkse hoogtepunten!"
    (voor gasten) en "Voeg vandaag je eerste foto toe" (voor ingelogden).
  - `canEdit` → uploadknop "Foto toevoegen" + per kaartje een verwijderknop.
- `ReisdagboekUploadModal`: 
  - foto via `<input type="file" accept="image/*">` + client-side compressie
    (hergebruik de `compressImage`-aanpak uit `ProfileView.tsx:28-59`, maar voor
    breed formaat i.p.v. vierkant);
  - datum (type="date", default vandaag), eiland (dropdown uit `currentTrip.stays`),
    tekst/bijschrift (optioneel);
  - knop "✨ Genereer bijschrift" → `POST /api/dayphotos/caption` → vult het
    bijschrift-veld (loading-state, fallback naar handmatig);
  - Opslaan → `POST /api/dayphotos` → close + refresh lijst.

### 6. Client — "Vandaag"-stories (B)

- `MyItineraryView` (of TopHeader, of drijvende knop zoals de oude chat-knop):
  een opvallende knop **"Vandaag"** met een kleine live-dot, alleen wanneer er
  foto's van vandaag (of de meest recente dag) bestaan.
- `StoriesModal` (fullscreen overlay):
  - toont de foto's van de gekozen dag als strip; swipe via pijlen/pijltjestoetsen
    of een simpele carrousel (geen dependency; CSS-translate is voldoende);
  - per foto: image, bijschrift onderaan, eiland-chip + datum bovenaan,
    teller "3/5", sluitknop;
  - achtergrond donker (zwart/95), foto object-contain.
- Zowel gasten als ingelogden kunnen de stories bekijken; uploaden blijft
  `canEdit`-only.

## Acceptatiecriteria

- [ ] Owner/member kan via "Foto toevoegen" een foto uploaden (datum, eiland,
      bijschrift); de foto staat na opslaan in de Google Sheet (`DayPhotos`-tab) en
      verschijnt in de Reisdagboek-sectie.
- [ ] "Genereer bijschrift met AI" vult een warm Nederlands bijschrift in
      (bij geen AI-key: vriendelijke standaardtekst, geen fout).
- [ ] Gast (via `?code=ATH-2026`) ziet het Reisdagboek met foto's en bijschriften,
      maar géén upload-/verwijderknoppen.
- [ ] De "Vandaag"-knop verschijnt wanneer er foto's van vandaag zijn; opent de
      fullscreen-strip met swipe/pijlen, bijschrift, teller en sluiten.
- [ ] Bij geen foto's: nette lege-state voor gasten en ingelogden.
- [ ] Foto's laden niet face-gecropt (geen `gravity: face` voor reisfoto's).
- [ ] Geen nieuwe packages/dependencies; geen nieuwe betaalde diensten.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → inloggen → Reisdagboek → foto uploaden → check Google Sheet
   (DayPhotos-tab) + UI.
2. Gastmodus openen (nieuw tabblad met `?code=ATH-2026`) → foto's zichtbaar,
   geen bewerk-knoppen.
3. "Vandaag"-knop testen met foto's van vandaag.
4. AI-bijschrift testen (key aanwezig in dev? dan live; anders fallback).

## Git-workflow

1. Branch vanaf verse `main`: `step/11-reisdagboek-stories`.
2. Commits, bijv.:
   - `feat(sheets): DayPhotos tab + persistence functions`
   - `feat(server): day photo upload, list, caption and delete endpoints`
   - `feat(client): Reisdagboek section with upload modal`
   - `feat(client): Vandaag stories fullscreen strip`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope (later)

- Gasten laten reageren (❤️/bericht per foto) — aparte stap (vereist gast-identiteit).
- Video's / meerdere media per bericht.
- Push-notificaties bij nieuwe foto's.
