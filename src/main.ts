import './presentation/styles/index.css';
import { App } from './App';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element in index.html');
}

const app = new App(root);
void app.start();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/mintza/sw.js');
  });
}

