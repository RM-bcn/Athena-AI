# Step 10 — Accommodatie bewerken ("Wijzigen"-flow) + nieuwe velden

## Probleem

De sectie "Geboekte Accommodaties" toont per verblijf (stay) een kaartje met
bestemming, nachten, hotelnaam, datums, status en een knop **"Wijzigen"**.
De knop "Wijzigen" opent echter altijd de modal **in een nieuwe lege toestand**
(`handleChangeLink` in `src/components/MyItineraryView.tsx` regel 145-147 roept
`onUnlinkStayBooking` + `onOpenNewBooking('manual', ...)` aan). De modal weet niet
welk record hij moet bewerken: velden zijn leeg, prijs staat op de default 150 en
er wordt een **nieuwe** rij aangemaakt i.p.v. de bestaande te updaten.

Daarnaast mist de modal een aantal nuttige velden (adres, check-in/out-tijd, link)
die wél in het formulier horen, in de Google Sheet opgeslagen en op het kaartje
getoond moeten worden.

## Doel

1. **Edit-modus**: "Wijzigen" geeft de unieke `id` van de boeking door; de modal
   laadt het record en vult alle velden vooraf in. Opslaan = bestaande rij **updaten**
   (op id). Toevoegen blijft zoals nu (INSERT).
2. **Nieuwe velden**: `Adres`, `Check-in tijd`, `Check-out tijd`, `Link naar
   accommodatie` — toevoegen aan formulier, sheet (nieuwe kolommen) en kaartje.
3. **Dropdown-fix**: bestemming in edit-modus = de bestemming van het record; in
   toevoeg-modus een neutrale "Kies bestemming"-optie (geen datum-suffix van een
   andere boeking).

## Betrokken bestanden

- `src/types.ts` — `Accommodation` uitbreiden met: `address?`, `checkInTime?`,
  `checkOutTime?`, `link?` (en evt. `island?` + `pricePerNight?` — kijk wat al
  bestaat; `island` en `pricePerNight` zitten al in de sheet-parser
  `server/sheets-service.ts` regel 594-606 en in de App.tsx-add-logica, maar niet
  in het `Accommodation`-type).
- `src/components/Modals/AddBookingModal.tsx` — edit-modus (prefilled + titel +
  submit-gedrag), nieuwe velden, dropdown-fix.
- `src/components/MyItineraryView.tsx` — "Wijzigen" geeft `bookingId` door i.p.v.
  unlink-only; kaartje toont nieuwe velden (adres, tijden, link) wanneer ingevuld.
- `src/App.tsx` — nieuwe `handleUpdateBooking(booking)` (update op id i.p.v. insert);
  `onOpenNewBooking` ondersteunt een `editBookingId`; doorgeven aan de modal;
  links naar een bewerkte boeking intact houden.
- `server/sheets-service.ts` — `bookingHeaders` (regel 451) en de `bookingRows`-mapper
  (452-462) uitbreiden met 4 nieuwe kolommen; de `customBookings`-parser in
  `loadTripFromSheet` (594-606) uitbreiden met de nieuwe velden.
- `server/trip-validation.test.ts` — kijk of er testdata met booking-rijen is en breid
  indien relevant uit (alleen als het netjes past).

## Uitwerking

### 1. Data-model (`src/types.ts`)

Breid `Accommodation` uit:

```ts
export interface Accommodation {
  id: string;
  name: string;
  location: string;
  status: 'CONFIRMED' | 'PAST STAY' | 'PENDING';
  image: string;
  checkIn?: string;     // YYYY-MM-DD
  checkOut?: string;    // YYYY-MM-DD
  island?: string;      // eiland voor dropdown + kaartje
  pricePerNight?: number;
  address?: string;     // straat + huisnummer, postcode, plaats
  checkInTime?: string; // bv. 15:00
  checkOutTime?: string;// bv. 11:00
  link?: string;        // URL (Booking/Airbnb)
}
```

### 2. Google Sheets (`server/sheets-service.ts`)

- Nieuwe headers (na `Image`):
  `Island, PricePerNight, CheckInTime, CheckOutTime, Address, Link`
  Let op: `Island` en `PricePerNight` bestaan al als kolommen in de seed-headers
  (`CustomBookings!A1:I1` → ID..Image). De huidige `bookingHeaders`-const mist ze
  echter in de `saveTripToSheet`-write (regel 451 heeft 9 kolommen). Breng **de
 zelfde kolomvolgorde** overal overeen:
  `["ID", "Name", "Location", "Status", "Island", "PricePerNight", "CheckIn", "CheckOut", "Image", "Address", "CheckInTime", "CheckOutTime", "Link"]`
- `bookingRows`-mapper: `b.island`, `b.pricePerNight`, `b.address`, `b.checkInTime`,
  `b.checkOutTime`, `b.link` toevoegen op de juiste index.
- `CustomBookings!A1:M...` range in de batchUpdate (regel 508) uitbreiden.
- `loadTripFromSheet`-parser (594-606): nieuwe velden lezen
  (`row[9] address`, `row[10] checkInTime`, `row[11] checkOutTime`, `row[12] link`).
- Zorg dat `getOrCreateSpreadsheet`-seed-headers (regel 292) ook de nieuwe kolommen
  bevatten, zodat een verse sheet correct opgezet wordt.

### 3. Modal edit-modus (`AddBookingModal.tsx`)

- Nieuwe prop: `editingBooking?: Accommodation | null`.
- Bij openen:
  - edit-modus → `setName/location/island/status/price/checkIn/checkOut/address/
    checkInTime/checkOutTime/link` uit `editingBooking`.
  - toevoeg-modus → zoals nu (leeg, `pricePerNight` default `''` i.p.v. `'150'`
    zodat de placeholder zichtbaar blijft).
