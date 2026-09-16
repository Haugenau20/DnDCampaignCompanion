// src/shared/utils/searchPresentation.ts
import type { SearchResult, SearchResultType } from "core/types/search";

/** A run of results of one type, with the heading the palette renders above them. */
export interface SearchGroup {
  type: SearchResultType;
  /** Uppercase plural heading, e.g. "NPCS". */
  label: string;
  results: SearchResult[];
}

/** Uppercase plural headings, matching design reference 8a. */
const GROUP_LABELS: Record<SearchResultType, string> = {
  npc: "NPCS",
  story: "STORY",
  note: "NOTES",
  quest: "QUESTS",
  location: "LOCATIONS",
  rumors: "RUMORS",
};

/**
 * Group results by type for display.
 *
 * Groups are ordered by where their best result sits in `results`, and results
 * keep their incoming order within a group. `SearchService.processResults`
 * has already sorted globally by relevance, so a fixed type order here would
 * discard that ranking -- burying an exact title match under a weak fuzzy hit
 * of a type that happened to be listed first. Types with no results are
 * dropped, so no empty heading is ever rendered.
 */
export function groupResultsByType(results: SearchResult[]): SearchGroup[] {
  const groups = new Map<SearchResultType, SearchResult[]>();

  for (const result of results) {
    const existing = groups.get(result.type);
    if (existing) {
      existing.push(result);
    } else {
      groups.set(result.type, [result]);
    }
  }

  // Map preserves insertion order, which is first-appearance order.
  return Array.from(groups.entries()).map(([type, groupResults]) => ({
    type,
    label: GROUP_LABELS[type],
    results: groupResults,
  }));
}

/**
 * The grouped results as one flat list, in render order.
 *
 * The palette's arrow keys index into this, so that moving down goes where the
 * eye goes. Indexing the ungrouped array instead would make the highlight jump
 * around the panel.
 */
export function flattenGroups(groups: SearchGroup[]): SearchResult[] {
  return groups.flatMap((group) => group.results);
}

/** Escape a user-typed string for literal use inside a RegExp. */
const escapeForRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split `text` into alternating matched and unmatched segments so the caller
 * can wrap the matched ones in `<mark>`.
 *
 * Matching is case-insensitive and **literal**. Fuzzy subsequence hits still
 * rank and still appear in results, but are returned as a single unmatched
 * segment: highlighting `d…r…o…p` scattered across a sentence reads as
 * corruption rather than as a match.
 */
export function splitOnMatch(
  text: string,
  query: string
): Array<{ text: string; isMatch: boolean }> {
  if (!text) return [];

  const trimmed = query.trim();
  if (!trimmed) return [{ text, isMatch: false }];

  const pattern = new RegExp(escapeForRegExp(trimmed), "gi");
  const segments: Array<{ text: string; isMatch: boolean }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), isMatch: false });
    }
    segments.push({ text: match[0], isMatch: true });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMatch: false });
  }

  return segments.length > 0 ? segments : [{ text, isMatch: false }];
}
