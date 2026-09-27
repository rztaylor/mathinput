import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@mathinput/core", replacement: resolve(import.meta.dirname, "../core/src/index.ts") },
      { find: "@mathinput/element/define", replacement: resolve(import.meta.dirname, "../element/src/define.ts") },
      { find: "@mathinput/element", replacement: resolve(import.meta.dirname, "../element/src/index.ts") },
    ],
  },
  test: { name: "react", environment: "jsdom", include: ["tests/**/*.test.tsx"] },
});
