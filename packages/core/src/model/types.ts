/**
 * The expression tree (spec §3). This is the single source of truth: every
 * output format is derived from it, and it is the storage format.
 */

export type Subject = "maths" | "chemistry" | "physics";

export interface MathDocument {
  version: 1;
  subject: Subject;
  root: Row;
}

export type Row = Node[];

// ---------------------------------------------------------------- atoms

export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | ".";

export type ConstName = "pi" | "e" | "i" | "infinity";
export type OpName = "plus" | "minus" | "times" | "cdot" | "div" | "slash" | "pm" | "mp";
export type RelName =
  | "eq" | "neq" | "lt" | "gt" | "le" | "ge" | "approx" | "equiv" | "propto"
  | "to" | "equilibrium" | "implies" | "iff" | "ratio";
export type FnName =
  | "sin" | "cos" | "tan" | "arcsin" | "arccos" | "arctan"
  | "sec" | "cosec" | "cot" | "ln" | "log" | "exp";
export type SymName =
  | "degree" | "factorial" | "percent" | "comma" | "prime" | "ellipsis"
  | "uparrow" | "downarrow" | "delta" | "therefore";
export type StateName = "s" | "l" | "g" | "aq";

export interface NumAtom { t: "num"; v: Digit }
/** A single Latin or Greek letter. */
export interface VarAtom { t: "var"; v: string }
export interface ConstAtom { t: "const"; v: ConstName }
export interface OpAtom { t: "op"; v: OpName }
export interface RelAtom { t: "rel"; v: RelName }
export interface FnAtom { t: "fn"; v: FnName }
export interface SymAtom { t: "sym"; v: SymName }
/** A short upright word between expressions, such as "or". */
export interface TextAtom { t: "text"; v: string }
/** A unit symbol from the unit table, such as "m", "kJ", "°C". */
export interface UnitAtom { t: "unit"; v: string }
/** A chemical element symbol, such as "Cl". */
export interface ElementAtom { t: "element"; v: string }
export interface StateAtom { t: "state"; v: StateName }

export type Atom =
  | NumAtom | VarAtom | ConstAtom | OpAtom | RelAtom | FnAtom | SymAtom
  | TextAtom | UnitAtom | ElementAtom | StateAtom;

// ------------------------------------------------------------ templates

export type FenceChar = "(" | ")" | "[" | "]" | "{" | "}" | "|";

export interface FracNode { t: "frac"; num: Row; den: Row }
/** Superscript attached to the preceding node (or a ghost base at row start). */
export interface SupNode { t: "sup"; body: Row }
/** Subscript attached to the preceding node. */
export interface SubNode { t: "sub"; body: Row }
export interface SubSupNode { t: "subsup"; sub: Row; sup: Row }
/** Square root when `index` is absent, nth root otherwise. */
export interface RootNode { t: "root"; index?: Row; body: Row }
export interface FenceNode {
  t: "fence";
  open: FenceChar;
  close: FenceChar;
  body: Row;
  /** The opening side has not been typed yet (spec §7.4). */
  openGhost?: boolean;
  /** The closing side has not been typed yet (spec §7.4). */
  closeGhost?: boolean;
}
/** Column vector or small matrix; `cells` are row-major, length rows × cols. */
export interface VectorNode { t: "vector"; rows: number; cols: number; cells: Row[] }
/** Recurring decimal digits; rendered with dots over the first and last digit. */
export interface RecurringNode { t: "recurring"; body: Row }
export interface BigOpNode { t: "bigop"; op: "int" | "sum"; lower: Row; upper: Row; body: Row }
/** Derivative shorthand d▢/d▢; `num` may stay empty for the operator form d/dx. */
export interface DerivNode { t: "deriv"; num: Row; den: Row }
export interface OverNode { t: "over"; kind: "bar" | "vec" | "hat"; body: Row }

export type Template =
  | FracNode | SupNode | SubNode | SubSupNode | RootNode | FenceNode
  | VectorNode | RecurringNode | BigOpNode | DerivNode | OverNode;

export type Node = Atom | Template;

export type AtomType = Atom["t"];
export type TemplateType = Template["t"];
