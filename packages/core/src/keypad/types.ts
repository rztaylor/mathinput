/**
 * Keypad definitions as data (spec §8.3). The element renders them; hosts
 * can replace or patch them. Key ids are stable public API.
 */
import type { CommandName } from "../editor/editor.js";
import type { Position } from "../editor/position.js";
import type { FenceChar, Node, Row, Subject, Template } from "../model/types.js";

export type KeyLabel =
  | { text: string }
  /** A mini expression drawn by the field renderer; `active` marks where the caret lands. */
  | { tree: Row; active?: Position }
  | { icon: "left" | "right" | "backspace" | "enter" | "shift" | "keypad" | "table" }
  /** Escape hatch for host-supplied markup. Never used by presets. */
  | { html: string };

export type KeyAction =
  /** Type a character through the subject rules, as a keyboard would. */
  | { type: string }
  | { insert: Node | Row }
  /** Insert `prefix` atoms, then the template (for example `e` then a power). */
  | { template: Template; absorb?: boolean; prefix?: Row }
  | { command: CommandName }
  | { bracket: "open" | "close" | "wrap"; char: FenceChar }
  /** Actions the element handles itself. */
  | { ui: "submit" | "shift" | "periodic-table" | "keypad-toggle" };

export type KeyKind = "digit" | "operator" | "template" | "letter" | "function" | "nav" | "primary" | "word";

export interface Key {
  id: string;
  label: KeyLabel;
  /** Accessible name, such as "fraction" or "x squared". */
  aria: string;
  action: KeyAction;
  /** Long-press / right-click alternatives. */
  variants?: Key[];
  width?: 1 | 2;
  kind?: KeyKind;
}

export interface KeypadTab {
  id: string;
  label: KeyLabel;
  aria?: string;
  columns: number;
  keys: Key[];
}

export interface KeypadLayout {
  tabs: KeypadTab[];
  /** The fixed bottom row: a subject key, arrows, backspace, submit. */
  navigation: Key[];
  /** The block pinned left on tablet and desktop; on phones it is the first tab. */
  numberPad: KeypadTab;
}

export type Level = "gcse-foundation" | "gcse-higher" | "a-level";

export interface KeypadPatch {
  addKeys?: Record<string, Key[]>;
  removeKeys?: string[];
  addTabs?: KeypadTab[];
  removeTabs?: string[];
  navigation?: Key[];
}

export type { Subject };
