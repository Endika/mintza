import './presentation/styles/index.css';
import { App } from './App';
import { registerServiceWorker } from './presentation/lifecycle/registerServiceWorker';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element in index.html');
}

const app = new App(root);
void app.start();

if (import.meta.env.PROD) {
  registerServiceWorker('/mintza/sw.js', app.translator);
}
