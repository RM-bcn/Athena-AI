# Step 21 — PWA zelfherstel: noodknop, robuuste registratie en verse API-data

**Status:** in uitvoering
**Datum:** 24 aug 2026
**Branch:** `step/21-pwa-zelfherstel`

## Achtergrond

Gebruikers zagen soms een verouderde build op `athena-ai-roan.vercel.app`, ook na
"gegevens wissen" in Chrome. Diagnose (24 aug): de server zat correct op de nieuwste
deployment (bundel-markers en sw.js gecontroleerd), maar clients met een **oude service
worker** bleven gecachete HTML/JS uit de workbox-precache geserveerd krijgen. Los daarvan
kon de `NetworkFirst`-fallback op `api-get-cache` (TTL 7 dagen) af en toe verouderde
dagfoto's tonen bij een trage/time-outende verbinding.

## Wijzigingen

1. **Noodknop `/?pwa-reset=1`** (`index.html`, inline vóór het app-script):
   unregister alle service workers, verwijder alle Cache Storage-items, strip de param,
   éénmalige reload. Eén keer openen op een apparaat = apparaat definitief schoon.
2. **Robuuste SW-registratie** (`src/pwa/registerSW.ts`, nieuw):
   `navigator.serviceWorker.register('/sw.js', {scope:'/', updateViaCache:'none'})`,
   directe `registration.update()` na registratie en daarna elke 5 minuten.
   `vite.config.ts`: `injectRegister: null` (plugin-injectie uit, eigen registratie in
   `main.tsx` aangeroepen).
3. **Versie-handshake**: build-plugin schrijft `dist/version.json` met de commit-sha
   (`VERCEL_GIT_COMMIT_SHA`, fallback lokale git-sha). De client fetch't dit bestand met
   `cache: 'no-store'`, vergelijkt met `localStorage['athena_app_version']`; bij mismatch
   worden de caches `api-get-cache` en `html-cache` gepurged en wordt `registration.update()`
   getriggerd. Nieuwe versie verschijnt via de bestaande "Nieuwe versie beschikbaar"-banner.
4. **API uit de service worker**: de `runtimeCaching`-rule voor `/api/*` vervalt volledig —
   alle API-calls gaan altijd rechtstreeks naar het netwerk. Lost ook het incidentele
   "laden zonder foto's" op.
5. **Update-banner** (`App.tsx`) blijft op basis van `controllerchange`, nu met een
   first-load-guard zodat hij niet verschijnt bij de allereerste SW-registratie van een
   nieuw apparaat.

## Acceptatiecriteria

- [ ] Gegenereerde `sw.js` bevat geen `/api/*` runtime-caching meer.
- [ ] `athena-ai-roan.vercel.app/?pwa-reset=1` veegt SW + caches en landt op de actuele versie.
- [ ] Na een nieuwe deployment verschijnt binnen één herlaad de Vernieuwen-banner of direct de nieuwe versie.
- [ ] Geen reload-loops (param-strip + guards); `npm run lint`, `npm run test` en `npm run build` zijn groen.

## Bewust buiten scope

- Offline API-lezen vervalt; de app heeft al localStorage-state als offline fallback in de views.
- OfflineBanner header-offset (cosmetisch) — apart klein stapje later.
