import { describe, expect, it, vi } from "vitest";
import { Editor } from "../../src/editor/editor.js";
import { doc, fence, frac, sup, v } from "../../src/model/builders.js";
import { toLatex } from "../../src/serialize/latex.js";
import { at, dump, editor, type, typed } from "./helpers.js";

describe("typing", () => {
  it("inserts digits, letters and operators", () => {
    expect(dump(typed("2x+3=5"))).toBe("2x+3=5|");
  });

  it("maps keyboard operators", () => {
    expect(dump(typed("a*b-c"))).toBe("a*b-c|");
  });

  it.each([
    ["x<=3", "x≤3|"],
    ["x>=3", "x≥3|"],
    ["x!=3", "x≠3|"],
    ["x~=3", "x≈3|"],
    ["a->b", "a→b|"],
    ["a=>b", "a⇒b|"],
    ["a<=>b", "a⇔b|"],
    ["3:2", "3:2|"],
    ["5!", "5!|"],
    ["f'", "f'|"],
  ])("combines %s", (keys, out) => {
    expect(dump(typed(keys))).toBe(out);
  });

  it("uses equilibrium for <=> in chemistry", () => {
    expect(dump(typed("N<=>O", "chemistry"))).toBe("‹N›⇌‹O›|");
  });
});

describe("auto-replace", () => {
  it.each([
    ["sin", "sin|"],
    ["2cosx", "2cosx|"],
    ["arcsin", "arcsin|"],
    ["cosec", "cosec|"],
    ["theta", "θ|"],
    ["eta", "η|"],
    ["beta", "β|"],
    ["Delta", "Δ|"],
    ["pi", "π|"],
    ["infinity", "∞|"],
    ["inf", "∞|"],
    ["xory", "x or y|"],
    ["deg", "°|"],
  ])("%s", (keys, out) => {
    expect(dump(typed(keys))).toBe(out);
  });

  it("enters a square root template from sqrt", () => {
    expect(dump(typed("sqrt2"))).toBe("sqrt{2|}");
  });

  it("enters a cube root from cbrt", () => {
    expect(dump(typed("cbrt8"))).toBe("root{3;8|}");
  });

  it("can be disabled", () => {
    expect(dump(typed("sin", "maths", { autoreplace: false }))).toBe("sin|");
    const e = typed("sin", "maths", { autoreplace: false });
    expect(e.document.root.map((n) => n.t)).toEqual(["var", "var", "var"]);
  });

  it("never applies in chemistry", () => {
    const e = typed("sin", "chemistry");
    expect(e.document.root.some((n) => n.t === "fn")).toBe(false);
  });

  it("stops growing a word after the caret moves", () => {
    const e = typed("cos");
    type(e, "←→ec");
    expect(e.document.root.map((n) => n.t)).toEqual(["fn", "var", "var"]);
  });
});

describe("chemistry rules", () => {
  it("subscripts digits after elements", () => {
    expect(dump(typed("H2O", "chemistry"))).toBe("‹H›_{2}‹O›|");
  });

  it("merges two-letter elements", () => {
    expect(dump(typed("NaCl", "chemistry"))).toBe("‹Na›‹Cl›|");
  });

  it("keeps coefficients full size", () => {
    expect(dump(typed("2H2+O2->2H2O", "chemistry"))).toBe("2‹H›_{2}+‹O›_{2}→2‹H›_{2}‹O›|");
  });

  it("extends a multi-digit subscript", () => {
    expect(dump(typed("C12H22O11", "chemistry"))).toBe("‹C›_{12}‹H›_{22}‹O›_{11}|");
  });

  it("subscripts after a closing bracket", () => {
    expect(dump(typed("Ca(OH)2", "chemistry"))).toBe("‹Ca›(‹O›‹H›)_{2}|");
  });

  it("treats a space as the end of a formula", () => {
    expect(dump(typed("CuSO4 5", "chemistry"))).toBe("‹Cu›‹S›‹O›_{4}5|");
  });

  it("writes an electron with a charge", () => {
    expect(dump(typed("2e^-", "chemistry"))).toBe("2‹e›^{-|}");
  });

  it("writes a charge with ^", () => {
    expect(dump(typed("Fe^3+", "chemistry"))).toBe("‹Fe›^{3+|}");
  });

  it("serialises a typed equation to mhchem", () => {
    const e = typed("Mg+2HCl->MgCl2+H2", "chemistry");
    expect(toLatex(e.getDocument())).toBe("\\ce{Mg + 2HCl -> MgCl2 + H2}");
  });
});

