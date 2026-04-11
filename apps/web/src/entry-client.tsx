import { hydrate } from 'shy';
import { App } from './App';

const rootEl = document.getElementById("root");
if (rootEl) {
  hydrate(App, rootEl);
}
