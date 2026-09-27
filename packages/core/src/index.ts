/**
 * @mathinput/core — expression tree, serialisers and (later) the headless
 * editor and parsers. See docs/dev/specs/mathinput-component.md.
 */
export type * from "./model/types.js";
export * from "./model/builders.js";
export { validateDocument, migrateDocument, cloneDocument, cloneRow, InvalidDocumentError } from "./model/validate.js";
export { isTemplate, slotsOf, isOptionalSlot, walk, hasPlaceholders, hasUnbalancedBrackets } from "./model/slots.js";
export { ELEMENTS, GREEK, unitInfo, isElementSymbol, isVariableLetter } from "./model/vocabulary.js";
export type { UnitInfo } from "./model/vocabulary.js";

export { toLatex, type LatexOptions } from "./serialize/latex.js";
export { toText } from "./serialize/text.js";
export { toSpoken } from "./serialize/spoken.js";
export { toMathML } from "./serialize/mathml.js";
export { PlaceholderError } from "./serialize/common.js";

export { Editor, type EditorOptions, type Selection, type ChangeEvent, type CommandName } from "./editor/editor.js";
export { rowAt, parentOf, samePath, comparePositions, emptySlotPositions, type Position, type Step } from "./editor/position.js";
export { AUTOREPLACE_WORDS } from "./rules/autoreplace.js";
export { createValue, type MathInputValue } from "./value.js";
