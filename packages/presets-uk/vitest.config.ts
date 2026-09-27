import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: "@mathinput/core", replacement: resolve(import.meta.dirname, "../core/src/index.ts") }],
  },
  test: { name: "presets-uk", environment: "node", include: ["tests/**/*.test.ts"] },
});
