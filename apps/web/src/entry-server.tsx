import { renderToString } from 'shy';
import { App } from './App';

export function render(url: string) {
  return renderToString(App);
}
