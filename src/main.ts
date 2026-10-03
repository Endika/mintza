import './presentation/styles/index.css';
import { App } from './App';
import { registerServiceWorker } from './presentation/lifecycle/registerServiceWorker';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element in index.html');
}

const app = new App(root);

const version = document.createElement('span');
version.textContent = `v${__APP_VERSION__}`;
version.className =
  'fixed bottom-2 right-3 text-[10px] font-mono text-fg-muted pointer-events-none select-none';
document.body.appendChild(version);

void app.start().then(() => {
  version.setAttribute('aria-label', app.translator.t('app.version', { version: __APP_VERSION__ }));
});

if (import.meta.env.PROD) {
  registerServiceWorker('/mintza/sw.js', app.translator);
}
