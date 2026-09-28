// Release check (release facts): the tag `v<version>` must match the version
// of every published package, internal dependencies must use `^<version>`,
// and CHANGELOG.md must have a `## [<version>]` section. With `--notes <file>`
// writes that section (without its heading) as the GitHub release notes.
// Usage: node scripts/release-check.mjs v0.2.0 [--notes notes.md]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packages = ["core", "presets-uk", "element", "react"];

const [tag, flag, notesPath] = process.argv.slice(2);
if (!/^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(tag ?? "")) {
  console.error(`expected a tag like v1.2.3, got ${tag ?? "nothing"}`);
  process.exit(1);
}
const version = tag.slice(1);

const problems = [];
for (const dir of packages) {
  const manifest = JSON.parse(readFileSync(resolve(root, "packages", dir, "package.json"), "utf8"));
  if (manifest.version !== version) problems.push(`${manifest.name} is ${manifest.version}, not ${version}`);
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (name.startsWith("@mathinput/") && range !== `^${version}`) {
      problems.push(`${manifest.name} depends on ${name}@${range}, not ^${version}`);
    }
  }
}

const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
const escaped = version.replace(/[.+-]/g, "\\$&");
const section = changelog.match(new RegExp(`^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## |^\\[[^\\]]+\\]: |(?![\\s\\S]))`, "m"));
if (!section) problems.push(`CHANGELOG.md has no "## [${version}]" section`);

if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}
if (flag === "--notes") writeFileSync(notesPath, `${section[1].trim()}\n`);
console.log(`✓ ${tag}: ${packages.length} packages at ${version}, changelog section found`);
