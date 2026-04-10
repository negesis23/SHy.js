import { hydrate } from 'shy';
import { App } from './App';
import './index.css';

const rootEl = document.getElementById("root");
if (rootEl) {
  hydrate(App, rootEl);
}