- Titel/knop: "Boeking Wijzigen" + submit "Wijzigingen Opslaan" in edit-modus;
  "Boeking Toevoegen" + "Boeking Opslaan" in toevoeg-modus.
- Submit:
  - edit-modus → `onUpdateBooking({ ...editingBooking, ...formValues })`.
  - toevoeg-modus → `onAddBooking` (ongewijzigd).
- Dropdown bestemming:
  - edit-modus → `value={selectedIsland}` uit het record (zonder datum-suffix).
  - toevoeg-modus → eerste optie `<option value="">Kies bestemming</option>`
    (disabled/geen default selectie van een stay).
  - De opties: gebruik stay-namen zonder datums (korte labels), óf de vaste
    eilandenlijst + de ingevulde bestemming als free-option. Kies de eenvoudigste
    consistente aanpak: opties = unieke stay-islands + ingevulde `editingBooking.island`
    als die er niet tussen zit. Geen `(start - end)`-suffix in de labels.
- Nieuwe formuliervelden (in een grid, na de bestaande datum/status-rijen):
  - `Adres` (text, placeholder "straat + huisnummer, postcode, plaats")
  - `Check-in tijd` (type="time") + `Check-out tijd` (type="time")
  - `Link naar accommodatie` (type="url", placeholder "https://booking.com/...")

### 4. App-logica (`src/App.tsx`)

- `handleAddBooking` blijft (INSERT, huidige gedrag).
- Nieuw `handleUpdateBooking(booking: Accommodation)`:
  - `nextBookings = customBookings.map(b => b.id === booking.id ? booking : b)`;
  - `updateAndSaveTrip(currentTrip, nextBookings, stayBookingLinks)` zodat de sheet
    gesynchroniseerd wordt;
  - als de boeking aan een stay gekoppeld is (`stayBookingLinks`), werk ook
    `accommodationName` van die stay bij (naamswijziging).
- `handleOpenNewBooking`-signatuur uitbreiden: accepteert optioneel `bookingId`.
  Bij een geldige id → `setBookingMode('manual')` + `setEditingBooking(record)` en
  modal openen; anders `setEditingBooking(null)`.
- `MyItineraryView`: "Wijzigen" op een gekoppeld kaartje geeft nu
  `onOpenNewBooking('manual', stay.island, bookingId)` waar `bookingId` =
  `linkInfo.matchedBooking.id`.

### 5. Kaartje-uitbreiding (`MyItineraryView.tsx`)

- Onder de datums, wanneer het gekoppelde record die velden heeft:
  - `address` als regel met `MapPin`-icoon.
  - `checkInTime`/`checkOutTime` als regel (bv. "In: 15:00 · Uit: 11:00").
  - `link` als klikbare link "Bekijk accommodatie" (`<a target="_blank">`).
- Toon alleen wanneer ingevuld (geen lege regels).

## Acceptatiecriteria

- [ ] "Wijzigen" op een gekoppeld kaartje opent de modal met ALLE velden vooraf
      ingevuld (naam, bestemming met correcte dropdown-optie, wijk/buurt, prijs,
      check-in/out-datum, status) en de titel "Boeking Wijzigen".
- [ ] Opslaan in edit-modus **update** de bestaande rij op id; geen dubbele rij in
      de sheet; het kaartje toont de nieuwe waarden.
- [ ] Opslaan in toevoeg-modus blijft een nieuwe rij INSERTEN (huidig gedrag).
- [ ] De vier nieuwe velden (adres, check-in tijd, check-out tijd, link) zijn in te
      vullen, worden opgeslagen in de sheet, bij hernieuwd bewerken vooraf ingevuld
      en op het kaartje getoond (link klikbaar) wanneer ingevuld.
- [ ] Bestemmings-dropdown in toevoeg-modus toont "Kies bestemming" (geen standaard
      selectie van een andere boeking); in edit-modus de bestemming van het record.
- [ ] Sheet-kolommen en -ranges zijn overal consistent (headers, write, read, seed).
- [ ] `npm run lint` en `npm run test` slagen.

## Verificatie (lokaal)

1. `npm run dev` → Itinerary → "Wijzigen" op een gekoppeld kaartje → modal prefilled.
2. Prijs + adres + link wijzigen → opslaan → sheet heeft één rij (geen duplicaat),
   kaartje toont nieuwe prijs + adres + klikbare link.
3. Handmatige toevoeg opnieuw testen (leeg formulier, INSERT, "Kies bestemming").
4. Google Sheet openen: nieuwe kolommen bestaan; data correct in/uit.

## Git-workflow

1. Branch vanaf verse `main`: `step/10-booking-edit`.
2. Commits, bijv.:
   - `feat(types): extend Accommodation with address, times and link`
   - `feat(sheets): persist and load new booking fields (columns J-M)`
   - `feat(modal): edit mode with prefilled data + new fields + dropdown fix`
   - `feat(app): update booking by id, keep stay links intact`
   - `feat(itinerary): show address, times and link on booking cards`
3. `npm run lint` + `npm run test` vóór de laatste commit.
4. PR naar `main` met acceptatiecriteria afgevinkt. Niet zelf mergen.

## Buiten scope

- Verwijderen van losse boekingen via de kaartjes (bestaat nog niet; er is alleen
  unlink) — apart oppakken als gewenst.
- Meerdere boekingen per stay tegelijk tonen (kaartje is per stay) — later.
- Validatie van check-in/out-tijden (gratis tekstveld `time`) — alleen basic `time`-input.
