/**
 * Token contrast audit (spec §11): text ≥ 4.5:1, placeholders and indicators
 * ≥ 3:1, in both default themes. Reads the tokens straight from the shipped
 * stylesheet so a token change cannot silently break contrast.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(import.meta.dirname, "../src/styles/mathinput.css"), "utf8");

function block(selectorStart: string): Record<string, string> {
  const at = css.indexOf(selectorStart);
  if (at < 0) throw new Error(`no block ${selectorStart}`);
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  const tokens: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/(--mi-[\w-]+):\s*([^;]+);/g)) tokens[m[1] as string] = (m[2] as string).trim();
  return tokens;
}

const light = block(".mi-root {");
const dark = { ...light, ...block('.mi-root[data-mi-theme="dark"] {') };

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const TEXT: [string, string][] = [
  ["--mi-field-fg", "--mi-field-bg"],
  ["--mi-muted", "--mi-field-bg"],
  ["--mi-key-fg", "--mi-key-bg"],
  ["--mi-key-fg", "--mi-key-operator-bg"],
  ["--mi-key-template-fg", "--mi-key-template-bg"],
  ["--mi-key-primary-fg", "--mi-key-primary-bg"],
  ["--mi-tab-fg", "--mi-keypad-bg"],
  ["--mi-tab-selected-fg", "--mi-tab-selected-bg"],
];
const NON_TEXT: [string, string][] = [
  ["--mi-field-border-focus", "--mi-field-bg"],
  ["--mi-caret", "--mi-field-bg"],
  ["--mi-placeholder-border", "--mi-field-bg"],
  ["--mi-placeholder-border-active", "--mi-row-active-bg"],
  ["--mi-key-variant-indicator", "--mi-key-bg"],
  ["--mi-key-variant-indicator", "--mi-key-operator-bg"],
  ["--mi-key-variant-indicator", "--mi-key-template-bg"],
  ["--mi-key-placeholder-active", "--mi-key-template-bg"],
];

describe.each([["light", light], ["dark", dark]] as const)("%s theme", (_, tokens) => {
  it.each(TEXT)("%s on %s ≥ 4.5:1", (fg, bg) => {
    expect(contrast(tokens[fg] as string, tokens[bg] as string)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(NON_TEXT)("%s on %s ≥ 3:1", (fg, bg) => {
    expect(contrast(tokens[fg] as string, tokens[bg] as string)).toBeGreaterThanOrEqual(3);
  });
});

it("keeps the media-query and attribute dark themes identical", () => {
  expect(block('.mi-root:not([data-mi-theme="light"]) {')).toEqual(block('.mi-root[data-mi-theme="dark"] {'));
});
