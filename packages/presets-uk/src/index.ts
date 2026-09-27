/**
 * @mathinput/presets-uk — keypads trimmed to the English GCSE and A-level
 * curricula, built only from the public keypad API of @mathinput/core
 * (topic tags and patches, spec §8.6).
 */
import { applyKeypadPatch, keypadPreset, type KeypadLayout, type KeypadPatch, type Subject } from "@mathinput/core";

export type UkLevel = "gcse-foundation" | "gcse-higher" | "a-level";

export const UK_LEVELS: readonly UkLevel[] = ["gcse-foundation", "gcse-higher", "a-level"];

/** Topics beyond GCSE: no logarithms, calculus or formal proof notation. */
const BEYOND_GCSE = ["logarithms", "exponentials", "infinity", "calculus", "series", "vector-notation", "reciprocal-trig", "proof"];

const REMOVED_TAGS: Record<UkLevel, string[]> = {
  "gcse-foundation": [...BEYOND_GCSE, "column-vectors"],
  "gcse-higher": BEYOND_GCSE,
  "a-level": [],
};

/** A patch that trims any subject's preset to a level. Combine it with your own `removeKeys` or `addKeys`. */
export function ukKeypadPatch(level: UkLevel): KeypadPatch {
  return { removeTags: [...REMOVED_TAGS[level]] };
}

/** The preset keypad for a subject, trimmed to a UK level. */
export function ukKeypad(subject: Subject, level: UkLevel): KeypadLayout {
  return applyKeypadPatch(keypadPreset(subject), ukKeypadPatch(level));
}
