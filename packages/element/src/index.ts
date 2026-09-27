/**
 * @mathinput/element — the <math-input> custom element. Import
 * `@mathinput/element/define` to register it, and
 * `@mathinput/element/mathinput.css` for the default styles.
 */
export { MathInputElement, type MathInputEventMap, type ParseErrorDetail } from "./math-input.js";
export { renderRow, type RenderOptions } from "./render/renderer.js";
export { defineMathInput } from "./register.js";
export type { MathInputValue, MathDocument, Subject } from "@mathinput/core";
