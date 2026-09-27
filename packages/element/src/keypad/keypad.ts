/**
 * The keypad UI (spec §8): tabs and key grids laid out per form factor.
 * Phone: tab bar, one panel, navigation row. Tablet and desktop: number pad
 * and navigation on the left, tabbed panel on the right.
 */
import type { Key, KeypadLayout, KeypadTab, UiAction } from "@mathinput/core";
import { NEXT_BOX_KEY } from "@mathinput/core";
import { keyButton, renderLabel } from "./key-button.js";
import { VariantsMenu } from "./variants.js";
import { periodicTable } from "./periodic-table.js";

export type FormFactor = "phone" | "tablet" | "desktop";

export interface KeypadHost {
  /** Run a key; returns the UI action the host must handle, if any. */
  run(key: Key): UiAction | null;
  submitEnabled(): boolean;
  /** Return focus to the field after a pointer interaction. */
  refocus(): void;
  insertElement(symbol: string): void;
}

let uid = 0;

export class Keypad {
  readonly el: HTMLDivElement;
  private tab: string | null = null;
  private shift = false;
  private form: FormFactor = "desktop";
  private readonly variants: VariantsMenu;
  private sheet: HTMLElement | null = null;
  private readonly id = ++uid;

  constructor(private layout: KeypadLayout, private readonly host: KeypadHost) {
    this.el = document.createElement("div");
    this.el.className = "mi-keypad";
    this.el.setAttribute("role", "group");
    this.el.setAttribute("aria-label", "Maths keypad");
    this.variants = new VariantsMenu(this.el, {
      activate: (k, b) => this.activate(k, b),
      get shift() { return false; },
    });
    this.el.addEventListener("keydown", (e) => this.gridKeydown(e));
  }

  setLayout(layout: KeypadLayout): void {
    this.layout = layout;
    this.render();
  }

  setForm(form: FormFactor): void {
    if (form === this.form && this.el.childElementCount) return;
    // The tab set differs between layouts (phones add the number pad as a tab): start from the first.
    if (form !== this.form) this.tab = null;
    this.form = form;
    this.render();
  }

  setLabel(label: string): void {
    this.el.setAttribute("aria-label", label);
  }

  private activate(key: Key, source: HTMLButtonElement): void {
    const pointer = document.activeElement !== source;
    const ui = this.host.run(this.shift && key.kind === "letter" && "type" in key.action
      ? { ...key, action: { type: key.action.type.toUpperCase() } }
      : key);
    if (ui === "shift") {
      this.shift = !this.shift;
      this.render();
      this.el.querySelector<HTMLElement>('[data-key-id="shift"]')?.focus({ preventScroll: true });
      return;
    }
    if (ui === "periodic-table") { this.openTable(); return; }
    if (this.shift && key.kind === "letter") { this.shift = false; this.render(); }
    if (pointer) this.host.refocus();
  }

  private openTable(): void {
    this.closeTable();
    this.sheet = periodicTable(
      (symbol) => { this.host.insertElement(symbol); this.closeTable(); this.host.refocus(); },
      () => { this.closeTable(); this.host.refocus(); },
    );
    this.el.append(this.sheet);
    this.sheet.querySelector<HTMLElement>(".mi-sheet__close")?.focus({ preventScroll: true });
  }

  private closeTable(): void {
    this.sheet?.remove();
    this.sheet = null;
  }

  // ------------------------------------------------------------ layout

  private navigation(): Key[] {
    return this.layout.navigation.map((k) => (k.id === "submit" && !this.host.submitEnabled() ? NEXT_BOX_KEY : k));
  }

