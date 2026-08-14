# Step 09 — Rollen, reis-aanvragen & goedkeuring

## Probleem

De `Users`-tabel (Google Sheets) en `SEED_USERS` hebben al een `role`-veld
(`"owner" | "member"`), en `/api/login` geeft `role` mee in het user-object
(`server.ts` regel 394). Maar **nergens wordt die rol gebruikt**. Verder kan alleen
iemand die direct kan inloggen een nieuwe reis aanmaken; er is geen flow voor
"leden stellen een reis voor, de eigenaar keurt goed".

Gewenste situatie (richting van Dennis):

- **Member = editor**: mag het reisschema bewerken (stays, boekingen, transport,
  sync) én **een nieuwe reis aanvragen**.
- **Owner = admin**: kan de reis bewerken én **reis-aanvragen goedkeuren of
  afkeuren**.
- **Toekomst**: mensen kunnen **lid worden** (registratie) en als lid een reis
  aanvragen.

## Doel

1. Rollen worden daadwerkelijk gebruikt: `owner` = admin, `member` = editor.
2. Nieuwe reis-aanvraag-flow: member (en owner) stellen een reis voor via de
   bestaande NewTripModal → aanvraag wordt **niet direct actief**, maar opgeslagen
   als `pending` → owner keurt goed (dan wordt het de actieve reis) of af.
3. Server-side afdwingen: goedkeuren/afkeuren is admin-only (`requireOwner`);
   bewerken/sync is voor elke ingelogde (owner + member).
4. Client-UI: admin-paneel "Reis-aanvragen" (goedkeuren/afkeuren), member ziet
   status van eigen aanvragen.
5. Registratie-flow ("lid worden") zodat nieuwe members via de app kunnen
   inschrijven (in deze stap opgenomen als Deel B).

## Betrokken bestanden

### Server & sheets

- `server.ts` — rol in token; `requireOwner`-middleware; nieuwe endpoints voor
  reis-aanvragen; registratie-endpoint.
- `server/sheets-service.ts` — nieuw tabblad `TripRequests` (kolommen hieronder) +
  functies: `createTripRequest`, `getTripRequests`, `updateTripRequestStatus`,
  `createUserInSheet`.
- `server/seed-users.ts` — geen wijziging (rollen staan er al).
- `.env.example` — geen nieuwe keys (hergebruikt bestaande Google OAuth).

### Client

- `src/App.tsx` — `canEdit` = ingelogd (owner **of** member, geen gast); `isOwner`
  check; `handleCreateTrip` splitst in "direct activeren" (owner) vs "aanvraag
  indienen"; state `tripRequests` + load/save; doorgeven aan views.
- `src/components/MyItineraryView.tsx` — sheets-banner blijft voor elke ingelogde;
  bewerk-knoppen blijven voor elke ingelogde (member mag bewerken).
- `src/components/Sidebar.tsx` / `TopHeader.tsx` — "Nieuwe Reis Plannen" voor owner
  én member (member → aanvraag); navigatie naar het admin-paneel alleen voor owner.
- `src/components/LoginView.tsx` — extra tab/koppeling "Word lid" (registratieformulier).
- `src/components/SettingsView.tsx` — (of een apart `TripRequestsView`) admin-paneel
  "Reis-aanvragen" met goedkeuren/afkeuren; alleen zichtbaar voor owner.
- `src/components/Modals/NewTripModal.tsx` — submit-knoptekst aanpassen op basis van
  rol ("Indienen ter goedkeuring" voor member, "Reis activeren" voor owner).

## Uitwerking

### Deel A — Rollen & reis-aanvragen

#### 1. Rol in token + `requireOwner`

- `signToken(email, role)`: payload wordt `{ email, role, exp }`.
- `verifyToken` retourneert `{ email, role } | null` (oude tokens zonder rol →
  fallback `"member"`).
- `requireAuth` zet `(req as any).authRole = payload.role`.
- Nieuwe middleware:

```ts
function requireOwner(req, res, next) {
  const role = (req as any).authRole;
  if (role !== "owner") {
    return res.status(403).json({ success: false, error: "Geen beheerderrechten voor deze actie." });
  }
  next();
}
```

- Rechten per endpoint:
  - `POST /api/sheets/save` → `requireAuth` (owner **en** member mogen bewerken/syncen).
  - `POST /api/profile/update`, chat-history/favorites → `requireAuth` (ongewijzigd).
  - Nieuwe reis-aanvraag-endpoints → `requireAuth` (zie hieronder).
  - Goedkeuren/afkeuren → `requireAuth, requireOwner`.

#### 2. Nieuwe sheet-tab `TripRequests`

- Voeg toe aan `requiredTabs` in `ensureTabsExist` én aan de seed-tabs in
  `getOrCreateSpreadsheet` (net als de andere tabbladen).
- Kolommen:
  `ID | Title | StartDate | EndDate | DurationDays | Style | TripCode | StaysJSON | RequestedBy | RequestedAt | Status | DecidedBy | DecidedAt | Notes`
- `Status`: `pending` | `approved` | `rejected`.

#### 3. sheets-service-functies

- `createTripRequest({ trip, requestedBy })` → append-rij met `Status=pending`,
  `StaysJSON=JSON.stringify(stays)`, `TripCode` = voorgestelde code of gegenereerd
  (bv. `REQ-<timestamp>` — de uiteindelijke actieve code blijft `ATH-2026` tot
  goedkeuring).
