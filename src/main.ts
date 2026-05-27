import './presentation/styles/index.css';
import { App } from './App';
import { registerServiceWorker } from './presentation/lifecycle/registerServiceWorker';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element in index.html');
}

const app = new App(root);
void app.start();

const version = document.createElement('span');
version.textContent = `v${__APP_VERSION__}`;
version.className =
  'fixed bottom-2 right-3 text-[10px] font-mono text-ink-100 pointer-events-none select-none';
version.setAttribute('aria-label', `MINTZA version ${__APP_VERSION__}`);
document.body.appendChild(version);

if (import.meta.env.PROD) {
  registerServiceWorker('/mintza/sw.js', app.translator);
}
