import { resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import { defineConfig } from "vite";

const core = resolve(import.meta.dirname, "../core/src/index.ts");

export default defineConfig({
  resolve: { alias: { "@mathinput/core": core } },
  build: {
    lib: {
      entry: { index: resolve(import.meta.dirname, "src/index.ts"), define: resolve(import.meta.dirname, "src/define.ts") },
      formats: ["es"],
    },
    rollupOptions: { external: ["@mathinput/core"] },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "copy-stylesheet",
      closeBundle() {
        mkdirSync(resolve(import.meta.dirname, "dist"), { recursive: true });
        copyFileSync(resolve(import.meta.dirname, "src/styles/mathinput.css"), resolve(import.meta.dirname, "dist/mathinput.css"));
      },
    },
  ],
});
