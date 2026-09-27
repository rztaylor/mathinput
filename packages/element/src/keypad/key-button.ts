/**
 * One keypad key (spec §8.3): a <button> whose label is text, an icon, or a
 * mini expression drawn by the field renderer. Keys with variants carry a
 * visible indicator and open a menu on long press, right-click, or from the
 * keyboard with Alt+ArrowDown, Shift+F10 or the context-menu key.
 */
import type { Key, KeyLabel } from "@mathinput/core";
import { renderRow } from "../render/renderer.js";
import { icon } from "./icons.js";

export const LONG_PRESS_MS = 400;

export interface KeyHandlers {
  activate(key: Key, source: HTMLButtonElement): void;
  openVariants(key: Key, source: HTMLButtonElement, viaPointer: boolean): void;
  /** Uppercase letter labels while shift is on. */
  shift: boolean;
}

export function renderLabel(label: KeyLabel, shift = false): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "mi-key__label";
  if ("text" in label) {
    wrap.textContent = label.text;
  } else if ("icon" in label) {
    wrap.append(icon(label.icon));
  } else if ("tree" in label) {
    wrap.classList.add("mi-key__expr");
    const tree = shift ? label.tree.map((n) => (n.t === "var" && /^[a-z]$/.test(n.v) ? { ...n, v: n.v.toUpperCase() } : n)) : label.tree;
    wrap.append(renderRow(tree, { activeSlot: label.active ?? null }));
  } else {
    // Host-supplied markup (documented escape hatch).
    wrap.innerHTML = label.html;
  }
  return wrap;
}

export function keyButton(key: Key, handlers: KeyHandlers): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "mi-key";
  b.dataset.keyId = key.id;
  if (key.kind) b.dataset.kind = key.kind;
  if (key.width === 2) b.dataset.wide = "";
  const shifted = handlers.shift && key.kind === "letter";
  b.setAttribute("aria-label", shifted ? `capital ${key.aria}` : key.aria);
  b.append(renderLabel(key.label, shifted));
  const hasVariants = !!key.variants?.length;
  if (hasVariants) {
    b.dataset.hasVariants = "";
    b.setAttribute("aria-haspopup", "menu");
    b.title = "Hold for more options";
    const more = document.createElement("span");
    more.className = "mi-key__more";
    more.setAttribute("aria-hidden", "true");
    b.append(more);
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pointerActive = false;
  let longPressed = false;
  let suppressClick = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    b.classList.remove("mi-key--pressed");
  };

  b.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); // keep focus in the field
    pointerActive = true;
    longPressed = false;
    b.classList.add("mi-key--pressed");
    if (hasVariants) {
      timer = setTimeout(() => {
        timer = null;
        longPressed = true;
        b.classList.remove("mi-key--pressed");
        handlers.openVariants(key, b, true);
      }, LONG_PRESS_MS);
    }
  });
  b.addEventListener("pointerup", (e) => {
    if (!pointerActive) return;
    pointerActive = false;
    suppressClick = true;
    const wasLong = longPressed;
    clear();
    if (!wasLong && e.button === 0) handlers.activate(key, b);
  });
  b.addEventListener("pointerleave", () => { pointerActive = false; clear(); });
  b.addEventListener("pointercancel", () => { pointerActive = false; clear(); });
  b.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (hasVariants && !longPressed) handlers.openVariants(key, b, false);
  });
  // Keyboard activation (Enter/Space) arrives as click with no preceding pointer interaction.
  b.addEventListener("click", (e) => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    handlers.activate(key, b);
  });
  return b;
}
