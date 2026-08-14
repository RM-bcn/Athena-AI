# Athena-AI — Routekaart & werkwijze (steps)

Overzicht van de geplande stappen voor Athena AI. Uitgevoerde stappen staan
gearchiveerd in [done/](done/). Elke openstaande stap heeft een eigen plan-bestand
dat door een agent uitgevoerd kan worden.

## Afgerond (stap 0 + 01–08)

- [x] Stap 0 — main bijwerken + branch-/stash-opruiming
- [x] Step 01 — server-side login (bcrypt, token) → [done](done/step-01-server-auth-login.md)
- [x] Step 02 — endpoint-bescherming (`requireAuth`) → [done](done/step-02-bescherm-endpoints.md)
- [x] Step 03 — eerlijke features (MissedFerry, AI Hotel Suggesties, tel:-links, print) → [done](done/step-03-eerlijke-features.md)
- [x] Step 04 — reiscode-validatie + share-link (`?code=...`) → [done](done/step-04-reiscode-sharelink.md)
- [x] Step 05 — transport-sync naar Sheets, nieuwe chat-sessie, DAG-nummering → [done](done/step-05-sync-sessies-dagplanning.md)
- [x] Step 06 — Nederlandse UI-teksten, conditionele banners → [done](done/step-06-taal-en-teksten.md)
- [x] Step 07 — wachtwoordreset via e-mail → [done](done/step-07-wachtwoordreset-email.md).
      **Let op:** e-mail verstuurt nog niet live (geen `RESEND_API_KEY`/domein) — zie "Status" in `AGENTS.md`.
- [x] Step 08 — AI-dagplanning per verblijfsdag → [done](done/step-08-ai-dagplanning.md)

## Vervolgstappen (openstaand)

| Step | Plan-bestand | Kort doel |
|------|--------------|-----------|
| 09 | [step-09-rollen-rechten.md](step-09-rollen-rechten.md) | Rollen (owner=admin, member=editor), reis-aanvragen met goedkeuring, registratie ("lid worden") |

Waarom sequentieel: de stappen raken deels dezelfde bestanden (`server.ts`, `App.tsx`,
`MyItineraryView.tsx`, `LoginView.tsx`). Parallel werken geeft merge-conflicten.
Uitzondering: niet-opeenvolgende stappen (bv. 07 samen met 08) mogen parallel mits
ze geen gemeenschappelijke bestanden raken — check de "Betrokken bestanden"-secties.

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
