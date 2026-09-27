/**
 * Example skins, made only of --mi-* token overrides (the first reskinning
 * level in the theming guide). The demo applies them live and shows the CSS.
 */
export interface Skin {
  id: string;
  name: string;
  description: string;
  /** Force a built-in scheme underneath the tokens. */
  theme?: "light" | "dark";
  tokens: Record<string, string>;
}

export const SKINS: Skin[] = [
  {
    id: "default",
    name: "Default",
    description: "The built-in look. Follows light and dark mode.",
    tokens: {},
  },
  {
    id: "contrast",
    name: "High contrast",
    description: "Black on white with thick edges and a yellow focus ring.",
    theme: "light",
    tokens: {
      "--mi-field-border": "#000000",
      "--mi-field-border-focus": "#000000",
      "--mi-field-ring": "#ffd400",
      "--mi-placeholder-border": "#000000",
      "--mi-keypad-bg": "#ffffff",
      "--mi-keypad-border": "#000000",
      "--mi-key-bg": "#ffffff",
      "--mi-key-fg": "#000000",
      "--mi-key-shadow": "#000000",
      "--mi-key-operator-bg": "#eeeeee",
      "--mi-key-template-bg": "#fff1a8",
      "--mi-key-template-fg": "#000000",
      "--mi-key-primary-bg": "#000000",
      "--mi-key-primary-fg": "#ffffff",
      "--mi-key-placeholder-active": "#000000",
      "--mi-key-variant-indicator": "#c40000",
      "--mi-tab-fg": "#000000",
      "--mi-tab-selected-fg": "#000000",
    },
  },
  {
    id: "paper",
    name: "Exercise book",
    description: "Warm paper, square corners and ink-brown keys.",
    theme: "light",
    tokens: {
      "--mi-field-bg": "#fffdf7",
      "--mi-field-fg": "#2b2118",
      "--mi-field-border": "#d8cdb8",
      "--mi-field-border-focus": "#8a5a2b",
      "--mi-field-ring": "rgba(138, 90, 43, 0.2)",
      "--mi-field-radius": "4px",
      "--mi-caret": "#8a5a2b",
      "--mi-row-active-bg": "#f4ead7",
      "--mi-keypad-bg": "#f6f0e3",
      "--mi-keypad-border": "#e3d7bf",
      "--mi-keypad-radius": "6px",
      "--mi-key-bg": "#fffdf7",
      "--mi-key-fg": "#2b2118",
      "--mi-key-shadow": "#d8cdb8",
      "--mi-key-radius": "4px",
      "--mi-key-operator-bg": "#efe6d3",
      "--mi-key-template-bg": "#f3e3c3",
      "--mi-key-template-fg": "#6b4420",
      "--mi-key-primary-bg": "#8a5a2b",
      "--mi-key-primary-fg": "#ffffff",
      "--mi-key-placeholder-active": "#8a5a2b",
      "--mi-key-variant-indicator": "#b23a48",
      "--mi-tab-fg": "#6b5a47",
      "--mi-tab-selected-fg": "#6b4420",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "A dark scheme with violet templates and a pink indicator.",
    theme: "dark",
    tokens: {
      "--mi-field-bg": "#14121f",
      "--mi-field-fg": "#f2efff",
      "--mi-field-border": "#3a3558",
      "--mi-field-border-focus": "#a78bfa",
      "--mi-field-ring": "rgba(167, 139, 250, 0.3)",
      "--mi-caret": "#c4b5fd",
      "--mi-row-active-bg": "#2a2345",
      "--mi-keypad-bg": "#0e0c17",
      "--mi-keypad-border": "#2a2640",
      "--mi-key-bg": "#1e1a30",
      "--mi-key-fg": "#f2efff",
      "--mi-key-shadow": "#07060d",
      "--mi-key-operator-bg": "#181527",
      "--mi-key-template-bg": "#2e2452",
      "--mi-key-template-fg": "#d8ccff",
      "--mi-key-primary-bg": "#a78bfa",
      "--mi-key-primary-fg": "#14121f",
      "--mi-key-placeholder-active": "#c4b5fd",
      "--mi-key-variant-indicator": "#f472b6",
      "--mi-tab-fg": "#b3aacf",
      "--mi-tab-selected-bg": "#1e1a30",
      "--mi-tab-selected-fg": "#d8ccff",
    },
  },
  {
    id: "rounded",
    name: "Soft and round",
    description: "Pill-shaped keys, larger text and a teal accent, for younger learners.",
    theme: "light",
    tokens: {
      "--mi-field-radius": "28px",
      "--mi-field-size": "32px",
      "--mi-field-border-focus": "#0f766e",
      "--mi-field-ring": "rgba(15, 118, 110, 0.2)",
      "--mi-caret": "#0f766e",
      "--mi-row-active-bg": "#ddf4f1",
      "--mi-keypad-radius": "28px",
      "--mi-keypad-bg": "#f0faf8",
      "--mi-keypad-border": "#cdebe6",
      "--mi-key-radius": "999px",
      "--mi-key-font-size": "23px",
      "--mi-key-template-bg": "#d5f2ed",
      "--mi-key-template-fg": "#115e59",
      "--mi-key-primary-bg": "#0f766e",
      "--mi-key-placeholder-active": "#0f766e",
      "--mi-key-variant-indicator": "#c2410c",
      "--mi-tab-selected-fg": "#115e59",
    },
  },
];

/** Apply a skin to every <math-input> inside `scope`. */
export function applySkin(scope: ParentNode, skin: Skin, pageTheme: "auto" | "light" | "dark"): void {
  const all = new Set(SKINS.flatMap((s) => Object.keys(s.tokens)));
  for (const el of scope.querySelectorAll<HTMLElement>("math-input")) {
    for (const t of all) el.style.removeProperty(t);
    for (const [t, v] of Object.entries(skin.tokens)) el.style.setProperty(t, v);
    const theme = skin.theme ?? (pageTheme === "auto" ? null : pageTheme);
    if (theme) el.setAttribute("theme", theme);
    else el.removeAttribute("theme");
  }
}

/** The CSS a host would write to get this skin. */
export function skinCss(skin: Skin): string {
  const lines = Object.entries(skin.tokens).map(([t, v]) => `  ${t}: ${v};`);
  if (!lines.length) return "/* The default skin needs no CSS. */";
  const theme = skin.theme ? `\n/* and on the element: theme="${skin.theme}" */` : "";
  return `math-input {\n${lines.join("\n")}\n}${theme}`;
}