describe("templates and absorption (spec §7.3)", () => {
  it("absorbs the preceding number into a fraction", () => {
    expect(dump(typed("3/"))).toBe("frac{3;|}");
  });

  it("absorbs a term", () => {
    expect(dump(typed("2x/"))).toBe("frac{2x;|}");
  });

  it("stops at an operator", () => {
    expect(dump(typed("2+3/"))).toBe("2+frac{3;|}");
  });

  it("absorbs a bracket with its power", () => {
    expect(dump(typed("(x+1)^2→/"))).toBe("frac{(x+1)^{2};|}");
  });

  it("starts an empty fraction at an operator", () => {
    expect(dump(typed("2+/"))).toBe("2+frac{|;}");
  });

  it("fills the fraction and moves out", () => {
    expect(dump(typed("1/2→+x"))).toBe("frac{1;2}+x|");
  });

  it("wraps a selection in a template", () => {
    const e = typed("x+1");
    e.selectAll();
    e.insertTemplate(frac([], []));
    expect(dump(e)).toBe("frac{x+1;|}");
  });

  it("uses a selection as the base of a power, in brackets", () => {
    const e = typed("x+1");
    e.selectAll();
    e.insertTemplate(sup([]));
    expect(dump(e)).toBe("(x+1)^{|}");
  });

  it("puts the caret after a template with no empty slots", () => {
    const e = typed("x");
    e.insertTemplate(sup("2"));
    expect(dump(e)).toBe("x^{2}|");
  });

  it("puts the caret after d/dx", () => {
    const e = editor();
    e.insert({ t: "deriv", num: [], den: [v("x")] });
    expect(dump(e)).toBe("d{;x}|");
  });

  it("enters the lower limit of a fresh integral", () => {
    const e = editor();
    e.insert({ t: "bigop", op: "int", lower: [], upper: [], body: [] });
    expect(dump(e)).toBe("int{|;;}");
  });
});

describe("movement", () => {
  it("steps through a fraction", () => {
    const e = typed("1/2→");
    const seen: string[] = [];
    for (let k = 0; k < 5; k++) { e.moveLeft(); seen.push(dump(e)); }
    expect(seen).toEqual(["frac{1;2|}", "frac{1;|2}", "frac{1|;2}", "frac{|1;2}", "|frac{1;2}"]);
    expect(e.moveLeft()).toBe(false);
  });

  it("moves right out of the last slot", () => {
    const e = typed("1/2");
    e.moveRight();
    expect(dump(e)).toBe("frac{1;2}|");
  });

  it("moves up and down in a fraction", () => {
    const e = typed("12/3");
    e.moveUp();
    expect(dump(e)).toBe("frac{1|2;3}");
    e.moveDown();
    expect(dump(e)).toBe("frac{12;3|}");
  });

  it("enters a fraction from beside it with up/down", () => {
    const e = typed("1/2→");
    type(e, "←");
    e.moveHome();
    e.moveDown();
    expect(dump(e)).toBe("frac{1;|2}");
  });

  it("moves home and end within the row", () => {
    const e = typed("abc");
    e.moveHome();
    expect(dump(e)).toBe("|abc");
    e.moveEnd();
    expect(dump(e)).toBe("abc|");
  });

  it("tabs through empty slots and wraps", () => {
    const e = editor();
    e.insert(frac([], []));
    e.moveRight(); // into den
    e.moveRight(); // out
    e.type("+");
    e.insert(frac([], []));
    expect(dump(e)).toBe("frac{;}+frac{|;}");
    expect(e.moveToNextPlaceholder()).toBe(true);
    expect(dump(e)).toBe("frac{;}+frac{;|}");
    e.moveToNextPlaceholder();
    expect(dump(e)).toBe("frac{|;}+frac{;}");
    e.moveToPreviousPlaceholder();
    expect(dump(e)).toBe("frac{;}+frac{;|}");
  });

  it("reports no placeholders", () => {
    expect(typed("12").moveToNextPlaceholder()).toBe(false);
  });

  it("exits the innermost template", () => {
    const e = typed("sqrt2");
    e.exitTemplate();
    expect(dump(e)).toBe("sqrt{2}|");
  });
});

