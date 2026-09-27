/**
 * The "hold for more" menu (spec §8.3): the key and its variants in a row
 * above the key. Works by touch (slide and release), mouse and keyboard.
 */
import type { Key } from "@mathinput/core";
import { keyButton, type KeyHandlers } from "./key-button.js";

export class VariantsMenu {
  private el: HTMLElement | null = null;
  private source: HTMLButtonElement | null = null;
  private readonly onDocPointerDown = (e: PointerEvent) => {
    if (this.el && !this.el.contains(e.target as Node)) this.close(false);
  };
  private readonly onDocPointerUp = (e: PointerEvent) => {
    // Slide-and-release: releasing over a variant picks it.
    const target = document.elementFromPoint?.(e.clientX, e.clientY)?.closest<HTMLButtonElement>(".mi-variants .mi-key");
    if (target && this.el?.contains(target) && this.fromPointer) target.click();
    this.fromPointer = false;
  };
  private fromPointer = false;

  constructor(private readonly container: HTMLElement, private readonly handlers: Omit<KeyHandlers, "openVariants">) {}

  get isOpen(): boolean { return this.el !== null; }

  open(key: Key, source: HTMLButtonElement, viaPointer: boolean): void {
    this.close(false);
    this.source = source;
    this.fromPointer = viaPointer;
    const menu = document.createElement("div");
    menu.className = "mi-variants";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", `${key.aria} options`);
    const items = [{ ...key, variants: undefined }, ...(key.variants ?? [])];
    for (const item of items) {
      const b = keyButton(item, {
        ...this.handlers,
        activate: (k, btn) => { this.close(true); this.handlers.activate(k, btn); },
        openVariants: () => undefined,
      });
      b.setAttribute("role", "menuitem");
      b.tabIndex = -1;
      menu.append(b);
    }
    menu.addEventListener("keydown", (e) => this.keydown(e));
    this.container.append(menu);
    this.el = menu;
    this.position(source);
    document.addEventListener("pointerdown", this.onDocPointerDown, true);
    document.addEventListener("pointerup", this.onDocPointerUp, true);
    if (!viaPointer) (menu.querySelector(".mi-key") as HTMLElement | null)?.focus();
  }

  private position(source: HTMLElement): void {
    const menu = this.el;
    if (!menu) return;
    const c = this.container.getBoundingClientRect();
    const s = source.getBoundingClientRect();
    const w = menu.offsetWidth;
    const left = Math.max(4, Math.min(c.width - w - 4, s.left - c.left + s.width / 2 - w / 2));
    const top = s.top - c.top - menu.offsetHeight - 6;
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(4, top)}px`;
  }

  private keydown(e: KeyboardEvent): void {
    const items = [...(this.el?.querySelectorAll<HTMLElement>(".mi-key") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { items[(i + 1) % items.length]?.focus(); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { items[(i - 1 + items.length) % items.length]?.focus(); e.preventDefault(); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); this.close(true); }
  }

  close(restoreFocus: boolean): void {
    document.removeEventListener("pointerdown", this.onDocPointerDown, true);
    document.removeEventListener("pointerup", this.onDocPointerUp, true);
    const hadFocus = this.el?.contains(document.activeElement) ?? false;
    this.el?.remove();
    this.el = null;
    if (restoreFocus && hadFocus) this.source?.focus();
    this.source = null;
  }
}
