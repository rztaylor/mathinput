/** Run a key's action on an editor (spec §8.3). UI actions are returned for the element to handle. */
import type { Editor } from "../editor/editor.js";
import type { Key, KeyAction } from "./types.js";

export type UiAction = Extract<KeyAction, { ui: string }>["ui"];

export function applyKeyAction(editor: Editor, action: KeyAction): UiAction | null {
  if ("ui" in action) return action.ui;
  if ("type" in action) { editor.type(action.type); return null; }
  if ("insert" in action) { editor.insert(action.insert); return null; }
  if ("command" in action) { editor.execute(action.command); return null; }
  if ("bracket" in action) {
    if (action.bracket === "open") editor.openBracket(action.char);
    else if (action.bracket === "close") editor.closeBracket(action.char);
    else editor.wrapInBrackets(action.char);
    return null;
  }
  // Prefix and template are one edit, so one undo step.
  editor.insertTemplate(action.template, { absorb: action.absorb ?? false, prefix: action.prefix ?? [] });
  return null;
}

export function applyKey(editor: Editor, key: Key): UiAction | null {
  return applyKeyAction(editor, key.action);
}