describe("deletion", () => {
  it("deletes atoms", () => {
    expect(dump(typed("123⌫"))).toBe("12|");
  });

  it("enters a template with content instead of deleting it", () => {
    expect(dump(typed("1/2→⌫"))).toBe("frac{1;2|}");
  });

  it("removes an empty template", () => {
    expect(dump(typed("x^⌫"))).toBe("x|");
  });

  it("unwraps a template at the start of a slot", () => {
    expect(dump(typed("1/2←⌫"))).toBe("1|2");
  });

  it("unwraps a power keeping its content", () => {
    expect(dump(typed("x^2←⌫"))).toBe("x|2");
  });

  it("deletes forward", () => {
    const e = typed("abc⇤⌦");
    expect(dump(e)).toBe("|bc");
  });

  it("does nothing at the start of the document", () => {
    expect(typed("").deleteBackward()).toBe(false);
  });

  it("deletes a selection", () => {
    const e = typed("abcd");
    e.extendLeft();
    e.extendLeft();
    expect(dump(e)).toBe("ab«cd»");
    e.deleteBackward();
    expect(dump(e)).toBe("ab|");
  });
});

describe("single brackets (spec §7.4 examples)", () => {
  it("brackets existing work with a ghost close, then closes it", () => {
    const e = typed("2x+3⇤(");
    expect(dump(e)).toBe("(|2x+3.");
    e.moveEnd();
    e.type(")");
    expect(dump(e)).toBe("(2x+3)|");
    e.insert(sup("2"));
    expect(dump(e)).toBe("(2x+3)^{2}|");
  });

  it("brackets the middle of an expression", () => {
    const e = typed("5x-1←←←(");
    expect(dump(e)).toBe("5(|x-1.");
    e.moveEnd();
    e.type(")");
    expect(dump(e)).toBe("5(x-1)|");
  });

  it("closes first, then opens", () => {
    const e = typed("x-1)");
    expect(dump(e)).toBe(".x-1)|");
    e.moveLeft();
    e.moveHome();
    e.type("(");
    expect(dump(e)).toBe("(|x-1)");
  });

  it("opens at a later point inside a ghost-opened fence", () => {
    const e = typed("2+x-1)");
    // .2+x-1)  → open before x
    e.moveLeft();
    e.moveHome();
    e.moveRight();
    e.moveRight();
    e.type("(");
    expect(dump(e)).toBe("2+(|x-1)");
  });

  it("types a pair in one go", () => {
    expect(dump(typed("(x+1)+2"))).toBe("(x+1)+2|");
  });

  it("wraps a selection", () => {
    const e = typed("a+b");
    e.selectAll();
    e.type("(");
    expect(dump(e)).toBe("(a+b)|");
  });

  it("gives (▢) with a ghost close in an empty row", () => {
    expect(dump(typed("("))).toBe("(|.");
  });

  it("closes with a different bracket for intervals", () => {
    expect(dump(typed("[0,1)"))).toBe("[0,1)|");
  });

  it("keeps the caret out of the position after a ghost close", () => {
    const e = typed("(x");
    e.moveRight();
    expect(dump(e)).toBe("(x|.");
  });

  it("turns a deleted solid close into a ghost", () => {
    const e = typed("(x)+1");
    e.moveLeft();
    e.moveLeft();
    e.deleteBackward();
    expect(dump(e)).toBe("(x|+1.");
  });

  it("removes the fence when the other side is a ghost", () => {
    const e = typed("(x)+1");
    type(e, "←←⌫");
    expect(dump(e)).toBe("(x|+1.");
    type(e, "←⌫");
    expect(dump(e)).toBe("|x+1");
  });

  it("turns a deleted solid open into a ghost", () => {
    const e = typed("2+(x)");
    e.moveLeft();
    e.moveLeft();
    e.deleteBackward();
    expect(dump(e)).toBe(".2+|x)");
  });

  it("types modulus as a pair", () => {
    expect(dump(typed("|x"))).toBe("|x||");
    const e = typed("|x");
    expect(e.document.root[0]).toMatchObject({ t: "fence", open: "|", close: "|" });
  });

  it("reports unbalanced brackets in the value", () => {
    const e = typed("(x");
    expect(toLatex(e.getDocument())).toBe("(x)");
  });
});

