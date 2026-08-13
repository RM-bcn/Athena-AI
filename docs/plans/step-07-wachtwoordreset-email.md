# Step 07 — Echte wachtwoordreset via e-mail

## Probleem

In step 01 is de "Wachtwoord vergeten?"-flow veilig gemaakt, maar nog steeds **niet
functioneel**: `src/components/LoginView.tsx` (regel 98-99) stuurt bewust niets en
toont alleen de generieke melding "Als dit e-mailadres ... bij ons bekend is,
ontvang je instructies." Er is geen reset-link, geen token, geen e-mail.

## Doel

1. Een server-side reset-flow met een **eenmalig, kortlevend reset-token**.
2. E-mail wordt verstuurd naar het bekende adres via een e-mailprovider
   (primaire keuze: **Resend** via plain `fetch`, geen zware SDK; fallback: geen key
   → dev-modus logt de reset-link in de serverconsole, zodat de flow lokaal testbaar blijft).
3. Client-flow: "Wachtwoord vergeten?" → e-mail/gebruikersnaam invullen →
   generieke bevestiging → klik op link in e-mail (`?reset=<token>`) → nieuw
   wachtwoord formulier → opslaan en inloggen.
4. Geen user-enumeration: antwoord blijft generiek, ook als het adres niet bestaat.

## Betrokken bestanden

- `server.ts` — 2 nieuwe endpoints + token-helpers + e-mailverzending.
- `server/sheets-service.ts` — bestaande `getUserFromSheet` en `updateUserProfileInSheet`
  hergebruiken (geen wijziging verwacht).
- `src/components/LoginView.tsx` — `handleResetPasswordSubmit` naar async + server call;
  een tweede view/state voor "nieuw wachtwoord instellen" wanneer `?reset=` in de URL zit.
- `src/App.tsx` — `useEffect` die de `reset`-queryparameter leest en de reset-view activeert.
- `.env.example` — documenteer `RESEND_API_KEY` en `APP_URL`.
- `src/types.ts` — indien nodig kleine types (reset-respons).

## Uitwerking

### Reset-token (stateless, HMAC — sluit aan op bestaand auth-patroon)

- Nieuwe functies in `server.ts` naast `signToken`/`verifyToken`:
  - `signResetToken(email)`: payload `{ email, typ: "reset", exp }` met `exp =
    Date.now() + 60 min`, signeren met dezelfde HMAC-secret als sessie-tokens
    (hergebruik `getSessionSecret()`).
  - `verifyResetToken(token)`: `verifyToken`-logica hergebruiken maar **type** controleren
    (`typ === "reset"`) zodat sessie-tokens niet als reset-token acceptabel zijn.
  - Tip: refactor naar één gedeelde `verifySignedPayload(token, expectedType)`.

### Endpoint 1: `POST /api/auth/reset-request`

- Body: `{ usernameOrEmail }`.
- Zoek gebruiker op (sheet, anders SEED_USERS). **Bestaat hij niet → toch de generieke
  response teruggeven** (geen 404).
- Bestaat hij → `signResetToken(email)` aanmaken en e-mail sturen:
  - link: `${APP_URL}?reset=${token}` (`APP_URL` uit env, fallback `http://localhost:3000`).
  - Bij Resend-key: `POST https://api.resend.com/emails` met
    `Authorization: Bearer RESEND_API_KEY`, `from`, `to`, `subject`, `text/html`.
  - Zonder key: `console.log("[Reset] Reset link:", link)` (dev-modus) en de generieke
    response teruggeven.
- Response (altijd): `{ success: true, message: "Als dit e-mailadres bij ons bekend
  is, ontvang je instructies." }`.

### Endpoint 2: `POST /api/auth/reset-password`

- Body: `{ token, newPassword }`.
- `verifyResetToken(token)` → ongeldig/verlopen: `400 { error: "Link is ongeldig of
  verlopen. Vraag een nieuwe reset-link aan." }`.
- Valideer `newPassword` (min 8 tekens, zelfde regel als profile-service).
- Zoek gebruiker op email uit het token, hash via bcrypt (`hash`), wegschrijven via
  `updateUserProfileInSheet` (`passwordHash`).
- Response: `{ success: true }`; client logt daarna direct in of toont een
  succesmelding met link naar het inlogscherm.

### Client: LoginView

- `handleResetPasswordSubmit` wordt async:
  `fetch('/api/auth/reset-request', { method: 'POST', ... })` → altijd de generieke
  bevestiging tonen (uit de server-response).
- Nieuwe reset-view (kan een aparte staat binnen LoginView zijn, `resetToken`):
  - Wanneer `App` een `reset`-queryparameter detecteert → toon "Nieuw wachtwoord
    instellen" met velden "Nieuw wachtwoord" + "Bevestig" (zelfde validatie als
    ProfileView) → POST `/api/auth/reset-password` → bij succes: melding + doorgaan
    naar login, of direct `onLoginSuccess` na `/api/login`.
  - Bij ongeldige/verlopen token: foutmelding + knop "Nieuwe link aanvragen".

### App.tsx

- `useEffect` bij mount: `new URLSearchParams(window.location.search).get('reset')` →
  als aanwezig: `setActiveTab('login')` + doorgeven aan LoginView (nieuwe prop
  `initialResetToken`).

## Acceptatiecriteria

- [ ] `POST /api/auth/reset-request` met bekend adres → e-mail verstuurd
      (of dev-link in serverconsole bij ontbrekende key).
- [ ] Zelfde request met onbekend adres → identieke generieke response (geen 404).
- [ ] Reset-link opent de app en toont het "Nieuw wachtwoord"-formulier.
- [ ] `POST /api/auth/reset-password` met geldig token → wachtwoord gewijzigd;
      oude wachtwoord werkt niet meer, nieuwe wel (via `/api/login`).
- [ ] Token is na 60 min verlopen en kan maar één keer gebruikt worden
      (na gebruik/ná reset als ongeldig gemarkeerd — implementeer via korte TTL;
      "één keer gebruiken" is voldoende als het token na eerste succesvolle reset
      simpelweg nooit opnieuw gereset wordt en TTL kort is).
- [ ] Sessie-tokens (uit `/api/login`) worden NIET geaccepteerd als reset-token.
- [ ] UI-teksten in het Nederlands; geen wachtwoorden onthuld.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → LoginView → "Wachtwoord vergeten?" → identifier invullen →
   check serverconsole voor reset-link (zonder Resend-key).
2. Link openen in browser → reset-formulier → nieuw wachtwoord → opslaan → inloggen
   met nieuwe wachtwoord.
3. Oude wachtwoord testen (moet falen).
4. Geknoeide/verlopen token testen.

## Git-workflow

1. Branch vanaf verse `main`: `step/07-wachtwoordreset-email`.
2. Commits, bijv.:
   - `feat(server): add /api/auth/reset-request and reset-password endpoints`
   - `feat(client): forgot-password posts to server; reset view for ?reset= token`
   - `docs: document RESEND_API_KEY and APP_URL in .env.example`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- E-mailproviders naast Resend (SendGrid, SMTP) — later indien gewenst.
- Verlopen-token-garbage collection (TTL van 60 min is stateless en dus voldoende).
- Gebruikersregistratie.
