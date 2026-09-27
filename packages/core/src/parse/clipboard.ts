/**
 * Clipboard codec (spec §7.8). Copy offers three flavours; paste tries the
 * tree, then LaTeX, then linear text.
 */
import type { MathDocument, Row, Subject } from "../model/types.js";
import { validateDocument } from "../model/validate.js";
import { toLatex } from "../serialize/latex.js";
import { toText } from "../serialize/text.js";
import { ParseError } from "./common.js";
import { fromLatex } from "./latex.js";
import { fromText } from "./text.js";

export const MIME_TREE = "application/x-mathinput+json";
export const MIME_LATEX = "text/x-latex";
export const MIME_TEXT = "text/plain";

export type ClipboardData = Partial<Record<typeof MIME_TREE | typeof MIME_LATEX | typeof MIME_TEXT, string>>;

/** Encode a row (for example a selection) of a document for the clipboard. */
export function encodeClipboard(row: Row, subject: Subject): ClipboardData {
  const doc: MathDocument = { version: 1, subject, root: row };
  return {
    [MIME_TREE]: JSON.stringify(doc),
    [MIME_LATEX]: toLatex(doc),
    [MIME_TEXT]: toText(doc),
  };
}

/** Decode pasted data into nodes to insert. Throws ParseError when nothing parses. */
export function decodeClipboard(data: ClipboardData, subject: Subject): Row {
  const tree = data[MIME_TREE];
  if (tree) {
    try {
      return validateDocument(JSON.parse(tree)).root;
    } catch {
      // Fall through to the text flavours.
    }
  }
  const latex = data[MIME_LATEX];
  if (latex) return fromLatex(stripDelimiters(latex), subject).root;
  const plain = data[MIME_TEXT]?.trim();
  if (!plain) return [];
  if (/\\|\^\{|_\{/.test(plain) || /^\$.*\$$/s.test(plain)) return fromLatex(stripDelimiters(plain), subject).root;
  return fromText(plain, subject).root;
}

function stripDelimiters(s: string): string {
  const t = s.trim();
  const m = /^\$\$?([\s\S]*?)\$?\$$/.exec(t) ?? /^\\\(([\s\S]*)\\\)$/.exec(t) ?? /^\\\[([\s\S]*)\\\]$/.exec(t);
  return m ? (m[1] as string).trim() : t;
}

export { ParseError };
