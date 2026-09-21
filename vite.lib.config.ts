import { defineConfig } from 'vite';

// Library build: one ES module for resource repos to vendor as src/lr-kit.js. The Executive
// Shell is imported by the bundle; resources still ship exec-shell.css and lr-kit.css as files.
export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'lib',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    lib: { entry: 'src/kit/index.ts', formats: ['es'], fileName: () => 'lr-kit.js' }
  }
});
