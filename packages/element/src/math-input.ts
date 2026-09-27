/**
 * The <math-input> custom element (spec §4). Composes the headless editor,
 * the renderer, input handling and the live region. Light DOM (spec §10.1).
 */
import {
  Editor, ParseError, createValue, rowAt, decodeClipboard, encodeClipboard, fromLatex, toLatex, toSpoken, validateDocument,
  MIME_LATEX, MIME_TEXT, MIME_TREE,
  type ClipboardData, type CommandName, type MathDocument, type MathInputValue, type Node, type Row, type Subject,
} from "@mathinput/core";
import { renderRow } from "./render/renderer.js";
import { positionAt, tokenRange } from "./render/hit-test.js";
import { handleKeydown } from "./input/keyboard.js";
import { LiveRegion } from "./a11y/live-region.js";

const SUBJECTS = new Set<Subject>(["maths", "chemistry", "physics"]);

export interface ParseErrorDetail { source: "latex" | "paste"; input: string; message: string }

/** Events of <math-input> (spec §4.2). */
export interface MathInputEventMap extends Omit<HTMLElementEventMap, "input" | "change" | "submit"> {
  input: CustomEvent<MathInputValue>;
  change: CustomEvent<MathInputValue>;
  submit: CustomEvent<MathInputValue>;
  "parse-error": CustomEvent<ParseErrorDetail>;
  "keypad-toggle": CustomEvent<{ open: boolean }>;
}
let uid = 0;

export class MathInputElement extends HTMLElement {
  static readonly observedAttributes = [
    "subject", "latex", "placeholder", "label", "aria-label", "readonly", "disabled", "autoreplace",
    "submit-on-enter", "theme", "math-font",
  ];

  readonly #editor: Editor;
  #field: HTMLDivElement | null = null;
  #content: HTMLSpanElement | null = null;
  #receiver: HTMLTextAreaElement | null = null;
  #live: LiveRegion | null = null;
  #valueAtFocus = "";
  #dragging = false;
  #built = false;
  #pendingLatex: string | null = null;

