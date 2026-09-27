import { resolve } from "node:path";
import { defineConfig } from "vite";

/** Dev server for the demo playground and browser tests. */
export default defineConfig({
  root: resolve(import.meta.dirname, "demo"),
  resolve: {
    alias: {
      "@mathinput/core": resolve(import.meta.dirname, "../core/src/index.ts"),
      "@mathinput/presets-uk": resolve(import.meta.dirname, "../presets-uk/src/index.ts"),
    },
  },
  server: { port: 0, strictPort: false },
});
