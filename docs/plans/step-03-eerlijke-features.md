# Step 03 — Nep-features eerlijk maken (MissedFerry, Trivago, alerts, export)

## Probleem

Verschillende features doen alsof ze meer doen dan ze echt doen. Voor reizigers op een
echte trip is dat misleidend (en voor noodfuncties zelfs gevaarlijk):

1. **Missed Ferry modal** (`src/components/Modals/MissedFerryModal.tsx`): hardcoded
   opties, ongeldige tijden ("14:15 AM", "17:30 PM"), "Book Now" doet een nep-booking
   ("Seat Hold Confirmed!", "e-tickets will be sent to your email", "Athena has
   notified your Naxos hotel") en verstuurt een chatbericht dat beweert dat er geboekt is.
2. **"Trivago Hotel Finder"**: `/api/suggest-hotels` geeft AI/voorbeeld-hoteldata met
   verzonnen ratings en "Trivago Best Deal"-tags; er is geen Trivago-integratie en geen
   boekingslink. Misleidend merkgebruik.
3. **Nood-/belknoppen zijn alerts**: Emergency (112), Call Taxi en "Call Hotel" tonen
   alleen `alert("Calling ...")` — er wordt niets gebeld.
4. **"Export PDF"** is `window.print()` van de hele pagina (incl. sidebar), geen
   nette PDF-export van het reisschema.

## Doel

1. MissedFerry wordt een eerlijke "assistentie"-flow: geen nep-booking, geen valse
   beloftes, tijden gecorrigeerd, en de optie wordt doorgegeven aan de chat (die via de
   live-search tools échte actuele veerdiensten kan opzoeken).
2. "Trivago" verdwijnt uit de UI; de feature heet "AI Hotel Suggesties" met een
   duidelijke disclaimer dat het voorbeeldsuggesties zijn.
3. Nood-/belknoppen worden echte `tel:`-links met correcte nummers en eerlijke teksten.
4. Export PDF wordt ofwel een nette print-stylesheet (en hernoemd), ofwel expliciet
   gemarkeerd als "Afdrukken". Kies de minimal variant: print-CSS + hernoeming.

## Betrokken bestanden

- `src/components/Modals/MissedFerryModal.tsx` — volledige herwerking.
- `src/App.tsx` — `onTriggerEmergency`, `onCallTaxi` in QuickHelpView-props; callback
  voor MissedFerry ("alternatief doorgeven aan chat" i.p.v. "I booked...").
- `src/components/QuickHelpView.tsx` — noodknoppen als `<a href="tel:...">`; teksten.
- `src/components/Modals/AddBookingModal.tsx` — "Trivago"-teksten/labels hernoemen,
  disclaimer toevoegen.
- `src/components/MyItineraryView.tsx` — knoppen "Trivago Hotel Finder", "Trivago Style",
  "Export PDF"-label.
- `src/index.css` — print-stylesheet (`@media print`) die sidebar/header/knoppen verbergt
  en alleen de itinerary-content toont.
- `server.ts` — `/api/suggest-hotels` response voorzien van `"disclaimer": true`-achtig
  veld of de client zet er zelf een disclaimer bij (client-kant is voldoende; server
  alleen aanpassen als eenvoudig).

## Uitwerking

### 1. MissedFerryModal — eerlijke flow

- Koptekst bijwerken: "Hulp bij gemiste veerboot" + kleine print:
  "Deze vertrektijden zijn voorbeelden. Laat Athena via de chat je actuele
  alternatieven opzoeken."
- Tijden fixen: `14:15` en `17:30` (geen AM/PM achter een 24-uurstijd).
- "Book Now" → "Doorgeven aan chat". Na klik:
  - géén "Seat Hold Confirmed"-scherm;
  - callback roept `handleSendMessage` aan met een eerlijk bericht, bijv.:
    "We hebben waarschijnlijk de veerboot gemist. Athena, zoek de eerstvolgende
    alternatieve vertrekken vanaf <huidig eiland> en geef opties."
  - melding in de modal: "Athena zoekt nu live alternatieven voor je op in de chat."
- Verwijder de beloftes over e-tickets en "hotel is geïnformeerd".
- "Call Hotel" → `<a href="tel:+30...">` of verwijderen als er geen echt nummer is;
  kies: verwijderen en in plaats daarvan de chat-link benadrukken (eerlijker).
- De hardcoded opties mogen blijven als **duidelijk gelabelde voorbeelden**; het is
  geen vereiste om live ferry-data in deze modal te bouwen (dat doet de chat al).

### 2. Trivago → AI Hotel Suggesties

- Tekstvervangingen (grep op "Trivago"/"trivago" om alles te vinden):
  - "Trivago Hotel Finder" → "AI Hotel Suggesties"
  - "Zoek Hotel Suggesties (Trivago Style)" → "Zoek AI Hotel Suggesties"
  - "Trivago Best Deal"/"Trivago Top Keuze" → "AI Suggestie"/"Top Suggestie"
  - Andere merkverwijzingen in AddBookingModal.
- Disclaimer in AddBookingModal bij de suggesties:
  "Voorbeeldsuggesties van Athena AI — controleer zelf beschikbaarheid, prijzen en
  reviews op de boekingssite."
- Geen wijzigingen aan de API-logica zelf.

### 3. Nood-/belknoppen

- `onTriggerEmergency` → in QuickHelpView een `<a href="tel:112">` met tekst
  "Bel nu 112" + subtekst "Europees alarmnummer in Griekenland".
- `onCallTaxi` → `<a href="tel:+302285022444">` "Bel taxi (Naxos)" of vergelijkbaar
  echt nummer; als het nummer niet betrouwbaar is: verwijder de knop of maak er een
  chat-actie van ("Zoek een taxinummer via Athena").
- Verwijder de alert-implementaties in `App.tsx` (props kunnen weg of vervangen).
- "Pharmacy Nearby" blijft chat-actie (dat werkt al via live-search).

### 4. Export PDF

- Hernoem knop naar "Afdrukken / PDF".
- Voeg `@media print` toe in `src/index.css`:
  - verberg `aside` (sidebar), `header` (TopHeader), knoppen, modals, banners;
  - toon alleen de itinerary-hoofdcontent.
- Geen nieuwe dependency (geen jsPDF e.d.) — bewust minimal.

## Acceptatiecriteria

- [ ] MissedFerry-modal bevat geen "booked"-claims meer; tijden zijn geldig (geen "14:15 AM").
- [ ] "Doorgeven aan chat" verstuurt een eerlijk hulpbericht naar de chat (geen "I booked...").
- [ ] `grep -ri "trivago" src/` → 0 hits in UI-teksten (naam mag nog intern in
      comments/variabelen bestaan als functioneel, maar liever ook daar hernoemd).
- [ ] Emergency/Taxi zijn klikbare `tel:`-links; geen `alert("Calling ...")` meer.
- [ ] `grep -rn "alert(" src/` → alleen nog legitieme validatie-meldingen
      (geen nep-bel- of nep-sync-meldingen die een echte actie claimen).
- [ ] Print-venster toont alleen de itinerary (sidebar/header verborgen).
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → Quick Help openen, alle knoppen testen.
2. MissedFerry openen → "Doorgeven aan chat" → chat toont het hulpbericht.
3. AddBookingModal → "AI Hotel Suggesties" + disclaimer zichtbaar.
4. Ctrl+P → preview toont alleen de reisinhoud.

## Git-workflow

1. Branch vanaf verse `main`: `step/03-eerlijke-features`.
2. Commits, bijv.:
   - `fix(ferry): honest missed-ferry flow, valid times, pass to chat`
   - `refactor(ui): rename Trivago references to AI Hotel Suggesties + disclaimer`
   - `fix(help): emergency & taxi buttons become tel: links`
   - `feat(print): print stylesheet for itinerary export`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Echte ferry-API-integratie in de modal — de chat kan al live zoeken.
- Echte Trivago/Booking.com-integratie — niet gepland.
- jsPDF of andere PDF-libraries — niet gepland.
