import { renderToStringAsync } from 'shy';
import { App } from './App';

export async function render(url: string) {
  return renderToStringAsync(App);
}
