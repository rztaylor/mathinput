/**
 * React wrapper for <math-input> (spec §4.5). Works with React 18 and 19:
 * attributes and listeners are applied in effects rather than relying on
 * React's custom-element property support.
 */
import { createElement, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, type CSSProperties } from "react";
import "@mathinput/element/define";
import type { MathInputElement, ParseErrorDetail } from "@mathinput/element";
import type { KeypadLayout, KeypadPatch, MathDocument, MathInputValue, Subject } from "@mathinput/core";

export interface MathInputProps {
  subject?: Subject;
  /** Controlled tree value. Updates only when it differs from the element's content. */
  value?: MathDocument;
  /** Initial content as LaTeX (uncontrolled). */
  defaultLatex?: string;
  keypad?: "auto" | "always" | "never" | "collapsed";
  keypadLayout?: KeypadLayout | KeypadPatch;
  /** Id of an element to render the keypad into. */
  keypadContainer?: string;
  submitOnEnter?: boolean;
  label?: string;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  autoreplace?: boolean;
  theme?: "auto" | "light" | "dark";
  mathFont?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
  onInput?: (value: MathInputValue) => void;
  onChange?: (value: MathInputValue) => void;
  onSubmit?: (value: MathInputValue) => void;
  onParseError?: (detail: ParseErrorDetail) => void;
  onKeypadToggle?: (open: boolean) => void;
}

/** The ref exposes the element itself (methods: focus, clear, undo, insert, execute…). */
export type MathInputHandle = MathInputElement;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function setAttr(el: HTMLElement, name: string, value: string | boolean | undefined): void {
  if (value === undefined || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? "" : value);
}

export const MathInput = forwardRef<MathInputHandle | null, MathInputProps>(function MathInput(props, ref) {
  const elRef = useRef<MathInputElement | null>(null);
  useImperativeHandle(ref, () => elRef.current as MathInputElement, []);

  // Attributes. Layout effect so the element is configured before paint.
  useIsoLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    setAttr(el, "subject", props.subject);
    setAttr(el, "keypad", props.keypad);
    setAttr(el, "keypad-container", props.keypadContainer);
    setAttr(el, "submit-on-enter", props.submitOnEnter);
    setAttr(el, "label", props.label);
    setAttr(el, "placeholder", props.placeholder);
    setAttr(el, "readonly", props.readOnly);
    setAttr(el, "disabled", props.disabled);
    setAttr(el, "theme", props.theme);
    setAttr(el, "math-font", props.mathFont);
    if (props.autoreplace === false) el.setAttribute("autoreplace", "false");
    else el.removeAttribute("autoreplace");
  }, [props.subject, props.keypad, props.keypadContainer, props.submitOnEnter, props.label,
    props.placeholder, props.readOnly, props.disabled, props.theme, props.mathFont, props.autoreplace]);

  // Initial LaTeX, once.
  const initialLatex = useRef(props.defaultLatex);
  useIsoLayoutEffect(() => {
    const el = elRef.current;
    if (el && initialLatex.current !== undefined && props.value === undefined) el.latex = initialLatex.current;
  }, []); // mount only: defaultLatex is an initial value

  // Controlled value: only push when it differs, so typing never resets the caret.
  useIsoLayoutEffect(() => {
    const el = elRef.current;
    if (!el || props.value === undefined) return;
    if (JSON.stringify(el.value) !== JSON.stringify(props.value)) el.value = props.value;
  }, [props.value]);

  useIsoLayoutEffect(() => {
    const el = elRef.current;
    if (el && props.keypadLayout) el.keypadLayout = props.keypadLayout;
  }, [props.keypadLayout]);

  // Events. Handlers are read from a ref so changing them never re-subscribes.
  const handlers = useRef(props);
  handlers.current = props;
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onInput = (e: CustomEvent<MathInputValue>) => handlers.current.onInput?.(e.detail);
    const onChange = (e: CustomEvent<MathInputValue>) => handlers.current.onChange?.(e.detail);
    const onSubmit = (e: CustomEvent<MathInputValue>) => handlers.current.onSubmit?.(e.detail);
    const onParseError = (e: CustomEvent<ParseErrorDetail>) => handlers.current.onParseError?.(e.detail);
    const onToggle = (e: CustomEvent<{ open: boolean }>) => handlers.current.onKeypadToggle?.(e.detail.open);
    el.addEventListener("input", onInput);
    el.addEventListener("change", onChange);
    el.addEventListener("submit", onSubmit);
    el.addEventListener("parse-error", onParseError);
    el.addEventListener("keypad-toggle", onToggle);
    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("change", onChange);
      el.removeEventListener("submit", onSubmit);
      el.removeEventListener("parse-error", onParseError);
      el.removeEventListener("keypad-toggle", onToggle);
    };
  }, []);

  return createElement("math-input", {
    ref: elRef,
    id: props.id,
    // React 19 maps className to class for custom elements; React 18 needs `class`.
    class: props.className,
    style: props.style,
  });
});
