/** Small inline SVG icons for keypad keys. */
const NS = "http://www.w3.org/2000/svg";

const PATHS: Record<string, string[]> = {
  left: ["M15 6l-6 6 6 6"],
  right: ["M9 6l6 6-6 6"],
  backspace: ["M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z", "M17 9l-5 6", "M12 9l5 6"],
  enter: ["M20 5v7a3 3 0 0 1-3 3H5", "M9 11l-4 4 4 4"],
  shift: ["M12 4l8 8h-5v8H9v-8H4z"],
  keypad: ["M3 6h18v12H3z", "M7 10h.01", "M11 10h.01", "M15 10h.01", "M8 14h8"],
  table: ["M3 4h18v16H3z", "M3 10h18", "M9 4v16", "M15 4v16"],
};

export function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("mi-icon");
  for (const d of PATHS[name] ?? []) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}