  render(): void {
    this.variants.close(false);
    this.closeTable();
    this.el.dataset.form = this.form;
    const wide = this.form !== "phone";
    const tabs = wide ? this.layout.tabs : [this.layout.numberPad, ...this.layout.tabs];
    if (!tabs.some((t) => t.id === this.tab)) this.tab = tabs[0]?.id ?? null;
    const current = tabs.find((t) => t.id === this.tab);
    const children: HTMLElement[] = [];
    if (wide) {
      const left = div("mi-keypad__side");
      left.append(this.grid(this.layout.numberPad, "mi-keypad__numbers"), this.grid({ id: "navigation", label: { text: "" }, columns: 5, keys: this.navigation() }, "mi-keypad__nav"));
      const right = div("mi-keypad__main");
      right.append(this.tabBar(tabs));
      if (current) right.append(this.panel(current));
      children.push(left, right);
    } else {
      children.push(this.tabBar(tabs));
      if (current) children.push(this.panel(current));
      children.push(this.grid({ id: "navigation", label: { text: "" }, columns: 5, keys: this.navigation() }, "mi-keypad__nav"));
    }
    this.el.replaceChildren(...children);
  }

  private tabBar(tabs: KeypadTab[]): HTMLElement {
    const bar = div("mi-tabs");
    bar.setAttribute("role", "tablist");
    for (const t of tabs) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mi-tab";
      b.id = `mi-tab-${this.id}-${t.id}`;
      b.setAttribute("role", "tab");
      const selected = t.id === this.tab;
      b.setAttribute("aria-selected", String(selected));
      b.setAttribute("aria-controls", `mi-panel-${this.id}`);
      b.tabIndex = selected ? 0 : -1;
      if (selected) b.classList.add("mi-tab--selected");
      if (t.aria) b.setAttribute("aria-label", t.aria);
      b.append(renderLabel(t.label));
      b.addEventListener("pointerdown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        this.tab = t.id;
        this.render();
        this.el.querySelector<HTMLElement>(`#mi-tab-${this.id}-${t.id}`)?.focus({ preventScroll: true });
      });
      bar.append(b);
    }
    bar.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      e.stopPropagation();
      const i = tabs.findIndex((t) => t.id === this.tab);
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      if (next) {
        this.tab = next.id;
        this.render();
        this.el.querySelector<HTMLElement>(`#mi-tab-${this.id}-${next.id}`)?.focus();
      }
    });
    return bar;
  }

  private panel(tab: KeypadTab): HTMLElement {
    const p = this.grid(tab, "mi-panel");
    p.id = `mi-panel-${this.id}`;
    p.setAttribute("role", "tabpanel");
    p.setAttribute("aria-labelledby", `mi-tab-${this.id}-${tab.id}`);
    return p;
  }

  private grid(tab: KeypadTab, className: string): HTMLElement {
    const g = div(`mi-grid ${className}`);
    g.style.setProperty("--mi-columns", String(tab.columns));
    g.dataset.columns = String(tab.columns);
    tab.keys.forEach((k, i) => {
      const b = keyButton(k, {
        activate: (key, src) => this.activate(key, src),
        openVariants: (key, src, viaPointer) => this.variants.open(key, src, viaPointer),
        shift: this.shift,
      });
      b.tabIndex = i === 0 ? 0 : -1;
      g.append(b);
    });
    return g;
  }

  /** Roving focus inside a grid; Alt+ArrowDown opens variants. */
  private gridKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("mi-key") || target.closest(".mi-variants")) return;
    const grid = target.parentElement;
    if (!grid?.classList.contains("mi-grid")) return;
    if (e.altKey && e.key === "ArrowDown" && target.dataset.hasVariants !== undefined) {
      e.preventDefault();
      const key = this.findKey(target.dataset.keyId ?? "");
      if (key) this.variants.open(key, target as HTMLButtonElement, false);
      return;
    }
    const keys = [...grid.children] as HTMLElement[];
    const cols = Number(grid.dataset.columns) || 1;
    const i = keys.indexOf(target);
    const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    let j: number;
    if (e.key in move) j = i + (move[e.key] as number);
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = keys.length - 1;
    else return;
    e.preventDefault();
    const next = keys[Math.max(0, Math.min(keys.length - 1, j))];
    if (next && next !== target) {
      target.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    }
  }

  private findKey(id: string): Key | undefined {
    const all = [this.layout.numberPad, ...this.layout.tabs].flatMap((t) => t.keys).concat(this.layout.navigation);
    return all.find((k) => k.id === id);
  }
}

function div(className: string): HTMLDivElement {
  const d = document.createElement("div");
  d.className = className;
  return d;
}
