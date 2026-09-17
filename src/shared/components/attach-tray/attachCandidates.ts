// src/shared/components/attach-tray/attachCandidates.ts

/** The entity collections the tray can offer. */
export type AttachKind = "npc" | "location" | "quest" | "rumor";

/**
 * The group headings, matching the ones the NPC page's relationship card
 * already displays. A tray spanning one kind shows no heading at all.
 */
export const ATTACH_KIND_LABELS: Record<AttachKind, string> = {
  npc: "People",
  location: "Places",
  quest: "Quests",
  rumor: "Rumours",
};

/** Display order when a tray spans kinds. */
const KIND_ORDER: AttachKind[] = ["npc", "location", "quest", "rumor"];

export interface AttachCandidate {
  id: string;
  kind: AttachKind;
  /** The entity's own name -- the campaign's voice, so it takes the serif. */
  name: string;
  /**
   * The one line that tells two entries apart: an NPC's occupation and
   * location, a location's type and parent, a quest's status. Empty when the
   * record genuinely carries nothing, rather than filled with a guess.
   */
  line: string;
  /** Already attached to the thing the tray is filling. */
  attached: boolean;
  /** Sort key: when this record was last touched. */
  touchedAt: number;
}

/** The collections, straight from the providers that already own them. */
export type AttachSources = Partial<Record<AttachKind, readonly any[]>>;

export interface BuildCandidatesOptions {
  attachedIds?: readonly string[];
  /**
   * Ids the tray must never offer -- the record being edited, and for a
   * location's parent every descendant of it. An invalid choice must be
   * unofferable rather than quietly discarded.
   */
  excludeIds?: readonly string[];
}

/** Human-readable location type, e.g. `poi` -> "Poi", `city` -> "City". */
const titleCase = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

/**
 * Rumour status in the product's own words.
 *
 * `false` is the stored value; "Disproved" is what it is called everywhere a
 * reader sees it, because it describes what the party did rather than a data
 * value (§10).
 */
const rumorStatusLabel = (status: string): string =>
  status === "false" ? "Disproved" : titleCase(status);

/** Join the parts of a disambiguating line, dropping the empty ones. */
const line = (...parts: Array<string | undefined | null>): string =>
  parts.filter((part) => Boolean(part && String(part).trim())).join(" · ");

/**
 * When the record was last touched, as a sortable number.
 *
 * `dateModified` wins over `dateAdded`: editing a record is the touch that
 * makes it likely to be what this session is about. A record carrying neither,
 * or an unparseable value, sorts last rather than disappearing.
 */
const touchedAt = (record: any): number => {
  const raw = record?.dateModified || record?.dateAdded;
  const value = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(value) ? 0 : value;
};

/**
 * Turn the collections into one browsable, ordered list.
 *
 * Every input comes from a provider that already owns it -- T023 records that
 * each entity collection has several independent owners already, so the tray
 * adds none.
 */
export function buildCandidates(
  kinds: readonly AttachKind[],
  sources: AttachSources,
  options: BuildCandidatesOptions = {}
): AttachCandidate[] {
  const attached = new Set(options.attachedIds ?? []);
  const excluded = new Set(options.excludeIds ?? []);

  // Locations are needed by name to resolve an NPC's or a location's own
  // reference, whether or not the tray is offering locations.
  const locationNames = new Map<string, string>(
    (sources.location ?? []).map((l: any) => [l.id, l.name])
  );

  /**
   * Where an NPC is, as a name.
   *
   * `locationId` wins when it resolves. `location` is free text a player may
   * legitimately have written ("somewhere in Mirkwood") -- but the contract
   * documented on `NPC.location` records that documents predating `locationId`
   * may hold **an id** in that field, so it is resolved against the same map
   * before being shown. An id that resolves to nothing contributes nothing
   * rather than being printed raw.
   */
  const resolvePlace = (record: any): string | undefined => {
    if (record.locationId) return locationNames.get(record.locationId);
    const free = record.location;
    if (!free) return undefined;
    // Resolve it as an id first; if nothing answers, it is the free text a
    // player wrote and is shown as written.
    return locationNames.get(free) ?? free;
  };

  const describe = (kind: AttachKind, record: any): { name: string; lineText: string } => {
    switch (kind) {
      case "npc":
        return {
          name: record.name,
          lineText: line(record.occupation, resolvePlace(record)),
        };
      case "location":
        return {
          name: record.name,
          lineText: line(
            titleCase(record.type),
            record.parentId && locationNames.has(record.parentId)
              ? `in ${locationNames.get(record.parentId)}`
              : undefined
          ),
        };
      case "quest":
        return { name: record.title, lineText: titleCase(record.status) };
      case "rumor":
        return { name: record.title, lineText: rumorStatusLabel(record.status) };
    }
  };

  const candidates: AttachCandidate[] = [];
  kinds.forEach((kind) => {
    (sources[kind] ?? []).forEach((record: any) => {
      if (!record?.id || excluded.has(record.id)) return;
      const { name, lineText } = describe(kind, record);
      candidates.push({
        id: record.id,
        kind,
        name,
        line: lineText,
        attached: attached.has(record.id),
        touchedAt: touchedAt(record),
      });
    });
  });

  // Recently touched first (§5). Deliberately not alphabetical: mid-session you
  // attach the NPC the session has been about, not the one whose name sorts
  // early.
  return candidates.sort((a, b) => b.touchedAt - a.touchedAt);
}

/**
 * Narrow the list by what has been typed.
 *
 * An accelerator over a list that is already usable without it, never a
 * precondition for attaching anything. Matches only what the entry actually
 * shows -- its name and its line -- so nothing can be found by an id a reader
 * never sees.
 */
export function filterCandidates(
  candidates: readonly AttachCandidate[],
  query: string
): AttachCandidate[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...candidates];
  return candidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(needle) ||
      candidate.line.toLowerCase().includes(needle)
  );
}

export interface AttachGroup {
  kind: AttachKind;
  label: string;
  candidates: AttachCandidate[];
}

/**
 * Split into the display groups, in a fixed order, dropping empty ones.
 *
 * A caller with a single-kind tray ignores the labels and renders one list;
 * only a tray that spans kinds needs the headings.
 */
export function groupCandidates(candidates: readonly AttachCandidate[]): AttachGroup[] {
  return KIND_ORDER.map((kind) => ({
    kind,
    label: ATTACH_KIND_LABELS[kind],
    candidates: candidates.filter((candidate) => candidate.kind === kind),
  })).filter((group) => group.candidates.length > 0);
}

/**
 * The escape hatch's copy, per kind.
 *
 * §5: the tray "ends with an escape hatch -- 'no such person yet — add one'"
 * which opens quick add with the relation pre-wired. Phrased per kind because
 * "no such person" is wrong for a place.
 */
export const ATTACH_KIND_NEW_LABELS: Record<AttachKind, string> = {
  npc: "No such person yet — add one",
  location: "No such place yet — add one",
  quest: "No such quest yet — add one",
  rumor: "No such rumour yet — add one",
};

/** What an empty collection says, per kind. Designed, never a blank box (§8). */
export const ATTACH_KIND_EMPTY_LABELS: Record<AttachKind, string> = {
  npc: "Nobody in the campaign yet.",
  location: "Nowhere in the campaign yet.",
  quest: "No quests in the campaign yet.",
  rumor: "Nothing heard in the campaign yet.",
};
