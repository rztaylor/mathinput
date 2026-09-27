import "./shared.ts";
import "katex/dist/katex.min.css";
import katex from "katex";
import "katex/contrib/mhchem";
import type { MathInputElement } from "@mathinput/element";
import type { MathInputValue } from "@mathinput/core";
import { ALL } from "../../packages/core/tests/golden/cases.ts";
import { bindOutputs } from "./outputs.ts";
import { SKINS, applySkin, skinCss } from "./skins.ts";
import { onThemeChange, pageTheme } from "./shared.ts";

const grid = document.getElementById("demo-grid") as HTMLElement;

// Subject panels.
for (const panel of grid.querySelectorAll<HTMLElement>(".panel[data-subject]")) {
  const input = panel.querySelector("math-input") as MathInputElement;
  bindOutputs(input, [...panel.querySelectorAll<HTMLElement>(".outputs dd")]);
}

// Show your working: the host keeps the steps.
const workInput = document.getElementById("work-input") as MathInputElement;
const workSteps = document.getElementById("work-steps") as HTMLOListElement;
const payload = document.getElementById("work-payload") as HTMLElement;
const steps: MathInputValue[] = [];
const showPayload = () => {
  payload.textContent = [
    "**Question:** Solve 2x² − 7x + 3 = 0 by factorising.",
    "",
    "**My working:**",
    ...(steps.length ? steps.map((v, i) => `${i + 1}. $${v.latex}$  (${v.text})`) : ["(no steps yet)"]),
  ].join("\n");
};
workInput.addEventListener("submit", (e) => {
  steps.push(e.detail);
  const li = document.createElement("li");
  const shown = document.createElement("math-input") as MathInputElement;
  shown.setAttribute("readonly", "");
  li.append(shown);
  workSteps.append(li);
  shown.value = e.detail.doc;
  workInput.clear();
  showPayload();
  applyAll();
});
showPayload();

// Gallery against KaTeX.
const body = document.querySelector("#gallery tbody") as HTMLElement;
for (const c of ALL) {
  const tr = document.createElement("tr");
  const name = document.createElement("td");
  name.textContent = `${c.doc.subject}: ${c.name}`;
  const ours = document.createElement("td");
  const mi = document.createElement("math-input") as MathInputElement;
  mi.setAttribute("readonly", "");
  mi.setAttribute("subject", c.doc.subject);
  ours.append(mi);
  mi.value = c.doc;
  const theirs = document.createElement("td");
  katex.render(c.latex, theirs, { throwOnError: false });
  tr.append(name, ours, theirs);
  body.append(tr);
}

// Controls apply to every field on the page.
const skinSel = document.getElementById("skin") as HTMLSelectElement;
const levelSel = document.getElementById("level") as HTMLSelectElement;
const keypadSel = document.getElementById("keypad") as HTMLSelectElement;
const indicatorSel = document.getElementById("indicator") as HTMLSelectElement;
const note = document.getElementById("skin-note") as HTMLElement;
for (const s of SKINS) skinSel.add(new Option(s.name, s.id));

function applyAll(): void {
  const skin = SKINS.find((s) => s.id === skinSel.value) ?? SKINS[0];
  if (!skin) return;
  applySkin(grid, skin, pageTheme());
  note.textContent = `${skin.description} ${Object.keys(skin.tokens).length ? `${Object.keys(skin.tokens).length} token overrides.` : ""}`;
  for (const el of grid.querySelectorAll<HTMLElement>("math-input:not([readonly])")) {
    el.setAttribute("level", levelSel.value);
    el.setAttribute("keypad", keypadSel.value);
    if (indicatorSel.value) el.dataset.variantIndicator = indicatorSel.value;
    else delete el.dataset.variantIndicator;
  }
  skinCssBlock.textContent = skinCss(skin);
}

const details = document.createElement("details");
details.className = "css";
details.innerHTML = "<summary>CSS for this skin</summary>";
const pre = document.createElement("pre");
const skinCssBlock = document.createElement("code");
pre.append(skinCssBlock);
details.append(pre);
note.after(details);

for (const s of [skinSel, levelSel, keypadSel, indicatorSel]) s.addEventListener("change", applyAll);
onThemeChange(applyAll);
applyAll();
