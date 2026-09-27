/** Shared parser pieces. */
import type { Row } from "../model/types.js";
import { slotsOf } from "../model/slots.js";

export class ParseError extends Error {
  constructor(message: string, readonly position: number, readonly token?: string) {
    super(token === undefined ? `${message} at ${position}` : `${message} at ${position}: ${token}`);
    this.name = "ParseError";
  }
}

/**
 * Final clean-up of a parsed row: a ghost bracket side that is not at its
 * row's edge becomes real (spec §7.4 edge rule).
 */
export function finishRow(row: Row): Row {
  row.forEach((n, i) => {
    if (n.t === "fence") {
      if (n.closeGhost && i !== row.length - 1) delete n.closeGhost;
      if (n.openGhost && i !== 0) delete n.openGhost;
    }
    slotsOf(n).forEach(finishRow);
  });
  return row;
}
