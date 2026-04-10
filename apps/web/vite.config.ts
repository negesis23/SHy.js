import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: '"Fragment"',
    jsxInject: `import { h } from 'shy'`,
  }
});