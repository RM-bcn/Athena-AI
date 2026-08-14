# Athena-AI — Routekaart & werkwijze (steps)

Overzicht van de geplande stappen voor Athena AI. Uitgevoerde stappen staan
gearchiveerd in [done/](done/). Elke openstaande stap heeft een eigen plan-bestand
dat door een agent uitgevoerd kan worden.

## Afgerond (stap 0 + 01–09)

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
- [x] Step 09 — rollen, reis-aanvragen & goedkeuring, registratie → [done](done/step-09-rollen-rechten.md)

## Vervolgstappen (openstaand)

| Step | Plan-bestand | Kort doel |
|------|--------------|-----------|
| 10 | [step-10-accommodatie-bewerken.md](step-10-accommodatie-bewerken.md) | "Wijzigen"-flow van geboekte accommodaties (edit-modus + UPDATE), nieuwe velden (adres, check-in/out-tijd, link) |
| 11 | [step-11-reisdagboek-stories.md](step-11-reisdagboek-stories.md) | Reisdagboek (dagelijkse foto's + tekst) en "Vandaag"-stories (fullscreen-strip met AI-bijschrift) |
| 12 | [step-12-gast-verbod-dagplanning.md](step-12-gast-verbod-dagplanning.md) | Verberg dagplanning-bewerkingsknoppen voor gasten |
| 13 | [step-13-gast-ai-dagoverzicht.md](step-13-gast-ai-dagoverzicht.md) | AI-dagoverzicht voor gasten (één-klik-samenvatting met weer, activiteiten, regio-info) |
| 14 | [step-14-groq-model-rotatie.md](step-14-groq-model-rotatie.md) | Zelfherstellend tegen Groq-modelrotatie: dynamische model-ontdekking, ranking, self-healing en configureerbaar Gemini-model |

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
