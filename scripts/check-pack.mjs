// Tarball check (release facts): each published package must contain only
// dist/ (no tests), README.md, LICENSE and package.json, and every file its exports map
// points at. Runs `npm pack --dry-run`, so `prepack` runs too. Needs a build.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packages = ["core", "presets-uk", "element", "react"];
const allowed = /^(dist\/.+|README\.md|LICENSE|package\.json)$/;
const forbidden = /\.(test|spec)\.|\.tsbuildinfo$/;
const required = ["README.md", "LICENSE", "package.json"];

function exportTargets(value) {
  if (typeof value === "string") return [value];
  return Object.values(value ?? {}).flatMap(exportTargets);
}

let failed = false;
for (const dir of packages) {
  const manifest = JSON.parse(readFileSync(resolve(root, "packages", dir, "package.json"), "utf8"));
  const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts=false", "-w", manifest.name], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const [tarball] = JSON.parse(out);
  const files = new Set(tarball.files.map((f) => f.path));
  const problems = [
    ...[...files].filter((f) => !allowed.test(f) || forbidden.test(f)).map((f) => `unexpected file ${f}`),
    ...required.filter((f) => !files.has(f)).map((f) => `missing ${f}`),
    ...exportTargets(manifest.exports)
      .map((t) => t.replace(/^\.\//, ""))
      .filter((t) => !files.has(t))
      .map((t) => `export target ${t} not in tarball`),
  ];
  failed ||= problems.length > 0;
  console.log(`${problems.length ? "FAIL" : "ok  "} ${manifest.name}@${manifest.version}: ${files.size} files`);
  for (const p of problems) console.log(`     ${p}`);
}
process.exit(failed ? 1 : 0);
