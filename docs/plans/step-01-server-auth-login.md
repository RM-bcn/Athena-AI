# Step 01 — Echte server-side login (auth)

## Probleem

Login gebeurt nu volledig client-side: `src/components/LoginView.tsx` vergelijkt
gebruikersnaam + wachtwoord met `DEFAULT_USERS` in `src/data/initialData.ts`, waar
**plaintext wachtwoorden** in staan (`Athene2026!`, `JoyceO`). Die zitten dus in de
publieke JS-bundle — iedereen kan ze lezen. De backend (`server/profile-service.ts`)
kan wél bcrypt aan en Google Sheets heeft een `Users`-tabblad met `PasswordHash`-kolom
(leeg bij initiële seed), maar login gebruikt daar niets van.

Daarnaast is de "Wachtwoord vergeten?"-flow onveilig: hij toont het wachtwoord
letterlijk in de UI en wijzigt alleen een in-memory array (niets wordt opgeslagen).

## Doel

1. Login verloopt via een nieuw server-endpoint `/api/login` met bcrypt-verificatie.
2. Geen wachtwoorden meer in de client-bundle.
3. Bestaande accounts blijven werken (migratie van lege `PasswordHash`).
4. "Wachtwoord vergeten?" wordt veilig (geen wachtwoord-onthulling, geen nep-reset).
5. "Onthoud mij" krijgt eerlijk gedrag: aan = localStorage, uit = sessionStorage.

## Betrokken bestanden

- `server.ts` — nieuw endpoint `POST /api/login` + hulp-functies.
- `server/profile-service.ts` — evt. gedeelde hash-hulp (of zelfde patroon volgen).
- `server/sheets-service.ts` — bestaande `getUserFromSheet` hergebruiken; kleine
  toevoeging om `PasswordHash` te schrijven (bestaande `updateUserProfileInSheet`
  kan hiervoor gebruikt worden).
- `src/components/LoginView.tsx` — formulier stuurt naar `/api/login`; loading-state;
  error-meldingen; forgot-password-flow herschrijven.
- `src/data/initialData.ts` — verwijder `password` uit `DEFAULT_USERS`.
- `src/App.tsx` — `handleLoginSuccess` krijgt (indien nodig) token mee van login.
- `src/types.ts` — `UserAccount` controle: geen `password`-veld (indien aanwezig, verwijderen).

## Uitwerking

### Server: `POST /api/login`

1. Body: `{ usernameOrEmail, password }`.
2. Gebruiker zoeken via `getUserFromSheet(email, username)` (bestaande functie).
3. Als de sheet niet geconfigureerd is (geen OAuth): **server-side fallback** met een
   lijst `SEED_USERS` in `server.ts` (of aparte module `server/seed-users.ts`) waar de
   wachtwoorden **gehashed** staan (bcrypt-hash hardcoded op de server, nooit plaintext
   in `src/`). Denk aan de twee bestaande accounts: `dennisvr` en `Joyce`.
4. Wachtwoord-check:
   - `existingUser.passwordHash` aanwezig → `bcrypt.compare`.
   - leeg (initiële seed in sheet) → migratie: vergelijk met de server-side default-hash
     van dat account; bij succes direct de hash wegschrijven naar de sheet
     (`updateUserProfileInSheet` met `passwordHash`) zodat de migratie éénmalig is.
5. Response: `{ success: true, user }` met het veilige user-object (zonder passwordHash),
   plus een `token` — het token wordt pas in step 02 echt gebruikt voor endpoint-bescherming,
   maar hier al meeleveren zodat de client het kan opslaan. Formaat: HMAC-signed
   (`sign(email + exp)`) met secret uit env `SESSION_SECRET` (fallback op afgeleide waarde
   mag alleen lokaal/dev; documenteer in `.env.example`).
   Simpel houden: token = `base64(email + ":" + exp) + "." + hmac`. Geen dependencies toevoegen.
6. Foutmeldingen: generiek "Ongeldige gebruikersnaam of wachtwoord." (geen user-enumeration).

### Client: `LoginView.tsx`

- `handleLoginSubmit` wordt async: `fetch('/api/login', ...)`.
- Loading-state op de submit-knop (bijv. "Bezig met inloggen...").
- Bij fout: bestaande error-banner tonen met de server-melding.
- Bij succes: token opslaan (`athena_auth_token`) in localStorage **of** sessionStorage
  afhankelijk van de "Onthoud mij"-checkbox. `onLoginSuccess(user)` blijft bestaan;
  doorgeven dat er een token is kan via een optioneel tweede argument of aparte callback —
  houd de bestaande `handleLoginSuccess`-signatuur zoveel mogelijk intact.
- Verwijder alle client-side wachtwoordvergelijking en de import van wachtwoorden.

### Client: "Wachtwoord vergeten?"-modal

- Verwijder het veld "Nieuw Wachtwoord (Optioneel direct instellen)".
- Verwijder de zin die het wachtwoord onthult.
- Nieuwe flow: alleen identifier invoeren → generiek bericht:
  "Als dit e-mailadres/gebruikersnaam bij ons bekend is, ontvang je instructies."
  (Er wordt voorlopig niets verstuurd; dit is bewust generiek en eerlijk in de code als
  TODO. Geen e-mail-integratie in deze step.)
- Sluiten/reset van staten zoals nu.

### `src/data/initialData.ts`

- Verwijder `password` uit beide user-objecten. Houd `username`, `email`, `name`,
  `nickname`, `avatar`, `role`, `tripCode`.
- Controleer dat niets anders in de codebase `DEFAULT_USERS[...].password` gebruikt
  (grep op `.password`).

## Acceptatiecriteria

- [ ] `POST /api/login` met correcte credentials → 200, veilig user-object + token.
- [ ] Fout wachtwoord → 400/401 met generieke melding; geen verschil tussen
      "gebruiker bestaat niet" en "wachtwoord fout".
- [ ] `grep -ri "password" src/` bevat geen plaintext wachtwoorden meer
      (alleen labels/placeholders zoals "Wachtwoord" zijn ok).
- [ ] Login werkt voor beide accounts, óók wanneer Google Sheets niet is geconfigureerd
      (dev-modus via SEED_USERS).
- [ ] Eerste login ná deze change schrijft de hash naar de sheet (migratie) en werkt
      daarna tegen de sheet-hash.
- [ ] "Onthoud mij" aan → na refresh ingelogd; uit → na browser-sessie uitgelogd.
- [ ] Forgot-password toont geen wachtwoord meer en wijzigt niets client-side.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev`, daarna `curl -X POST localhost:3000/api/login -H "Content-Type: application/json" -d '{"usernameOrEmail":"dennisvr","password":"<huidige wachtwoord>"}'`
2. Foute wachtwoord-case testen.
3. UI: inloggen via het formulier, foutmelding, refresh met/zonder "Onthoud mij".

## Git-workflow

1. Branch vanaf verse `main`: `step/01-server-auth`.
2. Kleine atomische commits, bijv.:
   - `feat(server): add POST /api/login with bcrypt verification`
   - `feat(client): login form posts to /api/login with loading state`
   - `fix(security): remove plaintext passwords from client bundle`
   - `fix(login): rewrite forgot-password flow without password disclosure`
   - `feat(login): remember-me toggle persists to localStorage vs sessionStorage`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met verwijzing naar dit bestand en de afgevinkte acceptatiecriteria.
   Niet zelf mergen.

## Buiten scope (volgende steps)

- Endpoint-bescherming met het token → step 02.
- Echte e-mail-reset → later; nu alleen eerlijke generieke melding.
- Registratie/nieuwe gebruikers → niet gepland.
