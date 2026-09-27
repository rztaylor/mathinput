import "../src/styles/mathinput.css";
import "katex/dist/katex.min.css";
import katex from "katex";
import "katex/contrib/mhchem";
import "../src/define.js";
import type { MathInputElement } from "../src/index.js";
import type { MathInputValue } from "@mathinput/core";
import { ALL } from "../../core/tests/golden/cases.js";
import { SKINS, applySkin } from "../../../site/src/skins.js";

const samples = [
  { subject: "maths", label: "Maths", latex: "x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}" },
  { subject: "chemistry", label: "Chemistry", latex: "\\ce{Mg(s) + 2HCl(aq) -> MgCl2(aq) + H2(g)}" },
  { subject: "physics", label: "Physics", latex: "a=3.0\\,\\mathrm{m}\\,\\mathrm{s}^{-2}" },
];

const fields = document.getElementById("fields") as HTMLElement;
for (const s of samples) {
  const card = document.createElement("div");
  card.className = "demo-card";
  const h = document.createElement("h2");
  h.textContent = s.label;
  const input = document.createElement("math-input") as MathInputElement;
  input.setAttribute("subject", s.subject);
  input.setAttribute("label", `${s.label} answer`);
  input.setAttribute("latex", s.latex);
  input.setAttribute("submit-on-enter", "");
  input.dataset.testid = s.subject;
  const out = document.createElement("pre");
  out.className = "demo-out";
  const show = (v: MathInputValue) => { out.textContent = `LaTeX: ${v.latex}\nText:  ${v.text}\nSpoken: ${v.spoken}`; };
  input.addEventListener("input", (e) => show(e.detail));
  card.append(h, input, out);
  fields.append(card);
  show(input.getValue());
}

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

const theme = document.getElementById("theme") as HTMLSelectElement;
theme.addEventListener("change", () => {
  const v = theme.value;
  if (v === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = v;
  for (const el of document.querySelectorAll("math-input")) {
    if (v === "auto") el.removeAttribute("theme");
    else el.setAttribute("theme", v);
  }
});

// Skins come from the website's definitions, so there is one source of truth.
const skin = document.getElementById("skin") as HTMLSelectElement;
for (const s of SKINS) skin.add(new Option(s.name, s.id));
const applyCurrentSkin = () => {
  const chosen = SKINS.find((s) => s.id === skin.value) ?? SKINS[0];
  if (chosen) applySkin(document.querySelector(".demo-fields") as HTMLElement, chosen, theme.value as "auto" | "light" | "dark");
};
skin.addEventListener("change", applyCurrentSkin);
theme.addEventListener("change", applyCurrentSkin);
const indicator = document.getElementById("indicator") as HTMLSelectElement;
indicator.addEventListener("change", () => {
  for (const el of document.querySelectorAll<HTMLElement>(".demo-fields math-input")) {
    if (indicator.value) el.dataset.variantIndicator = indicator.value;
    else delete el.dataset.variantIndicator;
  }
});
const level = document.getElementById("level") as HTMLSelectElement;
level.addEventListener("change", () => {
  for (const el of document.querySelectorAll(".demo-fields math-input")) el.setAttribute("level", level.value);
});

// "Show your working": the host owns the steps (spec §1).
const stepInput = document.getElementById("step-input") as MathInputElement;
const stepsList = document.getElementById("steps") as HTMLOListElement;
const payload = document.getElementById("payload") as HTMLPreElement;
const steps: MathInputValue[] = [];
const wrap = (v: MathInputValue) => `$${v.latex}$`;
function showPayload(): void {
  payload.textContent = [
    "**Question:** Solve 2x² − 7x + 3 = 0 by factorising.",
    "",
    "**My working:**",
    ...steps.map((v, i) => `${i + 1}. ${wrap(v)}  (${v.text})`),
  ].join("\n");
}
stepInput.addEventListener("submit", (e) => {
  steps.push(e.detail);
  const li = document.createElement("li");
  const shown = document.createElement("math-input") as MathInputElement;
  shown.setAttribute("readonly", "");
  li.append(shown);
  stepsList.append(li);
  shown.value = e.detail.doc;
  stepInput.clear();
  showPayload();
});
showPayload();
