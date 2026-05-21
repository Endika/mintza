import { UpdateBanner } from '../components/UpdateBanner';
import type { Translator } from '../i18n/Translator';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export const registerServiceWorker = (scriptUrl: string, translator: Translator): void => {
  if (!('serviceWorker' in navigator)) return;

  const banner = new UpdateBanner();
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    void (async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register(scriptUrl);
        if (registration.waiting && navigator.serviceWorker.controller) {
          showUpdate(banner, registration.waiting, translator);
        }
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdate(banner, newWorker, translator);
            }
          });
        });
        window.setInterval(() => {
          void registration.update();
        }, UPDATE_CHECK_INTERVAL_MS);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            void registration.update();
          }
        });
      } catch (cause) {
        console.warn('Service worker registration failed', cause);
      }
    })();
  });
};

const showUpdate = (banner: UpdateBanner, worker: ServiceWorker, translator: Translator): void => {
  banner.show(() => worker.postMessage({ type: 'SKIP_WAITING' }), translator);
};