describe("selection", () => {
  it("extends within a row and lifts to whole templates", () => {
    const e = typed("1+2/3");
    e.extendLeft();
    expect(dump(e)).toBe("1+frac{2;«3»}");
    e.extendLeft();
    expect(dump(e)).toBe("1+«frac{2;3}»");
    e.extendLeft();
    expect(dump(e)).toBe("1«+frac{2;3}»");
  });

  it("collapses to the edge on plain arrows", () => {
    const e = typed("abc");
    e.extendLeft();
    e.extendLeft();
    e.moveLeft();
    expect(dump(e)).toBe("a|bc");
  });

  it("replaces the selection when typing", () => {
    const e = typed("abc");
    e.selectAll();
    e.type("x");
    expect(dump(e)).toBe("x|");
  });
});

describe("history", () => {
  it("undoes a typing run as one step", () => {
    const e = typed("123");
    e.undo();
    expect(dump(e)).toBe("|");
  });

  it("undoes templates separately from typing", () => {
    const e = typed("12/3");
    e.undo();
    expect(dump(e)).toBe("frac{12;|}");
    e.undo();
    expect(dump(e)).toBe("12|");
    e.redo();
    expect(dump(e)).toBe("frac{12;|}");
  });

  it("breaks typing runs when the caret moves", () => {
    const e = typed("12←3");
    e.undo();
    expect(dump(e)).toBe("1|2");
  });

  it("clears and undoes clear", () => {
    const e = typed("x+1");
    e.clear();
    expect(dump(e)).toBe("|");
    e.undo();
    expect(dump(e)).toBe("x+1|");
  });

  it("resets on setDocument", () => {
    const e = typed("x");
    e.setDocument(doc("maths", "y"));
    expect(e.canUndo()).toBe(false);
    expect(dump(e)).toBe("y|");
  });
});

describe("events and API", () => {
  it("notifies on document changes and caret moves", () => {
    const e = editor();
    const fn = vi.fn();
    e.onChange(fn);
    e.type("1");
    e.moveLeft();
    expect(fn.mock.calls.map((c) => c[0].docChanged)).toEqual([true, false]);
  });

  it("does not notify for no-op moves", () => {
    const e = editor();
    const fn = vi.fn();
    e.onChange(fn);
    e.moveLeft();
    expect(fn).not.toHaveBeenCalled();
  });

  it("places the caret with setCaret and ignores invalid positions", () => {
    const e = typed("1/2→");
    e.setCaret(at(1, [0, 1]));
    expect(dump(e)).toBe("frac{1;2|}");
    e.setCaret(at(5, [0, 1]));
    expect(dump(e)).toBe("frac{1;2|}");
  });

  it("does not let callers mutate its document through getDocument", () => {
    const e = typed("1");
    e.getDocument().root.push(v("x"));
    expect(dump(e)).toBe("1|");
  });

  it("executes commands by name", () => {
    const e = typed("ab");
    e.execute("moveHome");
    expect(dump(e)).toBe("|ab");
  });

  it("constructs from an existing document with the caret at the end", () => {
    const e = new Editor(doc("maths", fence("x")));
    expect(dump(e)).toBe("(x)|");
  });
});

describe("regressions found by fuzzing", () => {
  it("drops a collapsed selection anchor when an edit moves the caret elsewhere", () => {
    const e = editor();
    e.extendLeft();
    e.openBracket("(");
    expect(e.anchor).toBeNull();
  });

  it("makes a ghost side real when its fence is moved away from the row edge", () => {
    const e = typed("(");
    e.extendLeft(); // selects the whole fence
    e.insertTemplate(sup([]));
    expect(dump(e)).toBe("()^{|}");
  });

  it("keeps a ghost close that is still at its row's end after unwrapping", () => {
    const e = typed("1/(x");
    // caret in fence body inside the denominator; go to the numerator start and unwrap
    e.moveUp();
    e.moveHome();
    e.deleteBackward();
    expect(dump(e)).toBe("|1(x.");
  });
});
