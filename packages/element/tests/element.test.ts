import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { MathInputValue } from "@mathinput/core";
import { MathInputElement, defineMathInput } from "../src/index.js";

beforeAll(() => defineMathInput());
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });

function mount(attrs: Record<string, string> = {}): MathInputElement {
  const el = document.createElement("math-input") as MathInputElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  return el;
}

const receiver = (el: MathInputElement) => el.querySelector("textarea") as HTMLTextAreaElement;

function typeText(el: MathInputElement, text: string): void {
  for (const ch of Array.from(text)) {
    receiver(el).dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: ch, bubbles: true, cancelable: true }));
  }
}

function key(el: MathInputElement, k: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const e = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init });
  receiver(el).dispatchEvent(e);
  return e;
}

describe("<math-input>", () => {
  it("builds its light DOM with the public classes", () => {
    const el = mount({ label: "Answer" });
    expect(el.classList.contains("mi-root")).toBe(true);
    expect(el.querySelector(".mi-field .mi-row--root")).not.toBeNull();
    expect(receiver(el).getAttribute("aria-label")).toBe("Answer");
    const live = el.querySelector(".mi-live") as HTMLElement;
    expect(receiver(el).getAttribute("aria-describedby")).toBe(live.id);
    expect(live.getAttribute("aria-live")).toBe("polite");
  });

  it("shows the placeholder when empty and unfocused", () => {
    const el = mount({ placeholder: "Your answer" });
    expect(el.querySelector(".mi-empty")?.textContent).toBe("Your answer");
  });

  it("builds an expression from typed text and emits input with the value", () => {
    const el = mount();
    const seen: MathInputValue[] = [];
    el.addEventListener("input", (e) => seen.push(e.detail));
    typeText(el, "x^2");
    key(el, "ArrowRight");
    typeText(el, "+1");
    expect(el.latex).toBe("x^{2}+1");
    expect(seen.at(-1)?.text).toBe("x^2 + 1");
    expect(seen.at(-1)?.spoken).toBe("x squared plus 1");
    expect(el.querySelector(".mi-sup")).not.toBeNull();
  });

  it("does not leak native input events from its receiver", () => {
    const el = mount();
    const events: Event[] = [];
    el.addEventListener("input", (e) => events.push(e));
    receiver(el).dispatchEvent(new Event("input", { bubbles: true }));
    expect(events.every((e) => e instanceof CustomEvent)).toBe(true);
  });

  it("handles editing keys", () => {
    const el = mount();
    typeText(el, "123");
    expect(key(el, "Backspace").defaultPrevented).toBe(true);
    expect(el.latex).toBe("12");
    key(el, "Home");
    key(el, "Delete");
    expect(el.latex).toBe("2");
    key(el, "z", { ctrlKey: true });
    expect(el.latex).toBe("12");
  });

  it("lets Tab leave when there are no empty boxes", () => {
    const el = mount();
    typeText(el, "1");
    expect(key(el, "Tab").defaultPrevented).toBe(false);
    typeText(el, "/");
    expect(key(el, "Tab").defaultPrevented).toBe(false); // only one empty box: the caret is in it
  });

  it("submits on Enter only when submit-on-enter is set, and never when empty", () => {
    const plain = mount();
    const onPlain = vi.fn();
    plain.addEventListener("submit", onPlain);
    typeText(plain, "1");
    key(plain, "Enter");
    expect(onPlain).not.toHaveBeenCalled();

    const el = mount({ "submit-on-enter": "" });
    const onSubmit = vi.fn();
    el.addEventListener("submit", onSubmit);
    key(el, "Enter");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(el.querySelector(".mi-field")?.classList.contains("mi-field--shake")).toBe(true);
    typeText(el, "7");
    key(el, "Enter");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect((onSubmit.mock.calls[0]?.[0] as CustomEvent<MathInputValue>).detail.latex).toBe("7");
  });

  it("loads initial LaTeX and reflects the current LaTeX", () => {
    const el = mount({ latex: "\\frac{1}{2}" });
    expect(el.latex).toBe("\\frac{1}{2}");
    expect(el.querySelector(".mi-frac")).not.toBeNull();
  });

  it("reports unparseable LaTeX and stays empty", () => {
    const el = document.createElement("math-input") as MathInputElement;
    const onError = vi.fn();
    el.addEventListener("parse-error", onError);
    el.setAttribute("latex", "\\foo");
    document.body.append(el);
    expect(el.latex).toBe("");
    expect((onError.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({ source: "latex", input: "\\foo" });
  });

  it("gets and sets the tree value", () => {
    const el = mount();
    el.value = { version: 1, subject: "chemistry", root: [{ t: "element", v: "H" }, { t: "sub", body: [{ t: "num", v: "2" }] }] };
    expect(el.getAttribute("subject")).toBe("chemistry");
    expect(el.latex).toBe("\\ce{H2}");
    expect(el.value.root).toHaveLength(2);
    expect(() => { el.value = { version: 2 } as never; }).toThrow();
  });

  it("applies subject rules", () => {
    const el = mount({ subject: "chemistry" });
    typeText(el, "H2O");
    expect(el.latex).toBe("\\ce{H2O}");
  });

  it("renders read-only without a caret and takes no input", () => {
    const el = mount({ readonly: "", latex: "x" });
    expect(receiver(el).tabIndex).toBe(-1);
    expect(el.querySelector(".mi-caret")).toBeNull();
    typeText(el, "1");
    expect(el.latex).toBe("x");
  });

  it("fires change on blur after edits", () => {
    const el = mount();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    receiver(el).focus();
    expect(el.hasAttribute("data-focused")).toBe(true);
    typeText(el, "5");
    receiver(el).blur();
    expect(el.hasAttribute("data-focused")).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("pastes LaTeX and reports unparseable paste", () => {
    const el = mount();
    const paste = (types: Record<string, string>) => {
      const e = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(e, "clipboardData", { value: { getData: (t: string) => types[t] ?? "" } });
      receiver(el).dispatchEvent(e);
    };
    paste({ "text/plain": "$\\sqrt{2}$" });
    expect(el.latex).toBe("\\sqrt{2}");
    const onError = vi.fn();
    el.addEventListener("parse-error", onError);
    paste({ "text/plain": "x # y" });
    expect(onError).toHaveBeenCalled();
  });

  it("copies the selection in three flavours", () => {
    const el = mount({ latex: "x+1" });
    el.selectAll();
    const data: Record<string, string> = {};
    const e = new Event("copy", { bubbles: true, cancelable: true });
    Object.defineProperty(e, "clipboardData", { value: { setData: (t: string, v: string) => { data[t] = v; } } });
    receiver(el).dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(data["text/x-latex"]).toBe("x+1");
    expect(data["text/plain"]).toBe("x + 1");
    expect(JSON.parse(data["application/x-mathinput+json"] as string).root).toHaveLength(3);
  });

  it("updates the live region with the spoken form after a short delay", () => {
    vi.useFakeTimers();
    const el = mount();
    typeText(el, "2");
    vi.advanceTimersByTime(350);
    expect(el.querySelector(".mi-live")?.textContent).toBe("2");
  });

  it("exposes theme and font attributes as styles", () => {
    const el = mount({ theme: "dark", "math-font": "Latin Modern Math" });
    expect(el.dataset.miTheme).toBe("dark");
    expect(el.style.getPropertyValue("--mi-font-math")).toBe("Latin Modern Math");
  });
});
