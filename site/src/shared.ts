/** Loaded by every page: fonts, the component, and the theme switch. */
import "@fontsource/stix-two-text/400.css";
import "@fontsource/stix-two-text/400-italic.css";
import "@fontsource/stix-two-text/600.css";
import "../../packages/element/src/styles/mathinput.css";
import "../../packages/element/src/define.ts";
import "./site.css";

export type PageTheme = "auto" | "light" | "dark";
const KEY = "mathinput-site-theme";
const listeners = new Set<(t: PageTheme) => void>();

function read(): PageTheme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

let theme: PageTheme = read();

export function pageTheme(): PageTheme {
  return theme;
}

export function onThemeChange(fn: (t: PageTheme) => void): void {
  listeners.add(fn);
}

function apply(): void {
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  // Components without their own skin follow the page.
  for (const el of document.querySelectorAll("math-input:not([data-skinned])")) {
    if (theme === "auto") el.removeAttribute("theme");
    else el.setAttribute("theme", theme);
  }
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = theme === "auto" ? "Auto" : theme === "dark" ? "Dark" : "Light";
    btn.setAttribute("aria-label", `Colour theme: ${theme}. Change`);
  }
  for (const fn of listeners) fn(theme);
}

document.getElementById("theme-toggle")?.addEventListener("click", () => {
  theme = theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
  try { localStorage.setItem(KEY, theme); } catch { /* storage unavailable */ }
  apply();
});

apply();
