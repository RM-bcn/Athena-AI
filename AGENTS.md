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
7. Werk sequentieel: de stappen bouwen op elkaar (01 → 06). Niet parallel werken.

## Veiligheid

- `.env`, `.env.*` en `.env.local` zijn gitignored; commit NOOIT secrets of sleutels.
- Geen plaintext wachtwoorden in de client-bundle (`src/`). Auth verloopt via de server.
- API-endpoints die data wijzigen (`/api/sheets/save`, `/api/profile/update`, enz.)
  moeten een auth-check hebben (zie step 02).

## Taal & stijl

- UI-teksten: Nederlands (dit wordt stapsgewijs consistent gemaakt in step 06).
- Geen comments toevoegen tenzij gevraagd. Volg bestaande codeconventies per bestand.

## Overige afspraken

- Google Sheets heeft tabbladen: TripInfo, Stays, Users, CustomBookings, BookingLinks,
  Transports, ChatHistory, Favorites.
- Gebruikersbeheer: `server/profile-service.ts` (bcrypt), login nog niet server-side
  (wordt opgelost in step 01).
- Voer een plan uit zoals beschreven in `docs/plans/step-XX-*.md`; wijk alleen af na
  overleg. Check de acceptatiecriteria en rapporteer wat wel/niet is gelukt.