  constructor() {
    super();
    this.#editor = new Editor({ version: 1, subject: "maths", root: [] }, { autoreplace: true });
    this.#editor.onChange((e) => {
      this.#render();
      if (e.docChanged) this.#emit("input");
    });
  }

  // ---------------------------------------------------------- lifecycle

  connectedCallback(): void {
    if (!this.#built) this.#build();
    if (this.#pendingLatex !== null) {
      const latex = this.#pendingLatex;
      this.#pendingLatex = null;
      this.#loadLatex(latex);
    }
    this.#render();
  }

  disconnectedCallback(): void {
    this.#live?.cancel();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case "subject": {
        const s = (value ?? "maths") as Subject;
        this.#editor.setSubject(SUBJECTS.has(s) ? s : "maths");
        this.dataset.subject = this.#editor.subject;
        break;
      }
      case "latex":
        if (value === null) break;
        if (!this.#built) this.#pendingLatex = value;
        else if (value !== this.latex) this.#loadLatex(value);
        break;
      case "theme":
        if (value === "light" || value === "dark") this.dataset.miTheme = value;
        else delete this.dataset.miTheme;
        break;
      case "math-font":
        if (value) this.style.setProperty("--mi-font-math", value);
        else this.style.removeProperty("--mi-font-math");
        break;
      default:
        if (this.#built) this.#syncAttributes();
    }
  }

  #build(): void {
    this.#built = true;
    this.classList.add("mi-root");
    this.dataset.subject = this.#editor.subject;
    const field = document.createElement("div");
    field.className = "mi-field";
    const receiver = document.createElement("textarea");
    receiver.className = "mi-receiver";
    receiver.setAttribute("autocapitalize", "off");
    receiver.setAttribute("autocomplete", "off");
    receiver.setAttribute("autocorrect", "off");
    receiver.setAttribute("spellcheck", "false");
    receiver.setAttribute("aria-roledescription", "maths input");
    receiver.rows = 1;
    const liveEl = document.createElement("div");
    liveEl.className = "mi-live";
    liveEl.id = `mi-live-${++uid}`;
    receiver.setAttribute("aria-describedby", liveEl.id);
    // The receiver lives inside the field so the scrollable field contains its focus target.
    const content = document.createElement("span");
    content.className = "mi-field__content";
    field.append(receiver, content);
    this.append(field, liveEl);
    this.#field = field;
    this.#content = content;
    this.#receiver = receiver;
    this.#live = new LiveRegion(liveEl);
    this.#wireInput(receiver, field);
    this.#syncAttributes();
  }

  #syncAttributes(): void {
    const r = this.#receiver;
    if (!r) return;
    const label = this.getAttribute("aria-label") ?? this.getAttribute("label");
    if (label) r.setAttribute("aria-label", label);
    else r.removeAttribute("aria-label");
    const labelledBy = this.getAttribute("aria-labelledby");
    if (labelledBy) r.setAttribute("aria-labelledby", labelledBy);
    r.disabled = this.disabled;
    r.readOnly = this.readOnly;
    r.tabIndex = this.readOnly ? -1 : 0;
    this.toggleAttribute("data-readonly", this.readOnly);
    this.toggleAttribute("data-disabled", this.disabled);
    this.#render();
  }

  // ------------------------------------------------------------- input

  #wireInput(receiver: HTMLTextAreaElement, field: HTMLDivElement): void {
    // Native events from the receiver must not look like our CustomEvents.
    for (const type of ["input", "change", "beforeinput", "select"]) {
      receiver.addEventListener(type, (e) => e.stopPropagation());
    }
    receiver.addEventListener("keydown", (e) => {
      if (!this.#editable()) return;
      const result = handleKeydown(e, this.#editor, { submitOnEnter: this.hasAttribute("submit-on-enter") });
      if (result === "submit") this.#submit();
      else if (result === "escape") receiver.blur();
    });
    receiver.addEventListener("beforeinput", (e) => {
      if (!this.#editable()) { e.preventDefault(); return; }
      if (e.inputType === "insertText" || e.inputType === "insertReplacementText") {
        e.preventDefault();
        if (e.data) this.#typeText(e.data);
      } else if (e.inputType === "insertLineBreak" || e.inputType === "insertParagraph") {
        e.preventDefault();
      } else if (e.inputType.startsWith("delete")) {
        e.preventDefault();
      }
    });
    // IME and dictation: take what was composed, then clear the receiver.
    receiver.addEventListener("compositionend", (e) => {
      if (e.data) this.#typeText(e.data);
      receiver.value = "";
    });
    receiver.addEventListener("input", () => {
      if (receiver.value && !(receiver as unknown as { isComposing?: boolean }).isComposing) {
        const text = receiver.value;
        receiver.value = "";
        this.#typeText(text);
      }
    });
    receiver.addEventListener("copy", (e) => this.#copy(e, false));
    receiver.addEventListener("cut", (e) => this.#copy(e, true));
    receiver.addEventListener("paste", (e) => this.#paste(e));
    receiver.addEventListener("focus", () => {
      this.#valueAtFocus = JSON.stringify(this.#editor.document);
      this.toggleAttribute("data-focused", true);
      this.#render();
    });
    receiver.addEventListener("blur", () => {
      this.toggleAttribute("data-focused", false);
      this.#render();
      if (JSON.stringify(this.#editor.document) !== this.#valueAtFocus) this.#emit("change");
    });

    field.addEventListener("pointerdown", (e) => {
      if (!this.#editable() || e.button !== 0) return;
      e.preventDefault();
      // Hit-test before focusing: focusing re-renders and detaches the target.
      const pos = positionAt(field, e.target, e.clientX);
      this.#receiver?.focus({ preventScroll: true });
      if (e.shiftKey && this.#editor.caret) this.#editor.setCaret(pos, this.#editor.anchor ?? this.#editor.caret);
      else this.#editor.setCaret(pos);
      this.#dragging = true;
      field.setPointerCapture?.(e.pointerId);
    });
    field.addEventListener("pointermove", (e) => {
      if (!this.#dragging) return;
      const target = document.elementFromPoint?.(e.clientX, e.clientY) ?? e.target;
      const pos = positionAt(field, target, e.clientX);
      const anchor = this.#editor.anchor ?? this.#editor.caret;
      this.#editor.setCaret(pos, anchor);
    });
    const endDrag = () => { this.#dragging = false; };
    field.addEventListener("pointerup", endDrag);
    field.addEventListener("pointercancel", endDrag);
    field.addEventListener("dblclick", (e) => {
      if (!this.#editable()) return;
      const range = tokenRange(field, e.target);
      if (range) this.#editor.setCaret({ path: range.path, index: range.end }, { path: range.path, index: range.start });
    });
  }

  #editable(): boolean {
    return !this.readOnly && !this.disabled;
  }

  #typeText(text: string): void {
    for (const ch of Array.from(text)) {
      if (ch === "\n") continue;
      this.#editor.type(ch);
    }
  }

  #selectedRow(): Row | null {
    const sel = this.#editor.selection();
    if (!sel) return null;
    const row = rowAt(this.#editor.document.root, sel.path);
    return JSON.parse(JSON.stringify(row.slice(sel.start, sel.end))) as Row;
  }

  #copy(e: ClipboardEvent, cut: boolean): void {
    const row = this.#selectedRow() ?? (this.#editor.document.root.length ? JSON.parse(JSON.stringify(this.#editor.document.root)) as Row : null);
    if (!row || !e.clipboardData) return;
    e.preventDefault();
    const data = encodeClipboard(row, this.#editor.subject);
    for (const [type, value] of Object.entries(data)) if (value !== undefined) e.clipboardData.setData(type, value);
    if (cut && this.#editable()) {
      if (!this.#editor.selection()) this.#editor.selectAll();
      this.#editor.deleteBackward();
    }
  }

  #paste(e: ClipboardEvent): void {
    e.preventDefault();
    if (!this.#editable() || !e.clipboardData) return;
    const data: ClipboardData = {};
    for (const type of [MIME_TREE, MIME_LATEX, MIME_TEXT] as const) {
      const v = e.clipboardData.getData(type);
      if (v) data[type] = v;
    }
    try {
      const nodes = decodeClipboard(data, this.#editor.subject);
      if (nodes.length) this.#editor.insert(nodes);
    } catch (err) {
      if (err instanceof ParseError) {
        const detail: ParseErrorDetail = { source: "paste", input: data[MIME_TEXT] ?? data[MIME_LATEX] ?? "", message: err.message };
        this.#dispatch("parse-error", detail);
      } else throw err;
    }
  }

  // ------------------------------------------------------------ render

  #render(): void {
    const field = this.#field;
    if (!field) return;
    const focused = this.hasAttribute("data-focused");
    const root = renderRow(this.#editor.document.root, {
      caret: this.#editable() ? this.#editor.caret : null,
      selection: this.#editor.selection(),
      interactive: true,
    });
    if (this.#editor.document.root.length === 0 && !focused) {
      const hint = document.createElement("span");
      hint.className = "mi-empty";
      hint.textContent = this.getAttribute("placeholder") ?? "Enter your answer";
      root.append(hint);
    }
    this.#content?.replaceChildren(root);
    field.toggleAttribute("data-empty", this.#editor.document.root.length === 0);
    this.#mirrorSelection();
    this.#keepCaretVisible();
    this.#live?.update(toSpoken(this.#editor.document));
  }

  /** Mirror the selection's text into the receiver so native copy has something to copy. */
  #mirrorSelection(): void {
    const r = this.#receiver;
    if (!r) return;
    const sel = this.#selectedRow();
    const text = sel ? encodeClipboard(sel, this.#editor.subject)[MIME_TEXT] ?? "" : "";
    if (r.value !== text) r.value = text;
    if (text && document.activeElement === r) r.select();
  }

  #keepCaretVisible(): void {
    const field = this.#field;
    const caret = field?.querySelector<HTMLElement>(".mi-caret");
    if (!field) return;
    if (!this.hasAttribute("data-focused")) { field.scrollLeft = 0; return; }
    if (!caret) return;
    const fr = field.getBoundingClientRect();
    const cr = caret.getBoundingClientRect();
    if (!fr.width) return;
    if (cr.right > fr.right - 16) field.scrollLeft += cr.right - fr.right + 32;
    else if (cr.left < fr.left + 16) field.scrollLeft -= fr.left - cr.left + 32;
  }

  // ------------------------------------------------------------ events

  #dispatch(type: string, detail: unknown): boolean {
    return this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable: false }));
  }

  #emit(type: "input" | "change" | "submit"): void {
    this.#dispatch(type, createValue(this.#editor.document));
  }

  #submit(): void {
    if (this.#editor.document.root.length === 0) {
      this.#field?.classList.remove("mi-field--shake");
      void this.#field?.offsetWidth;
      this.#field?.classList.add("mi-field--shake");
      return;
    }
    this.#emit("submit");
  }

  #loadLatex(latex: string): void {
    try {
      const doc = latex.trim() ? fromLatex(latex, this.#editor.subject) : { version: 1 as const, subject: this.#editor.subject, root: [] };
      this.#editor.setDocument(doc);
    } catch (err) {
      if (!(err instanceof ParseError)) throw err;
      this.#editor.setDocument({ version: 1, subject: this.#editor.subject, root: [] });
      this.#dispatch("parse-error", { source: "latex", input: latex, message: err.message });
    }
  }

  // ------------------------------------------------------ public API

  override addEventListener<K extends keyof MathInputEventMap>(type: K, listener: (this: MathInputElement, ev: MathInputEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    super.addEventListener(type, listener, options);
  }

  override removeEventListener<K extends keyof MathInputEventMap>(type: K, listener: (this: MathInputElement, ev: MathInputEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void;
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    super.removeEventListener(type, listener, options);
  }

  get subject(): Subject { return this.#editor.subject; }
  set subject(v: Subject) { this.setAttribute("subject", v); }

  get readOnly(): boolean { return this.hasAttribute("readonly"); }
  set readOnly(v: boolean) { this.toggleAttribute("readonly", v); }

  get disabled(): boolean { return this.hasAttribute("disabled"); }
  set disabled(v: boolean) { this.toggleAttribute("disabled", v); }

  get value(): MathDocument { return this.#editor.getDocument(); }
  set value(doc: MathDocument) { this.setValue(doc); }

  get latex(): string { return toLatex(this.#editor.document); }
  set latex(v: string) { this.#loadLatex(v); }

  /** The underlying headless editor, for keypads and advanced hosts. */
  get editor(): Editor { return this.#editor; }

  getValue(): MathInputValue { return createValue(this.#editor.document); }

  setValue(doc: MathDocument): void {
    const clean = validateDocument(doc);
    if (clean.subject !== this.#editor.subject) this.setAttribute("subject", clean.subject);
    this.#editor.setDocument(clean);
  }

  override focus(options?: FocusOptions): void { this.#receiver?.focus(options); }
  override blur(): void { this.#receiver?.blur(); }
  clear(): void { this.#editor.clear(); }
  commit(): void { this.#valueAtFocus = JSON.stringify(this.#editor.document); this.#emit("change"); }
  undo(): void { this.#editor.undo(); }
  redo(): void { this.#editor.redo(); }
  selectAll(): void { this.#editor.selectAll(); }
  insert(nodes: Node | Row): void { this.#editor.insert(nodes); }
  execute(command: CommandName): boolean { return this.#editor.execute(command); }
}
