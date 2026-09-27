/**
 * Structural validation of untrusted JSON (spec §3.3), plus deep clone.
 */
import type { MathDocument, Node, Row } from "./types.js";
import { CONSTS, FNS, OPS, RELS, STATES, SYMS, isElementSymbol, isVariableLetter, unitInfo } from "./vocabulary.js";

export class InvalidDocumentError extends Error {
  constructor(message: string, readonly path: string) {
    super(`${message} at ${path}`);
    this.name = "InvalidDocumentError";
  }
}

const FENCES = new Set(["(", ")", "[", "]", "{", "}", "|"]);
const SUBJECTS = new Set(["maths", "chemistry", "physics"]);

type Json = Record<string, unknown>;

function fail(message: string, path: string): never {
  throw new InvalidDocumentError(message, path);
}

function isObj(x: unknown): x is Json {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function checkRow(x: unknown, path: string): Row {
  if (!Array.isArray(x)) fail("expected a row (array)", path);
  return x.map((n, i) => checkNode(n, `${path}[${i}]`));
}

function oneOf(v: unknown, allowed: readonly string[], path: string): void {
  if (typeof v !== "string" || !allowed.includes(v)) fail(`unexpected value ${JSON.stringify(v)}`, path);
}

function checkNode(x: unknown, path: string): Node {
  if (!isObj(x) || typeof x.t !== "string") fail("expected a node with a string 't'", path);
  const val = x.v;
  const rowAt = (key: string) => checkRow(x[key], `${path}.${key}`);
  switch (x.t) {
    case "num":
      if (typeof val !== "string" || !/^[0-9.]$/.test(val)) fail("num must be one digit or '.'", path);
      return { t: "num", v: val as "0" };
    case "var":
      if (typeof val !== "string" || !isVariableLetter(val)) fail("var must be one Latin or Greek letter", path);
      return { t: "var", v: val };
    case "const": oneOf(val, CONSTS, path); return x as unknown as Node;
    case "op": oneOf(val, OPS, path); return x as unknown as Node;
    case "rel": oneOf(val, RELS, path); return x as unknown as Node;
    case "fn": oneOf(val, FNS, path); return x as unknown as Node;
    case "sym": oneOf(val, SYMS, path); return x as unknown as Node;
    case "state": oneOf(val, STATES, path); return x as unknown as Node;
    case "text":
      if (typeof val !== "string" || val.length === 0 || val.length > 40) fail("text must be 1–40 characters", path);
      return { t: "text", v: val };
    case "unit":
      if (typeof val !== "string" || !unitInfo(val)) fail(`unknown unit ${JSON.stringify(val)}`, path);
      return { t: "unit", v: val };
    case "element":
      if (typeof val !== "string" || !isElementSymbol(val)) fail(`unknown element ${JSON.stringify(val)}`, path);
      return { t: "element", v: val };
    case "frac": return { t: "frac", num: rowAt("num"), den: rowAt("den") };
    case "deriv": return { t: "deriv", num: rowAt("num"), den: rowAt("den") };
    case "sup": return { t: "sup", body: rowAt("body") };
    case "sub": return { t: "sub", body: rowAt("body") };
    case "subsup": return { t: "subsup", sub: rowAt("sub"), sup: rowAt("sup") };
    case "recurring": return { t: "recurring", body: rowAt("body") };
    case "root":
      return x.index === undefined
        ? { t: "root", body: rowAt("body") }
        : { t: "root", index: rowAt("index"), body: rowAt("body") };
    case "over":
      oneOf(x.kind, ["bar", "vec", "hat"], `${path}.kind`);
      return { t: "over", kind: x.kind as "bar", body: rowAt("body") };
    case "bigop":
      oneOf(x.op, ["int", "sum"], `${path}.op`);
      return { t: "bigop", op: x.op as "int", lower: rowAt("lower"), upper: rowAt("upper"), body: rowAt("body") };
    case "fence": {
      if (!FENCES.has(x.open as string)) fail("bad fence open", `${path}.open`);
      if (!FENCES.has(x.close as string)) fail("bad fence close", `${path}.close`);
      if (x.openGhost === true && x.closeGhost === true) fail("fence cannot have two ghost sides", path);
      const node: Node = { t: "fence", open: x.open as "(", close: x.close as ")", body: rowAt("body") };
      if (x.openGhost === true) node.openGhost = true;
      if (x.closeGhost === true) node.closeGhost = true;
      return node;
    }
    case "vector": {
      const rows = x.rows, cols = x.cols;
      if (!Number.isInteger(rows) || !Number.isInteger(cols) || (rows as number) < 1 || (cols as number) < 1) {
        fail("vector needs positive integer rows and cols", path);
      }
      if (!Array.isArray(x.cells) || x.cells.length !== (rows as number) * (cols as number)) {
        fail("vector cells must have rows × cols entries", `${path}.cells`);
      }
      return { t: "vector", rows: rows as number, cols: cols as number, cells: x.cells.map((c, i) => checkRow(c, `${path}.cells[${i}]`)) };
    }
    default:
      fail(`unknown node type ${JSON.stringify(x.t)}`, path);
  }
}

/** Validate untrusted JSON and return a clean, typed copy. */
export function validateDocument(json: unknown): MathDocument {
  if (!isObj(json)) fail("expected an object", "$");
  if (json.version !== 1) fail(`unsupported version ${JSON.stringify(json.version)}`, "$.version");
  if (!SUBJECTS.has(json.subject as string)) fail("unknown subject", "$.subject");
  return { version: 1, subject: json.subject as MathDocument["subject"], root: checkRow(json.root, "$.root") };
}

/** Migrate an older document to the current version. Identity for version 1. */
export function migrateDocument(json: unknown): MathDocument {
  return validateDocument(json);
}

export function cloneRow(row: Row): Row {
  return JSON.parse(JSON.stringify(row)) as Row;
}

export function cloneDocument(d: MathDocument): MathDocument {
  return JSON.parse(JSON.stringify(d)) as MathDocument;
}
