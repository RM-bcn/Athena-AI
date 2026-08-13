# Chat background refresh

## Doel

Maak de achtergrond van de chatweergave rustiger en visueel aantrekkelijker voor
Athena AI. De huidige achtergrond is in de praktijk bijna volledig wit doordat
`ChatInterfaceView` een externe afbeelding bedekt met een overlay van ongeveer
92% tot 96% wit. De Mediterrane sfeer mag zichtbaar worden, maar tekst,
chatbubbels, de weather card en de invoerbalk moeten goed leesbaar blijven.

Dit document is de uitvoerinstructie voor een kleiner model. Voer de wijziging
niet uit buiten de scope hieronder.

## Repositorycontext

- Project: React 19 + TypeScript + Vite + Tailwind CSS v4.
- Relevante component: `src/components/ChatInterfaceView.tsx`.
- Huidige achtergrondconstante: `CHAT_BACKGROUND_IMAGE` in
  `src/data/initialData.ts`.
- Bestaand lokaal beeld: `src/assets/images/greece_sunset_bg_1785583337875.jpg`.
- Beschikbare checks: `bun run lint`, `bun run test` en `bun run build`.
- De huidige werkbranch is `feature/ferries-transfers`, gebaseerd op de
  nieuwste lokale commit `bf1ee80` en een commit voor op `origin/main`.

## Scope

Wel doen:

- Verfris alleen de visuele achtergrond van de chatpagina.
- Gebruik bij voorkeur het bestaande lokale Mediterrane beeld. Voeg geen nieuw
  beeld, externe download of dependency toe.
- Gebruik een gelaagde CSS-overlay met een zachte lucht/blauwe basis en een
  subtiele terracotta accentkleur. Het beeld moet herkenbaar blijven rond de
  chatcontent, maar niet concurreren met de tekst.
- Houd de bestaande chatstructuur, spacing, weather card, berichten, quick
  actions, attachment flow en inputgedrag intact.
- Verwijder de externe `CHAT_BACKGROUND_IMAGE`-referentie alleen als die na de
  wijziging nergens meer gebruikt wordt. Doe geen andere cleanup.

Niet doen:

- Geen wijzigingen aan backend, API, auth, weerlogica, tripdata of chatgedrag.
- Geen wijzigingen aan `LoginView`, `MyItineraryView` of globale layout buiten
  wat strikt nodig is voor de chatachtergrond.
- Geen nieuwe packages, fonts, animaties of grote CSS-architectuur.
- Geen aanpassingen aan `.env*`, `dist/`, `node_modules/` of `.vercel/`.
- Geen reset, rebase, force push of overschrijven van wijzigingen van een
  andere gebruiker.

## Implementatieplan

1. Controleer vanuit de repository-root de Git-status. Als er wijzigingen van
   een andere gebruiker staan, behoud ze en meld ze voordat je gaat editen.
2. Maak vanaf de huidige `HEAD` een aparte branch:
   `feature/chat-background-refresh`.
   Baseer deze branch niet opnieuw op `origin/main`; de actuele ferries-
   wijzigingen moeten behouden blijven.
3. Lees eerst `ChatInterfaceView.tsx`, `initialData.ts`, `index.css` en dit
   document. Beperk de codewijziging daarna tot de chatachtergrond.
4. Gebruik het lokale beeld als achtergrondbron. Een import in
   `ChatInterfaceView.tsx` is de eenvoudigste route. Als je de constante in
   `initialData.ts` verwijdert, doe dat alleen wanneer de zoekopdracht bevestigt
   dat er geen andere gebruikers zijn.
5. Vervang de huidige bijna-witte overlay door een lichte, maar duidelijk
   transparantere compositie. Gebruik dit als startpunt en tune alleen op basis
   van leesbaarheid:

   ```ts
   backgroundImage: [
     'linear-gradient(180deg, rgba(236, 248, 255, 0.58) 0%, rgba(248, 251, 255, 0.78) 54%, rgba(255, 255, 255, 0.94) 100%)',
     'linear-gradient(115deg, rgba(0, 91, 174, 0.12), rgba(226, 114, 91, 0.10))',
     `url('${localBackgroundImage}')`,
   ].join(', '),
   backgroundPosition: 'center',
   backgroundSize: 'cover',
   ```

   De exacte waarden mogen beperkt worden aangepast. Vermijd opnieuw een
   vrijwel ondoorzichtige witte laag. Houd de onderkant lichter zodat de vaste
   interactiebalk leesbaar blijft.
6. Controleer dat desktop en mobiel geen horizontale overflow krijgen en dat
   de bestaande fixed header, weather card en bottom bar niet van positie of
   gedrag veranderen.
7. Voer alle checks uit:

   ```sh
   bun run lint
   bun run test
   bun run build
   ```

8. Bekijk de chat handmatig als dat in de omgeving mogelijk is, minimaal op
   een brede desktopviewport en een mobiele viewport. Controleer de punten uit
   de acceptatiecriteria hieronder.
9. Inspecteer de diff. Stage alleen de bronbestanden die voor deze wijziging
   nodig zijn. Stage geen coordinator-document, secrets of build-output.
10. Maak geen commit, push of pull request zonder expliciete opdracht. Als later
    om een commit wordt gevraagd, gebruik dan:
    `style: refresh chat background`
11. Rapporteer de branch, de ongestagede/staged status, gewijzigde bestanden,
    testresultaten en eventuele visuele beperking.

## Visuele acceptatiecriteria

- De chatachtergrond is zichtbaar als een rustige Mediterrane scene; hij voelt
  niet als een lege witte pagina.
- De afbeelding is ondersteunend en niet dominant achter de berichten.
- Assistant- en user-bubbels houden voldoende contrast met de achtergrond.
- De weather card blijft duidelijk leesbaar en behoudt zijn huidige positie.
- Quick-action chips en de inputbalk blijven herkenbaar en bruikbaar.
- Op mobiel blijft de layout binnen de viewport zonder horizontaal scrollen.
- De achtergrond gebruikt een lokale, gebundelde asset en is niet afhankelijk
  van een externe image-host voor dit onderdeel.

## Git-veiligheidsregels

- Werk alleen op `feature/chat-background-refresh`.
- Behoud bestaande wijzigingen die niet bij deze taak horen.
- Gebruik geen `git reset --hard`, `git checkout --`, interactieve Git-commando’s
  of force push.
- Als de branch al bestaat, inspecteer hem eerst en maak geen nieuwe branch met
  dezelfde naam over bestaande historie heen.
- De coordinator-brief mag ongetrackt blijven; stage hem niet tenzij daar later
  expliciet om gevraagd wordt.

## Verwachte eindrapportage

Geef na uitvoering compact antwoord met:

- branchnaam en Git-status; noem een commit SHA alleen als er expliciet een
  commit is gemaakt;
- gewijzigde bestanden;
- resultaat van `bun run lint`, `bun run test` en `bun run build`;
- bevestiging dat desktop en mobiel zijn gecontroleerd;
- eventuele openstaande beperking of vervolgactie.
