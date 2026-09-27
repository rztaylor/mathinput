import "./shared.ts";
import type { MathInputElement } from "@mathinput/element";
import { bindOutputs } from "./outputs.ts";
import { SKINS, applySkin } from "./skins.ts";
import { onThemeChange, pageTheme } from "./shared.ts";

const SAMPLES: Record<string, string> = {
  maths: "x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}",
  chemistry: "\\ce{2H2 + O2 -> 2H2O}",
  physics: "E=mc^{2}",
};

const input = document.getElementById("hero-input") as MathInputElement;
bindOutputs(input, ["out-latex", "out-text", "out-spoken"].map((id) => document.getElementById(id) as HTMLElement));

const chips = document.getElementById("hero-subjects") as HTMLElement;
chips.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-subject]");
  if (!b) return;
  for (const c of chips.querySelectorAll("button")) c.setAttribute("aria-pressed", String(c === b));
  const subject = b.dataset.subject as string;
  input.setAttribute("subject", subject);
  input.latex = SAMPLES[subject] ?? "";
});

// Skin gallery: the same component, four sets of tokens.
const strip = document.getElementById("skins-strip") as HTMLElement;
for (const skin of SKINS.filter((s) => s.id !== "default")) {
  const card = document.createElement("div");
  card.className = "skin-card";
  const h = document.createElement("h3");
  h.textContent = skin.name;
  const el = document.createElement("math-input") as MathInputElement;
  el.setAttribute("label", `${skin.name} skin example`);
  el.setAttribute("keypad", "never");
  el.setAttribute("latex", "\\frac{3}{4}x^{2}+\\sqrt{2}");
  el.dataset.skinned = "";
  card.append(h, el);
  strip.append(card);
  applySkin(card, skin, pageTheme());
  onThemeChange((t) => applySkin(card, skin, t));
}
