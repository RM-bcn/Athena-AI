# Step 12 — Gasten geen toegang tot dagplanning-bewerking

## Probleem

In de gastmodus (via `?code=ATH-2026`) zien gasten nog steeds knoppen voor het
bewerken van de dagplanning. Dit is verwarrend en niet logisch: gasten kunnen
geen chat openen en hebben dus geen manier om een dagplanning te genereren of
te wijzigen. De knoppen "Dagplanning bewerken" en "Vraag Athena (dagplanning)"
zouden verborgen moeten worden voor gasten.

## Doel

Verberg alle dagplanning-bewerkingsknoppen voor gasten in `MyItineraryView`:
- "Vraag Athena (dagplanning)" — opent chat (gasten hebben geen chat)
- "Dagplanning bewerken" — opent de editor (gasten kunnen niet bewerken)

Gasten zien nog steeds de dagplanning-zelf (de dagkaartjes met activiteiten),
alleen zonder de knoppen om deze aan te passen.

## Betrokken bestanden

- `src/components/MyItineraryView.tsx` —条件ele rendering van de twee knoppen
  op basis van `isGuestMode` of `canEdit`-equivalent.

## Uitwerking

### 1. `MyItineraryView.tsx` — knoppen verbergen

De twee knoppen staan op regels 638-658:

```tsx
{/* Huidig: alleen check op callback-functie */}
{onAskDayPlanInChat && (
  <button onClick={() => onAskDayPlanInChat(stay)} ...>
    Vraag Athena (dagplanning)
  </button>
)}

{onSaveDayPlans && (
  <button onClick={() => setDayPlanEditorStay(stay)} ...>
    Dagplanning bewerken
  </button>
)}
```

**Wijziging:** Voeg een `!isGuestMode` check toe aan beide knoppen:

```tsx
{!isGuestMode && onAskDayPlanInChat && (
  <button onClick={() => onAskDayPlanInChat(stay)} ...>
    Vraag Athena (dagplanning)
  </button>
)}

{!isGuestMode && onSaveDayPlans && (
  <button onClick={() => setDayPlanEditorStay(stay)} ...>
    Dagplanning bewerken
  </button>
)}
```

`isGuestMode` is al beschikbaar als prop (regel 53, 84).

### 2. Optioneel: `DayPlanEditorModal` — `onAskChat` beschermen

In `DayPlanEditorModal.tsx` (regel 340-348) staat een "Genereer met AI in de chat"
knop die `onAskChat` aanroept. Aangezien gasten dit modal niet meer kunnen openen
(stap 12.1), is een extra check hier niet strikt noodzakelijk, maar voor
defensieve programmeerstijl kunnen we een `!isGuestMode`-check toevoegen als de
modal ooit vanuit een andere context wordt geopend.

Voorlopig: geen wijziging nodig in `DayPlanEditorModal` — de modal wordt alleen
geopend via de knop die we in stap 12.1 verbergen.

## Acceptatiecriteria

- [ ] Gast (via `?code=ATH-2026`) ziet géén "Vraag Athena (dagplanning)"-knop.
- [ ] Gast ziet géén "Dagplanning bewerken"-knop.
- [ ] De dagkaartjes zelf (activiteiten, eettips, etc.) zijn nog wel zichtbaar
      voor gasten.
- [ ] Ingelogde gebruikers (owner/member) zien de knoppen nog steeds.
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → inloggen → Itinerary → dagplanning-knoppen zichtbaar.
2. Gastmodus openen (nieuw tabblad met `?code=ATH-2026`) → knoppen niet zichtbaar,
   dagkaartjes wel.
3. Uitloggen → gastmodus → knoppen niet zichtbaar.

## Git-workflow

1. Branch vanaf verse `main`: `step/12-gast-verbod-dagplanning`.
2. Commit: `fix(client): hide day plan edit buttons for guests`.
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.
