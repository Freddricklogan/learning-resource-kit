import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'], include: ['src/config.js', 'src/lr-kit.js'] }
  }
});
