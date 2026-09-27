import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@mathinput/core": resolve(import.meta.dirname, "../core/src/index.ts") } },
  test: {
    name: "element",
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
