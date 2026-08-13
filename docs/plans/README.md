# Athena-AI — Routekaart & werkwijze (steps)

Overzicht van de 6 geplande stappen naar aanleiding van de review van augustus 2026.
Elke stap heeft een eigen plan-bestand dat door een agent uitgevoerd kan worden.

## Belangrijk: eerst voorbereiden (stap 0)

`main` loopt momenteel **49 commits achter** op `feature/chat-upgrade` (de actuele,
werkende code). Voordat je aan step 01 begint:

1. Open een PR `feature/chat-upgrade` → `main` en merge die na review.
2. Verwijder na de merge de oude feature-branches (lokaal + remote):
   `chat-optimalisatie`, `feature/chat-background-refresh`, `feature/duckduckgo-live-search`,
   `feature/ferries-transfers`, `feature/ferries-transfers-confirmed`, `feature/ferries-transports`,
   `feature/login-screen`, `feature/profile-management`, `feature/smart-accommodation-linking`,
   `feature/transport-upgrade`, `mobile-optimalisatie`, `test-readme`,
   `google-drive-integration-issue-48088`, `google-sheets-database-integration-ec0a3`,
   `greek-sunset-hero-image-107f8`, `oke-wat-nu-0eaad`, `athena-ai-repository-pull-885bc`.
3. Ruim de 3 achtergebleven stashes op (`git stash list`): alleen bewaren wat nog nodig is.

## De 6 stappen (sequentieel uitvoeren, 01 → 06)

| Step | Plan-bestand | Kort doel |
|------|--------------|-----------|
| 01 | [step-01-server-auth-login.md](step-01-server-auth-login.md) | Echte server-side login met bcrypt; wachtwoorden uit de bundle |
| 02 | [step-02-bescherm-endpoints.md](step-02-bescherm-endpoints.md) | Auth-check (token) op alle wijzigende API-endpoints |
| 03 | [step-03-eerlijke-features.md](step-03-eerlijke-features.md) | Nep-features eerlijk maken (MissedFerry, Trivago, alerts, export) |
| 04 | [step-04-reiscode-sharelink.md](step-04-reiscode-sharelink.md) | Reiscode-validatie + werkende share-link (`?code=...`) |
| 05 | [step-05-sync-sessies-dagplanning.md](step-05-sync-sessies-dagplanning.md) | Transport-sync naar Sheets, nieuwe chat-sessie, DAG-nummering fix |
| 06 | [step-06-taal-en-teksten.md](step-06-taal-en-teksten.md) | Nederlandse UI-teksten, conditionele banners, kleine fixes |

Waarom sequentieel: de stappen raken deels dezelfde bestanden (`server.ts`, `App.tsx`,
`LoginView.tsx`, `MyItineraryView.tsx`). Parallel werken geeft merge-conflicten.

## Werkwijze per stap (voor jou als gebruiker)

1. Open een **nieuwe chat** in OpenCode en zeg:
   > Voer `docs/plans/step-XX-*.md` uit. Volg de AGENTS.md git-conventies,
   > maak zelf de branch, commits en de PR. Verifieer met lint en tests.
2. De agent leest het plan + `AGENTS.md` automatisch en werkt de stappen af.
3. Review de PR op GitHub en merge (of vraag de agent om wijzigingen).

## Regels voor de agent (ook opgenomen in AGENTS.md)

- Branch: `step/<NN>-<slug>` vanaf een verse `main`.
- Kleine, atomische conventional commits.
- `npm run lint` en `npm run test` vóór de laatste commit; resultaten in de PR zetten.
- PR-beschrijving: wat/waarom, verwijzing naar het plan-bestand, afgevinkte
  acceptatiecriteria.
- Niet zelf mergen; nooit secrets committen; UI-teksten in het Nederlands.

## Status

- [x] Stap 0 — main bijwerken vanaf `feature/chat-upgrade` + branch-opruiming
- [ ] Step 01 — server-side login
- [ ] Step 02 — endpoint-bescherming
- [ ] Step 03 — eerlijke features
- [ ] Step 04 — reiscode + share-link
- [ ] Step 05 — sync, chat-sessies, dagnummering
- [ ] Step 06 — taal & teksten
