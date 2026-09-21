import { defineConfig } from 'vite';

// The Pages URL is https://freddricklogan.github.io/learning-resource-kit/ — the base must match.
export default defineConfig({
  base: '/learning-resource-kit/',
  build: {
    target: 'es2022',
    sourcemap: false,
    // One entry chunk; no vendor split needed at this size. modulePreload is bundled, not inline.
    modulePreload: { polyfill: true }
  }
});
