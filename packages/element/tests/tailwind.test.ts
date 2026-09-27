/** The Tailwind v4 entry compiles, keeps our layer below utilities, and exposes the tokens. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

it("compiles with Tailwind v4 and orders layers so utilities win", () => {
  const dir = resolve(import.meta.dirname, "fixtures/tailwind");
  const out = join(mkdtempSync(join(tmpdir(), "mi-tw-")), "out.css");
  const cli = resolve(import.meta.dirname, "../../../node_modules/@tailwindcss/cli/dist/index.mjs");
  execFileSync(process.execPath, [cli, "-i", join(dir, "input.css"), "-o", out], { cwd: dir, stdio: "pipe" });
  const css = readFileSync(out, "utf8");
  expect(css).toMatch(/@layer theme, base, mathinput, components, utilities;/);
  expect(css).toContain("@layer mathinput");
  expect(css).toMatch(/\.bg-mi-key\s*\{[^}]*background-color:\s*var\(--mi-key-bg\)/);
  expect(css).toMatch(/\.rounded-mi-key\s*\{[^}]*border-radius:\s*var\(--mi-key-radius\)/);
}, 30_000);
