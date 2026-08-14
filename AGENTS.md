# Athena-AI — Projectconventies voor agents

## Wat is dit project?

Athena AI is een persoonlijke reisconcierge (Griekse Cycladen) voor Dennis & Joyce.
Stack: React 19 + Vite (client, `src/`), Express (server, `server.ts`, gedeployd op Vercel
via `api/index.ts`), Google Sheets als database (`server/sheets-service.ts`), AI via
Groq (primair) en Gemini (fallback).

## Commando's

```sh
npm install            # dependencies (bun lock bestaat, maar npm werkt)
npm run dev            # dev server (tsx server.ts) op poort 3000
npm run lint           # TypeScript check: tsc --noEmit — ALTIJD draaien vóór commit
npm run test           # unit tests (transportLogic)
npm run build          # productie build (vite + esbuild server)
```

Windows-opmerking: PowerShell (5.1) blokkeert `npm.ps1` vanwege de
execution policy. Gebruik dan `npm.cmd` (bijv. `npm.cmd run lint`). Als
`npm` zelf faalt met een SecurityError, is `npm.cmd` de workaround.

## Git-workflow (verplicht voor elke taak)

1. Begin ALTIJD vanaf een bijgewerkte `main`: `git checkout main && git pull`.
2. Branch-naam: `step/<NN>-<korte-slug>` (bijv. `step/01-server-auth`).
3. Commits: conventional commits in het Nederlands of Engels, klein en atomisch:
   `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`. Geen mega-commits.
4. Draai `npm run lint` en `npm run test` vóór de laatste commit.
5. Push en open een PR naar `main` met in de beschrijving: wat/waarom, verwijzing
   naar het plan-bestand (`docs/plans/step-XX-*.md`) en de afgevinkte acceptatiecriteria.
6. Merge NIET zelf; laat de gebruiker reviewen. Na merge wordt de branch verwijderd.
7. Werk sequentieel: de stappen bouwen op elkaar (01 → 16). Niet parallel werken.

## Veiligheid

- `.env`, `.env.*` en `.env.local` zijn gitignored; commit NOOIT secrets of sleutels.
- Geen plaintext wachtwoorden in de client-bundle (`src/`). Auth verloopt via de server.
- API-endpoints die data wijzigen (`/api/sheets/save`, `/api/profile/update`, enz.)
  moeten een auth-check hebben (zie step 02).

## Taal & stijl

- UI-teksten: Nederlands (dit wordt stapsgewijs consistent gemaakt in step 06).
- Geen comments toevoegen tenzij gevraagd. Volg bestaande codeconventies per bestand.

## Status & openstaande zaken (bijgewerkt 14 aug 2026)

- **Alle geplande stappen 01–16 zijn afgerond en live.** Nieuwe wensen worden als
  stap 17+ opgeschreven in een nieuw plan-bestand (`docs/plans/step-17-*.md`).
  Gearchiveerde plannen staan in `docs/plans/done/`.
- **Step 07 (wachtwoordreset via e-mail) is live** maar verstuurt nog géén e-mail:
  er is nog géén `RESEND_API_KEY` (geen domein geverifieerd). Zonder key logt de
  server de reset-link naar de serverconsole (`[Reset] Reset link: ...`) en verstuurt
  hij niets — dat is bewust (dev-modus), geen bug.
- **Testaccount** (seed-user, o.a. om "Wachtwoord vergeten?" te testen):
  gebruikersnaam `testaccount`, e-mail `dennis.van.rooden+testaccount@gmail.com`,
  wachtwoord `test`. Zie `server/seed-users.ts`.
- **Om de reset-mail werkend te krijgen** (toekomstig werk):
  1. Resend-account + API-key: https://resend.com/api-keys
  2. `RESEND_API_KEY` zetten in `.env.local` (lokaal) én als Vercel env-var
     (Production/Preview).
  3. Domein verifiëren in Resend + `RESEND_FROM` zetten (bijv.
     `Athena AI <noreply@<domein>>`). Zonder geverifieerd domein accepteert Resend
     alleen `onboarding@resend.dev` en stuurt het alleen naar het e-mailadres van
     het Resend-account zelf.
  4. `APP_URL` zetten op de live URL (fallback: `http://localhost:3000`).
  - Fouten van Resend zijn zichtbaar als `[Reset] Resend error: <status> <body>`.
  - `.env` en `.env.local` worden sinds een fix bij serverstart door `server.ts`
    geladen (dotenv). Op Vercel bestaan die bestanden niet; daar injecteert het
    platform de env-vars zelf.

## Overige afspraken

- Google Sheets heeft tabbladen: TripInfo, Stays, Users, CustomBookings, BookingLinks,
  Transports, ChatHistory, Favorites.
- Gebruikersbeheer: `server/profile-service.ts` (bcrypt), login server-side sinds step 01.
- Voer een plan uit zoals beschreven in `docs/plans/step-XX-*.md`; wijk alleen af na
  overleg. Check de acceptatiecriteria en rapporteer wat wel/niet is gelukt.
