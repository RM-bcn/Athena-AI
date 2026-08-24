import fs from 'fs';
import {execSync} from 'child_process';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import type {Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function resolveVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', {cwd: __dirname}).toString().trim();
  } catch {
    return 'dev';
  }
}

function versionFilePlugin(version: string): Plugin {
  return {
    name: 'athena-version-file',
    apply: 'build',
    closeBundle() {
      fs.writeFileSync(
        path.resolve(__dirname, 'dist/version.json'),
        JSON.stringify({version}),
      );
    },
  };
}

const APP_VERSION = resolveVersion();

export default defineConfig(() => {
  return {
    plugins: [
      versionFilePlugin(APP_VERSION),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
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
            {
              src: 'icons/pwa-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'icons/pwa-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,png,svg,jpg,webp,woff,woff2,webmanifest}'],
          globIgnores: ['**/server.cjs*'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({url}: {url: URL}) => url.pathname.endsWith('.html') || url.pathname === '/',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                networkTimeoutSeconds: 3,
                expiration: {maxEntries: 5, maxAgeSeconds: 60 * 60 * 24},
                cacheableResponse: {statuses: [200]},
              },
            },
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
