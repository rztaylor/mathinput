/**
 * Hardware keyboard bindings (spec §7.5). Printable characters arrive through
 * `beforeinput` so IME and dictation work; this handles keys that do not
 * produce text.
 */
import type { Editor } from "@mathinput/core";

export type KeyResult = "handled" | "submit" | "escape" | "ignored";

export function handleKeydown(e: KeyboardEvent, editor: Editor, opts: { submitOnEnter: boolean }): KeyResult {
  const mod = e.metaKey || e.ctrlKey;
  const done = (): KeyResult => { e.preventDefault(); return "handled"; };
  if (mod && !e.altKey) {
    switch (e.key.toLowerCase()) {
      case "z": if (e.shiftKey) editor.redo(); else editor.undo(); return done();
      case "y": editor.redo(); return done();
      case "a": editor.selectAll(); return done();
      default: return "ignored"; // copy, cut and paste use clipboard events
    }
  }
  switch (e.key) {
    case "ArrowLeft": if (e.shiftKey) editor.extendLeft(); else editor.moveLeft(); return done();
    case "ArrowRight": if (e.shiftKey) editor.extendRight(); else editor.moveRight(); return done();
    case "ArrowUp": editor.moveUp(); return done();
    case "ArrowDown": editor.moveDown(); return done();
    case "Home": if (e.shiftKey) editor.extendHome(); else editor.moveHome(); return done();
    case "End": if (e.shiftKey) editor.extendEnd(); else editor.moveEnd(); return done();
    case "Backspace": editor.deleteBackward(); return done();
    case "Delete": editor.deleteForward(); return done();
    case "Tab": {
      const moved = e.shiftKey ? editor.moveToPreviousPlaceholder() : editor.moveToNextPlaceholder();
      return moved ? done() : "ignored";
    }
    case "Enter":
      e.preventDefault();
      if (e.shiftKey) return "handled";
      return opts.submitOnEnter ? "submit" : "handled";
    case "Escape": return "escape";
    default: return "ignored";
  }
}
