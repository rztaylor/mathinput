import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MathInputElement, defineMathInput } from "../src/index.js";

beforeAll(() => defineMathInput());
afterEach(() => document.body.replaceChildren());

function mount(attrs: Record<string, string> = {}): MathInputElement {
  const el = document.createElement("math-input") as MathInputElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  return el;
}

const keypad = (el: MathInputElement | Document = document) => el.querySelector(".mi-keypad") as HTMLElement;
const press = (id: string, root: ParentNode = document) => {
  const b = root.querySelector<HTMLButtonElement>(`.mi-key[data-key-id="${id}"]`);
  if (!b) throw new Error(`no key ${id}`);
  b.click();
};
const tab = (label: string, root: ParentNode = document) => {
  const t = [...root.querySelectorAll<HTMLButtonElement>(".mi-tab")].find((b) => (b.getAttribute("aria-label") ?? b.textContent) === label);
  if (!t) throw new Error(`no tab ${label}`);
  t.click();
};

describe("keypad", () => {
  it("is collapsed behind a toggle on a fine pointer, and opens on request", () => {
    const el = mount({ label: "Answer" });
    const onToggle = vi.fn();
    el.addEventListener("keypad-toggle", onToggle);
    expect(keypad(el).hidden).toBe(true);
    const toggle = el.querySelector(".mi-keypad-toggle") as HTMLButtonElement;
    expect(toggle.getAttribute("aria-label")).toBe("Show keypad");
    toggle.click();
    expect(keypad(el).hidden).toBe(false);
    expect(el.dataset.keypad).toBe("open");
    expect(onToggle.mock.calls[0]?.[0].detail).toEqual({ open: true });
  });

  it("follows the keypad attribute", () => {
    const always = mount({ keypad: "always" });
    expect(keypad(always).hidden).toBe(false);
    expect((always.querySelector(".mi-keypad-toggle") as HTMLElement).hidden).toBe(true);
    const never = mount({ keypad: "never" });
    expect(keypad(never).hidden).toBe(true);
  });

  it("builds expressions from keys", () => {
    const el = mount({ keypad: "always" });
    press("digit-2", el);
    press("power", el);
    press("digit-3", el);
    press("right", el);
    press("op-plus", el);
    press("digit-1", el);
    press("fraction", el);
    press("digit-2", el);
    expect(el.latex).toBe("2^{3}+\\frac{1}{2}");
  });

  it("labels template keys with the expression they insert", () => {
    const el = mount({ keypad: "always" });
    const power = el.querySelector('.mi-key[data-key-id="power"]') as HTMLElement;
    expect(power.querySelector(".mi-sup .mi-placeholder--active")).not.toBeNull();
    expect(power.querySelector(".mi-placeholder--ghost")).not.toBeNull();
    const frac = el.querySelector('.mi-key[data-key-id="fraction"]') as HTMLElement;
    expect(frac.querySelector(".mi-frac")).not.toBeNull();
  });

  it("marks keys with variants and opens them on right-click", () => {
    const el = mount({ keypad: "always" });
    const power = el.querySelector('.mi-key[data-key-id="power"]') as HTMLButtonElement;
    expect(power.hasAttribute("data-has-variants")).toBe(true);
    expect(power.querySelector(".mi-key__more")).not.toBeNull();
    expect(power.getAttribute("aria-haspopup")).toBe("menu");
    power.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    const menu = el.querySelector(".mi-variants") as HTMLElement;
    expect(menu.getAttribute("role")).toBe("menu");
    expect([...menu.querySelectorAll(".mi-key")].map((b) => (b as HTMLElement).dataset.keyId)).toEqual(["power", "square", "cube", "power-minus-one"]);
    press("digit-5", el);
    (menu.querySelector('[data-key-id="square"]') as HTMLButtonElement).click();
    expect(el.querySelector(".mi-variants")).toBeNull();
  });

  it("shows a next-box key instead of submit unless submit-on-enter is set", () => {
    const el = mount({ keypad: "always" });
    expect(el.querySelector('.mi-key[data-key-id="submit"]')).toBeNull();
    expect(el.querySelector('.mi-key[data-key-id="next-box"]')).not.toBeNull();
    const withSubmit = mount({ keypad: "always", "submit-on-enter": "" });
    const onSubmit = vi.fn();
    withSubmit.addEventListener("submit", onSubmit);
    press("digit-4", withSubmit);
    press("submit", withSubmit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("switches tabs and types capital letters with shift", () => {
    mount({ keypad: "always" });
    tab("Letters");
    expect(document.querySelector(".mi-panel .mi-key[data-key-id='letter-q']")).not.toBeNull();
    press("shift");
    press("letter-q");
    const el = document.querySelector("math-input") as MathInputElement;
    expect(el.latex).toBe("Q");
    // Shift releases after one letter.
    press("letter-q");
    expect(el.latex).toBe("Qq");
  });

  it("uses subject presets and chemistry rules", () => {
    const el = mount({ keypad: "always", subject: "chemistry" });
    expect(keypad(el).getAttribute("aria-label")).toBe("Chemistry keypad");
    press("element-H", el);
    press("digit-2", el);
    press("element-O", el);
    expect(el.latex).toBe("\\ce{H2O}");
  });

  it("opens the periodic table and inserts an element", () => {
    const el = mount({ keypad: "always", subject: "chemistry" });
    press("periodic-table", el);
    const sheet = el.querySelector(".mi-sheet") as HTMLElement;
    expect(sheet.querySelectorAll(".mi-periodic__cell")).toHaveLength(118);
    const u = [...sheet.querySelectorAll<HTMLButtonElement>(".mi-periodic__cell")].find((b) => b.textContent === "U");
    u?.click();
    expect(el.latex).toBe("\\ce{U}");
    expect(el.querySelector(".mi-sheet")).toBeNull();
  });

  it("filters keys by level", () => {
    const higher = mount({ keypad: "always" });
    expect(higher.querySelector('[data-key-id="integral"]')).toBeNull();
    const alevel = mount({ keypad: "always", level: "a-level" });
    tab("Functions", alevel);
    expect(alevel.querySelector('[data-key-id="integral"]')).not.toBeNull();
  });

  it("accepts a host patch", () => {
    const el = mount({ keypad: "always" });
    el.keypadLayout = { removeTabs: ["letters", "greek"] };
    const labels = [...el.querySelectorAll(".mi-tab")].map((t) => t.getAttribute("aria-label"));
    expect(labels).not.toContain("Letters");
    expect(labels).not.toContain("Greek letters");
  });

  it("renders into a host container", () => {
    const sheet = document.createElement("div");
    sheet.id = "sheet";
    document.body.append(sheet);
    const el = mount({ keypad: "always", "keypad-container": "sheet" });
    expect(sheet.querySelector(".mi-keypad")).not.toBeNull();
    expect(el.querySelector(".mi-keypad")).toBeNull();
    el.remove();
    expect(sheet.querySelector(".mi-keypad")).toBeNull();
  });

  it("has no keypad when read-only", () => {
    const el = mount({ readonly: "", keypad: "always" });
    expect(el.querySelector(".mi-keypad")).toBeNull();
  });

  it("moves focus across keys with arrow keys", () => {
    const el = mount({ keypad: "always" });
    const first = el.querySelector(".mi-keypad__numbers .mi-key, .mi-panel .mi-key") as HTMLButtonElement;
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect((document.activeElement as HTMLElement).dataset.keyId).not.toBe(first.dataset.keyId);
    expect(el.hasAttribute("data-focused")).toBe(true);
  });
});

describe("keypad toggle visibility", () => {
  it("hides the toggle with keypad=never, including in CSS terms", () => {
    const el = document.createElement("math-input") as MathInputElement;
    el.setAttribute("keypad", "never");
    document.body.append(el);
    const toggle = el.querySelector(".mi-keypad-toggle") as HTMLElement;
    expect(toggle.hidden).toBe(true);
  });
});
