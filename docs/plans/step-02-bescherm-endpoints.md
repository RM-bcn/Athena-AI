# Step 02 — Bescherm wijzigende API-endpoints (auth-check)

## Probleem

De volgende endpoints wijzigen data maar hebben **geen enkele auth-check**. Iedereen
die de URL kent kan de Google Sheet overschrijven of het profiel van Dennis/Joyce
aanpassen:

- `POST /api/sheets/save` (hele reis + boekingen + transport)
- `POST /api/chat/history` en `POST /api/chat/favorites` (overschrijven)
- `POST /api/profile/update` (nickname/avatar/wachtwoord wijzigen)

In step 01 wordt bij login een HMAC-token uitgereikt. Deze step gebruikt dat token
om de wijzigende endpoints te beschermen.

## Doel

1. Een `requireAuth`-middleware in `server.ts` die het token valideert (HMAC + expiry).
2. Alle wijzigende endpoints weigeren verzoeken zonder geldig token (401).
3. De client stuurt het token mee (Authorization-header) en reageert netjes op 401
   (uitloggen + terug naar login).
4. Gasten (reiscode) kunnen de reis blijven **lezen**: `GET /api/sheets/load`,
   `GET /api/sheets/status`, `GET /api/chat/history`, `GET /api/chat/favorites`
   blijven open — dat is nodig voor de read-only gastmodus.

## Betrokken bestanden

- `server.ts` — token-verificatie + middleware; toepassen op de 4 POST-endpoints.
- `.env.example` — documenteer `SESSION_SECRET`.
- `src/App.tsx` — alle `fetch`-calls naar beveiligde endpoints voorzien van
  `Authorization: Bearer <token>`; 401-handling (sign out + login-tab).
- `src/components/LoginView.tsx` — evt. token-opslag hulpfunctie delen
  (bijv. `src/utils/authToken.ts` met `getToken()`/`setToken()`/`clearToken()`).
- `api/index.ts` — geen wijziging nodig (importeert `server.ts`), maar verifieer dat
  de middleware ook in de Vercel-serverless route actief is.

## Uitwerking

### Token (afspraken uit step 01, hier geïmplementeerd/gehard)

- Formaat: `payloadBase64.signature` met payload `{ email, exp }`.
- Signature: HMAC-SHA256 met secret uit `process.env.SESSION_SECRET`.
- Expiry: 30 dagen. Geen dependency toevoegen (Node `crypto`).
- Hulp-functies in `server.ts` (of `server/auth.ts`): `signToken(email)`,
  `verifyToken(token)`. `verifyToken` retourneert `{ email } | null`.

### Middleware

```ts
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, error: "Niet ingelogd of sessie verlopen." });
  (req as any).authEmail = payload.email;
  next();
}
```

- Toepassen: `app.post("/api/sheets/save", requireAuth, ...)`,
  `app.post("/api/chat/history", requireAuth, ...)`,
  `app.post("/api/chat/favorites", requireAuth, ...)`,
  `app.post("/api/profile/update", requireAuth, ...)`.
- Optioneel (mooi meegenomen, klein): bij `/api/profile/update` controleren dat
  `req.authEmail` overeenkomt met de `email` in de body.

### Client

- `src/utils/authToken.ts`: `getToken()`, `setToken(token)`, `clearToken()` met
  localStorage-key `athena_auth_token` (consistent met step 01).
- `App.tsx`: centrale helper `authFetch(url, init)` die de header toevoegt; gebruik die
  voor sheets/save, chat/history+POST, chat/favorites+POST, profile/update.
- Bij 401 van een POST: `clearToken()`, `handleSignOut()`-achtig gedrag (user leeg,
  naar login-tab) en een vriendelijke melding ("Je sessie is verlopen, log opnieuw in.").
- Gasten doen nooit deze POSTs (ze mogen niet chatten/bewerken) — dubbelcheck dat er
  geen code-pad is waar een gast een beveiligde POST doet.

## Acceptatiecriteria

- [ ] `POST /api/sheets/save` zonder token → 401, sheet blijft ongewijzigd.
- [ ] `POST /api/profile/update` zonder token → 401.
- [ ] `POST /api/chat/history` / `favorites` zonder token → 401.
- [ ] Met geldig token (verkregen via `/api/login`) → alle POSTs werken als voorheen.
- [ ] GET-endpoints (sheets/status, sheets/load, chat/history, chat/favorites,
      `/api/chat`) blijven zonder token beschikbaar voor de gastmodus.
- [ ] Verlopen/vervalst token → 401.
- [ ] Client stuurt token mee en handelt 401 af zonder crash.
- [ ] `SESSION_SECRET` gedocumenteerd in `.env.example`.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `curl -X POST localhost:3000/api/sheets/save -H "Content-Type: application/json" -d '{}'` → 401.
2. Token ophalen via `/api/login` en dezelfde call met `Authorization: Bearer <token>` → 200.
3. UI-test: inloggen → stay wijzigen → sync werkt; token in localStorage verwijderen
   via devtools → volgende save toont uitlog-melding.

## Git-workflow

1. Branch vanaf verse `main`: `step/02-bescherm-endpoints`.
2. Commits, bijv.:
   - `feat(server): add HMAC token sign/verify + requireAuth middleware`
   - `feat(server): protect sheet/chat/profile write endpoints`
   - `feat(client): authFetch helper + 401 handling`
   - `docs: document SESSION_SECRET in .env.example`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Rollen/rechten per gebruiker (owner vs member) — later indien gewenst.
- Rate-limiting / brute-force protectie op login — later.