- `getTripRequests(status?)` → array van rijen, geparsed (StaysJSON terug naar array).
- `updateTripRequestStatus(id, status, decidedBy)` → Status + DecidedBy + DecidedAt.
- `createUserInSheet({ username, email, name, passwordHash })` → append-rij met
  `Role=member`, `TripCode=ATH-2026` (nieuw lid).

#### 4. Server-endpoints

- `POST /api/trips/request` (`requireAuth`):
  body `{ trip }` → valideer (zelfde basisvalidatie als `saveTripToSheet`) →
  `createTripRequest` → `{ success: true, request }`.
- `GET /api/trips/requests` (`requireAuth`):
  owner → alle; member → alleen eigen (op `RequestedBy` email uit token).
- `POST /api/trips/requests/:id/approve` (`requireAuth, requireOwner`):
  zet Status `approved` → **wordt de actieve reis**: `saveTripToSheet(trip, [], {}, [])`
  met de goedgekeurde trip + eigenaar wordt opnieuw ingelogd/naar itinerary.
- `POST /api/trips/requests/:id/reject` (`requireAuth, requireOwner`):
  zet Status `rejected` + optionele `notes`.
- `POST /api/auth/register` (open, zonder token):
  body `{ username, email, name, password }` → check duplicaten (username/email),
  min 8 tekens, bcrypt-hash, `createUserInSheet`, daarna direct inloggen
  (token + user zoals `/api/login`).

#### 5. Client

- `App.tsx`:
  - `const isOwner = currentUser?.role === 'owner';`
  - `canEdit` (naar MyItineraryView) = `!!currentUser && !isGuestMode` (ongewijzigd
    gedrag: elke ingelogde bewerkt). Member ziet géén leesmodus-banner.
  - `handleCreateTrip`:
    - owner: zoals nu (direct `updateAndSaveTrip` → actief).
    - member: `POST /api/trips/request` → succesmelding
      "Aanvraag ingediend. De eigenaar keurt hem goed." → **niet** direct de reis
      overschrijven.
  - `loadTripRequests()` bij mount/ingelogd; state `tripRequests`.
  - Nieuw admin-paneel (binnen SettingsView of aparte view): voor `isOwner` een
    lijst van `pending`-aanvragen met "Goedkeuren" / "Afkeuren"-knoppen.
- `MyItineraryView.tsx`: geen rol-wijziging nodig voor bewerken (member mag al
  bewerken). Check alleen dat de sheets-banner voor elke ingelogde blijft en dat er
  geen owner-only UI overblijft uit het vorige concept.
- `Sidebar.tsx` / `TopHeader.tsx`: "Nieuwe Reis Plannen" voor owner én member;
  "Reis-aanvragen" (admin) alleen owner.
- `NewTripModal.tsx`: submit-knop toont "Indienen ter goedkeuring" voor member.
- `LoginView.tsx`: link/tab "Word lid" → toont registratieformulier (username,
  email, naam, wachtwoord + bevestiging) → `POST /api/auth/register` →
  `onLoginSuccess(user)`.

#### 6. Tests (waar mogelijk)

- Een unit-test kan lastig met sheets; minimaal lint + bestaande tests.
- Optioneel: kleine pure helper voor de request-validatie apart testen (alleen als
  dat netjes past, niet verplicht).

### Deel B — Registratie ("lid worden")

- Zoals boven beschreven onder `POST /api/auth/register` en de LoginView-tab.
- Nieuwe leden krijgen automatisch `role = "member"` en mogen na aanmelden
  bewerken + reis-aanvragen indienen.
- Acceptatie: registratie werkt, duplicaat-check, direct ingelogd.

## Acceptatiecriteria

- [ ] Rol zit in het token; oud token zonder rol wordt als `member` behandeld.
- [ ] Owner én member kunnen stays/boekingen/transport bewerken en syncen
      (`POST /api/sheets/save` → 200 voor beide).
- [ ] Member kan een nieuwe reis indienen via NewTripModal → `pending`-aanvraag,
      de actieve reis verandert NIET.
- [ ] Owner ziet alle aanvragen; member ziet alleen eigen aanvragen.
- [ ] Owner kan goedkeuren → de aanvraag wordt de actieve reis (sheet + UI);
      afkeuren → `rejected`.
- [ ] `POST /api/trips/requests/:id/approve|reject` met member-token → 403.
- [ ] Registratie (`POST /api/auth/register`) maakt een member aan (bcrypt), kan
      geen duplicaat username/email, en logt direct in.
- [ ] UI-teksten in het Nederlands; geen alert-placeholders.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → inloggen als member (Joyce): itinerary bewerkbaar, sheets-banner
   zichtbaar; "Nieuwe Reis Plannen" → aanvraag indienen → melding.
2. Inloggen als owner (Dennis): admin-paneel toont de pending aanvraag →
   goedkeuren → reis wordt actief; afkeuren → status rejected.
3. `curl`-tests: member-token op approve/reject → 403; register met duplicaat → fout.
4. Oud token (zonder rol) → member-behandeling.

## Git-workflow

1. Branch vanaf verse `main`: `step/09-reizen-aanvragen`.
2. Commits, bijv.:
   - `feat(server): role in session token + requireOwner middleware`
   - `feat(server): trip request endpoints + TripRequests sheet tab`
   - `feat(server): POST /api/auth/register for new members`
   - `feat(client): member trip-request flow + owner approval panel`
   - `feat(client): registration form in login screen`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Meerdere actieve trips tegelijk in de sheet (één actieve reis blijft het model;
  goedgekeurde aanvragen overschrijven de actieve reis).
- Rollen wijzigen via een admin-UI (rollen zitten in de sheet/`SEED_USERS`).
- E-mailbevestiging bij registratie (kan later via stap 07-infra).
