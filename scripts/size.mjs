// Bundle-size check (spec §2): bundles each package entry minified with its
// dependencies on @mathinput/* external, gzips it, and compares with the limit.
import { build } from "vite";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const limits = [
  { name: "@mathinput/core", entry: "packages/core/dist/index.js", limitKb: 30 },
  { name: "@mathinput/element", entry: "packages/element/dist/index.js", limitKb: 20 },
];

let failed = false;
for (const { name, entry, limitKb } of limits) {
  const out = await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: true,
      lib: { entry: resolve(root, entry), formats: ["es"], fileName: "bundle" },
      rollupOptions: { external: [/^@mathinput\//] },
    },
  });
  const chunks = (Array.isArray(out) ? out : [out]).flatMap((o) => o.output).filter((c) => c.type === "chunk");
  const code = chunks.map((c) => c.code).join("\n");
  const kb = gzipSync(code).length / 1024;
  const ok = kb <= limitKb;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${kb.toFixed(1)} kB min+gzip (limit ${limitKb} kB)`);
}
process.exit(failed ? 1 : 0);
