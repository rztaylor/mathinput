/**
 * Stretchy glyphs drawn as SVG that fills its container, so brackets and
 * radical signs grow with their content without measuring (spec §10.5).
 */
import type { FenceChar } from "@mathinput/core";

const NS = "http://www.w3.org/2000/svg";

const FENCE_PATHS: Record<FenceChar, string> = {
  "(": "M8 1 C2 7 2 17 8 23",
  ")": "M2 1 C8 7 8 17 2 23",
  "[": "M8 1 H3 V23 H8",
  "]": "M2 1 H7 V23 H2",
  "{": "M8 1 C4 1 5 4 5 7 C5 10 5 12 2 12 C5 12 5 14 5 17 C5 20 4 23 8 23",
  "}": "M2 1 C6 1 5 4 5 7 C5 10 5 12 8 12 C5 12 5 14 5 17 C5 20 6 23 2 23",
  "|": "M5 1 V23",
};

function svg(d: string, viewBox: string): SVGSVGElement {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", viewBox);
  s.setAttribute("preserveAspectRatio", "none");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", d);
  p.setAttribute("vector-effect", "non-scaling-stroke");
  s.append(p);
  return s;
}

export function fenceGlyph(ch: FenceChar): SVGSVGElement {
  return svg(FENCE_PATHS[ch], "0 0 10 24");
}

export function radicalGlyph(): HTMLSpanElement {
  const wrap = document.createElement("span");
  wrap.className = "mi-radical__sign";
  wrap.append(svg("M1 14 L3.6 12.4 L6.6 23 L11.6 0.5", "0 0 12 24"));
  return wrap;
}
