# Step 09 — Rollen & rechten (owner vs member)

## Probleem

De `Users`-tabel (Google Sheets) en `SEED_USERS` bevatten al een `role`-veld
(`"owner" | "member"`), en `/api/login` geeft `role` mee in het user-object
(`server.ts` regel 394). Maar **nergens wordt die rol gebruikt**: Dennis (owner) en
Joyce (member) hebben momenteel exact dezelfde rechten. Iedere ingelogde gebruiker
kan reizen/stays/boekingen/transport wijzigen en synchroniseren.

## Doel

1. Rol `owner` = volledige toegang (alles zoals nu: reis/stays/boekingen/transport
   wijzigen, sync, nieuwe reis).
2. Rol `member` = **read-only voor het reisschema** plus wél: chatten, favorieten,
   eigen profiel bewerken, exporteren/afdrukken, dagplanning genereren (stap 08).
3. Gasten (reiscode) blijven read-only (ongewijzigd).
4. Server-side afdwingen (niet alleen UI-verbergen): wijzigende endpoints weigeren
   een member.

## Betrokken bestanden

- `server.ts` — rol in het token; `requireOwner`-middleware; `/api/sheets/save` en
  nieuw-verwante wijzigende endpoints voorzien; `requireAuth` blijft zoals het is.
- `server/sheets-service.ts` — bestaande `getUserFromSheet` levert `role` al mee
  (geen wijziging verwacht).
- `src/App.tsx` — `canEdit`-achtige logica afleiden van `currentUser.role === 'owner'`;
  gasten blijven read-only; doorgeven aan views.
- `src/components/MyItineraryView.tsx` — de bestaande `canEdit`-prop nu laten voeden
  met owner-status; member ziet leesmodus (geen bewerk-knoppen, geen sheet-banner).
- `src/components/Sidebar.tsx` / `TopHeader.tsx` — "Nieuwe Reis Plannen"-knop alleen
  voor owner (member ziet hem niet).
- `src/components/ProfileView.tsx` — blijft toegankelijk voor owner én member
  (eigen profiel). Wachtwoord-wijziging: werkt voor beide (eigen wachtwoord).

## Uitwerking

### Server: rol in token + `requireOwner`

- `signToken(email, role)`: payload wordt `{ email, role, exp }`.
- `verifyToken` retourneert `{ email, role } | null` (rol als `"member"` fallback
  wanneer oud token zonder rol → veilige default).
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

- `requireAuth` zet `(req as any).authRole = payload.role`.
- Toepassen op wijzigende endpoints:
  - `POST /api/sheets/save` → `requireAuth, requireOwner`
  - `POST /api/profile/update` → **alleen** `requireAuth` (member mag eigen profiel
    wijzigen) — géén requireOwner.
  - `POST /api/chat/history` en `/api/chat/favorites` → alleen `requireAuth`
    (members chatten gewoon).
  - `POST /api/resolve-ferry` → alleen `requireAuth` (member mag ferry-boeking
    aangeven), tenzij dat een reiswijziging impliceert — check de handler en kies
    op basis daarvan; uitgangspunt: member mag het.

### Client: `canEdit` van rol afleiden

- In `App.tsx`: `const isOwner = currentUser?.role === 'owner';`
- `canEdit`-prop naar `MyItineraryView` wordt `isOwner && !isGuestMode`
  (momenteel al `!!currentUser && !isGuestMode`).
- Sidebar "Nieuwe Reis Plannen" alleen tonen bij `isOwner` (niet bij member, niet
  bij gast). Bestaande `handleOpenNewTripModal`-guard blijft als backstop.
- Sheets-banner (`Google Sheets Database`-blok) alleen voor owner (via `canEdit`).
- Members zien een leesmodus-banner vergelijkbaar met de gasten-modus, maar met
  andere tekst: "Je volgt de reis als mede-beheerder (read-only). Neem contact op
  met de eigenaar om wijzigingen te doen." — alleen wanneer `role === 'member'`.

### Profile & chat blijven open

- Chat en favorieten: zowel owner als member (onveranderd).
- Profiel: zowel owner als member; `onUpdateUser` vereist al een token (stap 02).

## Acceptatiecriteria

- [ ] Member (`Joyce`) kan inloggen maar ziet geen bewerk-/toevoeg-knoppen en geen
      sheets-banner; kan wél chatten, favorieten, profiel wijzigen en afdrukken.
- [ ] Owner (`Dennis`) behoudt alle huidige rechten.
- [ ] `POST /api/sheets/save` met een member-token → 403.
- [ ] `POST /api/profile/update` met een member-token → 200 (eigen profiel).
- [ ] Gasten blijven volledig read-only (geen wijziging).
- [ ] Tokens uit de oude sessies (zonder rol) worden behandeld als member (veilige
      default) — log opnieuw in om een token met rol te krijgen.
- [ ] UI-teksten in het Nederlands.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. Inloggen als Joyce (member): check sidebar, itinerary-knoppen, sheets-banner,
   chat en profiel.
2. Member-token via `/api/login` pakken → `curl -X POST localhost:3000/api/sheets/save
   -H "Authorization: Bearer <token>" ...` → 403.
3. Zelfde call met owner-token → 200.
4. Oud token (pre-rol) → 403 op sheets/save (member-default).

## Git-workflow

1. Branch vanaf verse `main`: `step/09-rollen-rechten`.
2. Commits, bijv.:
   - `feat(server): include role in session token + requireOwner middleware`
   - `feat(server): protect sheets/save with owner role`
   - `feat(client): gate editing UI on owner role, member read-only banner`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Registratie van nieuwe gebruikers / self-service aanmaken accounts.
- Admin-UI voor rollen beheren in de app (rollen wijzigen via de Google Sheet of
  `SEED_USERS`/serverconfig).
- Fijnmazigere per-resource rechten (bv. member mag wél bepaalde stays bewerken) —
  later indien gewenst.
