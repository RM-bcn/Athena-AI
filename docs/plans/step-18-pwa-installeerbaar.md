# Step 18 — PWA: installeerbare app met offline-ondersteuning (Vercel)

## Probleem / doel

Athena AI wordt tijdens de vakantie gebruikt op telefoons, mogelijk met slecht of
géén bereik (ferries, stranden). Nu is de site alleen online bruikbaar. Doel: een
**installeerbare PWA** die:

1. op Android/Chrome en iOS/Safari ("Zet op beginscherm") standalone start, met
   eigen icoon en naam;
2. bij offline start nog opent (app-shell gecached);
3. itinerary/dagplanning/chat-favorieten én **Reisdagboek-foto's** offline toont;
4. gehost blijft op Vercel zonder wijzigingen aan serverless-API's.

## Precondities (vóór branch!)

1. Foto-/tijdlijn-feature (PR #44) staat op main: `git checkout main && git pull`
   en controleer dat `src/components/TijdlijnView.tsx` bestaat.
2. `git diff --name-only origin/main` is leeg (lokale wijzigingen committen of stashen).
3. Windows/PowerShell: gebruik overal `npm.cmd`.

## Gekozen aanpak

- **`vite-plugin-pwa`** (Workbox `generateSW`) i.p.v. handgeschreven SW: integreert
  met `vite build`, genereert gehasht precache-manifest, werkt op Vercel zonder
  extra infra.
- **`registerType: 'autoUpdate'`** + **`injectRegister: 'script-defer'`**: stille
  updates bij volgend bezoek; géén virtuele module-imports → tsconfig en
  `vite-env.d.ts` ongewijzigd.
- **Manifest in `vite.config.ts`** (één bron van waarheid).
- **Icons éénmalig via `sharp`** gegenereerd uit inline SVG; PNG's worden gecommit,
  productie-build hangt niet van sharp af.
- **Cachingstrategie**:
  | Inhoud | Strategie | Reden |
  |---|---|---|
  | App-shell (js/css/html/fonts-lokaal/icons) | Precache | Offline start |
  | `/api/*` **alleen GET** | NetworkFirst (8 s timeout) | Itinerary/dagplanning/favorieten/dayphotos-metadata offline leesbaar |
  | API POST/DELETE | Nooit cachen | Auth + mutaties |
  | `res.cloudinary.com` (Reisdagboek-foto's) | **CacheFirst**, maxEntries 300, maxAge 90 dagen | URLs immutabel; vakantie = honderden foto's; dataverbruik op ferries |
  | `lh3.googleusercontent.com` (hotel-images) | StaleWhileRevalidate, maxEntries 60, 30 dagen | Strakke quota |
  | Google Fonts css/files | SWR / CacheFirst | Fonts offline |

---

## Sub-agent-orkestratie

Deze stap wordt door **één hoofdagent** uitgevoerd. Ondersteuning door sub-agents
(tool: Task) als volgt:

| Fase | Agent | Taak | Parallel? |
|---|---|---|---|
| 0. Preflight | `explore` (quick) | Verifieer repo-status: main actueel, geen bestaande SW/manifest-sporen | nee, eerst |
| 1–4. Config/build | hoofdagent zelf | Blokken 1 t/m 4 (package.json, vite.config.ts, icons, index.html, vercel.json) | — |
| 5–6. UI-code | hoofdagent zelf | Blok 5 + 6 raken óók `App.tsx`; bewust sequentieel om merge-risico te vermijden | — |
| 7. Docs | optioneel `general` | Blok 7 (docs/plans/README.md-index + dit bestand) | ja, los van code |
| 8. Verificatie | `general` | Na build: controleer `dist/` (sw.js, manifest.webmanifest, registerSW.js, icons/), draai lint+test, vang output af | nee, laatst |

**Waarom geen parallelle code-editors:** alle agenten delen één git-worktree;
blok 5 en 6 editen beide `App.tsx`. Parallellisme geeft commit/index-conflicten.
Alleen docs (blok 7) en verificatie zijn veilig los te koppelen.

---

## Algemene instructies voor de agent

- Volg AGENTS.md: branch `step/18-pwa-installeerbaar` vanaf verse main, atomische
  conventional commits, `npm.cmd run lint` + `npm.cmd run test` vóór de laatste
  commit, niet zelf mergen.
- UI-teksten Nederlands. Geen comments in code tenzij hier gevraagd.
- Raak `api/index.ts` en de endpoint-logica in `server.ts` niet aan.
- Regelnummers hieronder zijn hints (±5 regels); zoek altijd op de genoemde string.

---

## Blok 1 — Dependencies + plugin-config

### 1a. `package.json`

`npm.cmd install -D vite-plugin-pwa sharp` (devDependencies, lockfile meecommen).
Geen runtime-dependencies.

### 1b. `vite.config.ts` — volledige nieuwe inhoud

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script-defer',
        includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Athena AI — Mediterranean Concierge',
          short_name: 'Athena AI',
          description:
            'Jouw persoonlijke reisconcierge voor de Griekse Cycladen: itinerary, dagplanning, veerboot-hulp en AI-chat.',
          lang: 'nl',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#ffffff',
          theme_color: '#005BAE',
          categories: ['travel'],
          icons: [
            {src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png'},
            {src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png'},
            {src: 'icons/pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable'},
            {src: 'icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,jpg,webp,woff,woff2,webmanifest}'],
          globIgnores: ['**/server.cjs*'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({url}: {url: URL}) => url.origin === 'https://fonts.googleapis.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-css',
                expiration: {maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365},
              },
            },
            {
              urlPattern: ({url}: {url: URL}) => url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-files',
                expiration: {maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: ({url}: {url: URL}) => url.pathname.startsWith('/api/'),
              method: 'GET',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-get-cache',
                networkTimeoutSeconds: 8,
                expiration: {maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7},
                cacheableResponse: {statuses: [200]},
              },
            },
            {
              urlPattern: ({url}: {url: URL}) => url.origin === 'https://res.cloudinary.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'reisdagboek-fotos',
                expiration: {maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: ({url}: {url: URL}) => url.hostname === 'lh3.googleusercontent.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'external-images',
                expiration: {maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
          ],
        },
        devOptions: {enabled: false},
      }),
    ],
    resolve: {alias: {'@': path.resolve(__dirname, '.')}},
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
```

Als TypeScript op de urlPattern-typing zeurt: type-annotatie vereenvoudigen,
`lint` moet slagen.

**Commit 1:** `chore` → `chore(pwa): voeg vite-plugin-pwa toe met manifest en workbox-config`

---

## Blok 2 — Iconen genereren (sharp)

### 2a. Nieuw: `scripts/generate-icons.mjs`

Inline-SVG (merkkleuren: Aegean-blauw + amber-zon):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0080E0"/>
      <stop offset="1" stop-color="#005BAE"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <circle cx="384" cy="128" r="56" fill="#FFB020"/>
  <path d="M256 96 L396 416 H330 L304 352 H208 L182 416 H116 Z M256 208 L226 296 H286 Z" fill="#ffffff"/>
</svg>
```

Scriptlogica:

```js
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const SVG = `<svg …bovenstaand…</svg>`;
await mkdir('public/icons', {recursive: true});

const jobs = [
  ['pwa-192.png', 192, false],
  ['pwa-512.png', 512, false],
  ['pwa-maskable-192.png', 192, true],
  ['pwa-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];

for (const [file, size, maskable] of jobs) {
  const art = maskable ? Math.round(size * 0.72) : size;
  const pad = maskable ? Math.round((size - art) / 2) : 0;
  const svg = maskable ? SVG.replace(' rx="112"', '') : SVG;
  let pipeline = sharp(Buffer.from(svg)).resize(art, art);
  if (maskable) {
    pipeline = pipeline.extend({top: pad, bottom: pad, left: pad, right: pad, background: '#005BAE'});
  }
  await pipeline.resize(size, size).png().toFile(path.join('public/icons', file));
}

await sharp(Buffer.from(SVG)).resize(64, 64).png().toFile('public/favicon.png');
console.log('Icons generated');
```

### 2b. Uitvoeren en committeren

- `node scripts/generate-icons.mjs`
- Commit de gegenereerde PNG's mee: `public/favicon.png`,
  `public/icons/{pwa-192,pwa-512,pwa-maskable-192,pwa-maskable-512,apple-touch-icon}.png`.
- Check `.gitignore`: `public/` mag niet genegeerd zijn.

**Commit 2:** `feat(pwa): genereer app-iconen en favicon`

---

## Blok 3 — `index.html` head

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="description" content="Jouw persoonlijke reisconcierge voor de Griekse Cycladen." />
<meta name="theme-color" content="#005BAE" />
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Athena AI" />
```

Manifest-link injecteert de plugin automatisch bij build.

**Commit 3:** `feat(pwa): pwa-meta-tags en iconen in index.html`

---

## Blok 4 — Vercel headers

Volledige `vercel.json` (rewrites ongewijzigd):

```json
{
  "rewrites": [
    {"source": "/api/(.*)", "destination": "/api"}
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"},
        {"key": "Service-Worker-Allowed", "value": "/"}
      ]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [
        {"key": "Content-Type", "value": "application/manifest+json"},
        {"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}
      ]
    }
  ]
}
```

**Commit 4:** `chore(vercel): correcte cache-headers voor sw.js en manifest`

---

## Blok 5 — Installatie-banner + iOS-instructie + Settings-rij

### 5a. Nieuw: `src/pwa/useInstallPrompt.ts`

Hook zonder nieuwe deps: luistert op `beforeinstallprompt` (preventDefault, event
bewaren), detecteert `display-mode: standalone` (+ `(navigator as any).standalone`
voor iOS), iOS-useragent, luistert op `appinstalled`. Exporteert
`{canInstall, isStandalone, isIOS, promptInstall}` waarbij `promptInstall()` het
bewaarde event prompt en `'accepted' | 'dismissed' | null` teruggeeft.

### 5b. Nieuw: `src/components/PwaInstallBanner.tsx`

- Dismissible banner, kaartenstijl van de app (wit, `border-[#e1efff]`, rounded-2xl,
  knoppen `#005BAE`, font-['Inter']).
- Zichtbaar alleen als: `!isStandalone`, flag `athena_pwa_install_dismissed !== '1'`
  (localStorage), en gebruiker ingelogd of gast.
- Variant 1 (`canInstall`): "Installeer Athena AI als app" + "Werkt ook offline
  tijdens je reis" + knop **Installeren** (`promptInstall()`) + sluitkruisje zet
  de flag.
- Variant 2 (`isIOS && !isStandalone`): "Zet Athena AI op je beginscherm" met
  Delen-icoon-instructie. Geen knop.
- Verbergen zodra `isStandalone` waar wordt.

### 5c. Montage in `src/App.tsx`

Render `<PwaInstallBanner />` vlak boven de bestaande `{notice && …}`-toast, vaste
positie bottom-center (`z-[55]`).

### 5d. Settings-rij in `src/components/SettingsView.tsx`

In de opties-lijst (na de "Taal"-rij) één rij met lucide-icoon `Smartphone`:

- Titel "App"; status dynamisch via de hook:
  - standalone → "Geïnstalleerd — je gebruikt Athena AI als app";
  - `canInstall` → knop **Installeren**;
  - iOS niet-standalone → hinttekst over Delen → Zet op beginscherm;
  - anders → "Open deze site in Chrome of Safari om te installeren".

**Commit 5:** `feat(ui): installeer-banner met ios-instructie en settings-rij`

---

## Blok 6 — Offline-indicator + eerlijke meldingen (chat + foto's)

### 6a. Nieuw: `src/components/OfflineBanner.tsx`

- Fixed balk direct onder de TopHeader (ca. `top-[52px] md:top-[68px]`, `z-30`),
  zichtbaar als `!navigator.onLine` (listeners `online`/`offline`).
- Tekst: "Je bent offline — je ziet de laatst gesynchroniseerde gegevens." amber.

### 6b. Montage in `App.tsx`

`<OfflineBanner />` direct binnen de root-div, vóór `<Sidebar/>`.

### 6c. Eerlijke offline chat-melding (in `App.tsx`, `handleSendMessage`)

In het non-JSON-fallback-pad én het `catch`-blok (fallbackAiMsg): als
`!navigator.onLine`, gebruik i.p.v. de huidige tekst:

> "Je bent op dit moment offline, dus ik kan de AI-reiscocierge niet raadplegen.
> Je vraag staat wel in je geschiedenis — verstuur hem opnieuw zodra je weer
> verbinding hebt (bijv. op de ferry of bij de hotel-wifi)."

### 6d. Offline guards voor Reisdagboek (in `App.tsx`)

- `handleAddDayPhoto`: vóór de fetch — als `!navigator.onLine` →
  `{ success: false, error: 'Je bent offline. Foto opslaan kan zodra je weer verbinding hebt.' }`.
- `handleGenerateCaption`: idem → `"Je bent offline — bijschriften genereren vereist een verbinding."`.

**Commit 6:** `feat(ui): offline-indicator en eerlijke offline chat- en fotomeldingen`

---

## Blok 7 — Docs

- `docs/plans/README.md`: onder "Afgerond" toevoegen:
  `- [ ] Step 18 — PWA: installeerbare app met offline-ondersteuning → [plan](step-18-pwa-installeerbaar.md)`.
- Dit planbestand aanmaken.

**Commit 7:** `docs: registreer stap 18 in plannen-index`

---

## Acceptatiecriteria

- [ ] `npm run build` produceert `dist/sw.js`, `dist/manifest.webmanifest`,
      `dist/registerSW.js`, `dist/favicon.png`, `dist/icons/*`; index.html bevat
      manifest-link + theme-color.
- [ ] DevTools Application-paneel: manifest geldig (geen icon-warnings), SW
      activeert foutloos; Lighthouse "Installable" groen.
- [ ] `curl -I https://<preview>/sw.js` → `cache-control: public, max-age=0, must-revalidate`.
- [ ] Airplane-modus: app opent; "Mijn Reis" toont itinerary/dagplanning;
      chat-favorieten beschikbaar; offline-balk zichtbaar.
- [ ] Reisdagboek: na één keer bekijken zijn foto's zichtbaar bij offline reload
      (CacheFirst); foto toevoegen offline geeft de Nederlandse offline-melding.
- [ ] Android Chrome: install-banner verschijnt, installeren lukt, standalone
      start met icoon.
- [ ] iOS Safari: instructiekaart zichtbaar; "Zet op beginscherm" geeft
      standalone-start met apple-touch-icon.
- [ ] API POST/DELETE (login, sheets/save, profile/update, chat, dayphotos)
      werken normaal en worden nooit uit cache bediend.
- [ ] `npm.cmd run lint` en `npm.cmd run test` slagen.
- [ ] Geen endpoints of foto-componenten inhoudelijk gewijzigd (alleen guards in App.tsx eromheen).

## Verificatiestappen (lokaal, PowerShell)

1. `npm.cmd run lint` → `npm.cmd run test` → `npm.cmd run build`.
2. `dist\` controleren: sw.js, manifest.webmanifest, registerSW.js, favicon.png, icons\.
3. `$env:NODE_ENV='production'; npm.cmd run start` → http://localhost:3000:
   Manifest + Service Workers checken; daarna Offline-throttling + hard reload.
4. Vercel preview deployen; zelfde checks remote; install-test op echte telefoons.

## Risico's & mitigaties

| Risico | Mitigatie |
|---|---|
| Oude SW blijft na deploy hangen | autoUpdate + no-cache header op `/sw.js` |
| Precache te groot | limiet 3 MB (jpg is 1,1 MB); `globIgnores: ['**/server.cjs*']` |
| Verlopen auth-response gecached | alleen status-200 GET's; 401 nooit in cache |
| iOS heeft geen install-prompt | expliciete iOS-instructiekaart; `navigator.standalone`-detectie |
| Notch/safe-area in standalone | `viewport-fit=cover` aanwezig; safe-area-padding pas doen als visueel nodig (aparte stap) |
| Merge-conflict met vers geprde tijdlijn-feature | preconditie: eerst `git pull`; App.tsx-edits pas ná pull en sequentieel |

## Buiten scope (bewust)

- Pushnotificaties / Background Sync (bv. veerboot-alerts, nu "Binnenkort" in Settings).
- Offline schrijf-wachtrij voor wijzigingen/foto-uploads.
- App-store wrapping (Capacitor/TWA).
- Safe-area layout-polijsting.

## Git-workflow

1. Branch vanaf verse main: `step/18-pwa-installeerbaar`.
2. Zeven commits zoals per blok genoemd.
3. Lint + tests vóór de laatste commit; resultaten in de PR.
4. PR naar `main` met verwijzing naar dit plan + aangevinkte criteria. Niet zelf mergen.
