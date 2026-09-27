import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { createRef, useState } from "react";
import { MathInput, type MathInputHandle } from "../src/index.js";
import type { MathDocument, MathInputValue } from "@mathinput/core";

afterEach(cleanup);

const typeInto = (el: Element, text: string) => {
  const r = el.querySelector("textarea") as HTMLTextAreaElement;
  for (const ch of text) r.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: ch, bubbles: true, cancelable: true }));
};

describe("<MathInput>", () => {
  it("renders the element with attributes", () => {
    const { container } = render(<MathInput subject="chemistry" label="Answer" className="my-field" keypad="always" submitOnEnter />);
    const el = container.querySelector("math-input") as HTMLElement;
    expect(el.getAttribute("subject")).toBe("chemistry");
    expect(el.getAttribute("keypad")).toBe("always");
    expect(el.hasAttribute("submit-on-enter")).toBe(true);
    expect(el.classList.contains("my-field")).toBe(true);
    expect(el.classList.contains("mi-root")).toBe(true);
  });

  it("calls onInput and onSubmit with the value", () => {
    const onInput = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(<MathInput submitOnEnter onInput={onInput} onSubmit={onSubmit} />);
    const el = container.querySelector("math-input") as HTMLElement;
    typeInto(el, "2x");
    expect((onInput.mock.calls.at(-1)?.[0] as MathInputValue).latex).toBe("2x");
    el.querySelector("textarea")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect((onSubmit.mock.calls[0]?.[0] as MathInputValue).text).toBe("2x");
  });

  it("loads defaultLatex once", () => {
    const { container, rerender } = render(<MathInput defaultLatex="\frac{1}{2}" />);
    const el = container.querySelector("math-input") as unknown as { latex: string };
    expect(el.latex).toBe("\\frac{1}{2}");
    rerender(<MathInput defaultLatex="x" />);
    expect(el.latex).toBe("\\frac{1}{2}");
  });

  it("works as a controlled component without resetting while typing", () => {
    let latest: MathDocument | undefined;
    function Host() {
      const [doc, setDoc] = useState<MathDocument>({ version: 1, subject: "maths", root: [] });
      latest = doc;
      return <MathInput value={doc} onInput={(v) => setDoc(v.doc)} />;
    }
    const { container } = render(<Host />);
    const el = container.querySelector("math-input") as HTMLElement & { editor: { caret: { index: number } } };
    act(() => typeInto(el, "123"));
    expect(latest?.root).toHaveLength(3);
    expect(el.editor.caret.index).toBe(3);
  });

  it("pushes a new controlled value into the element", () => {
    const a: MathDocument = { version: 1, subject: "maths", root: [{ t: "var", v: "a" }] };
    const b: MathDocument = { version: 1, subject: "maths", root: [{ t: "var", v: "b" }] };
    const { container, rerender } = render(<MathInput value={a} />);
    const el = container.querySelector("math-input") as unknown as { latex: string };
    expect(el.latex).toBe("a");
    rerender(<MathInput value={b} />);
    expect(el.latex).toBe("b");
  });

  it("exposes the element through a ref", () => {
    const ref = createRef<MathInputHandle>();
    render(<MathInput ref={ref} defaultLatex="x" />);
    act(() => ref.current?.clear());
    expect(ref.current?.latex).toBe("");
  });

  it("reports parse errors", () => {
    const onParseError = vi.fn();
    const ref = createRef<MathInputHandle>();
    render(<MathInput ref={ref} onParseError={onParseError} />);
    act(() => { if (ref.current) ref.current.latex = "\\nope"; });
    expect(onParseError).toHaveBeenCalledWith(expect.objectContaining({ source: "latex" }));
  });
});
