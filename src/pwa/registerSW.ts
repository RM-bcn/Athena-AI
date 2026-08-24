const VERSION_KEY = 'athena_app_version';
const PURGE_CACHE_NAMES = ['api-get-cache', 'html-cache'];

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void bootstrap();
  });
}

async function bootstrap(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    await reg.update().catch(() => undefined);
    window.setInterval(() => {
      void reg.update().catch(() => undefined);
    }, 5 * 60 * 1000);
    await reconcileVersion(reg);
  } catch {
    // SW niet beschikbaar; app werkt gewoon via netwerk.
  }
}

async function reconcileVersion(reg: ServiceWorkerRegistration): Promise<void> {
  try {
    const res = await fetch('/version.json', {cache: 'no-store'});
    if (!res.ok) return;
    const data: {version?: string} = await res.json();
    if (!data.version) return;
    const stored = localStorage.getItem(VERSION_KEY);
    localStorage.setItem(VERSION_KEY, data.version);
    if (!stored || stored === data.version) return;
    await Promise.all(
      PURGE_CACHE_NAMES.map((name) => caches.delete(name).catch(() => false)),
    );
    await reg.update().catch(() => undefined);
  } catch {
    // version.json niet aanwezig (bv. dev zonder build); niets doen.
  }
}
