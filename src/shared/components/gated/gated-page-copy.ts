// src/shared/components/gated/gated-page-copy.ts

/**
 * Which selection a page needs before it can show anything.
 *
 * `"group"` exists for a page whose content is genuinely visible with only a
 * group chosen. No current page qualifies: `notes` was believed to be that
 * page (see the note on `GATED_COPY.notes` below) until `NoteContext` was
 * read closely and turned out to discard everything without a campaign, so
 * every page here is `"campaign"` today. The value is kept, with its branch
 * in `usePageGate` still covered by tests, for the day a page's data
 * genuinely only needs a group -- e.g. a group-wide notes view.
 */
export type GatedContextRequirement = "group" | "campaign";

/**
 * Everything the gated panel says about one page.
 *
 * This interface exists so that adding a page is a data change, not a new
 * branch: the panel component reads these fields and never names a page.
 */
export interface GatedPageCopy {
  /** Heading shown to a signed-out visitor on a read route. */
  heading: string;
  /** Heading shown on a create/edit route. Falls back to `heading`. */
  writeHeading?: string;
  /** One paragraph on what this page is for, in the product's voice. */
  blurb: string;
  /** Plural noun for the error line: "Couldn't load quests." */
  noun: string;
  /** Which selection this page needs. */
  requires: GatedContextRequirement;
}

/** Every page that has a gated state. */
export type GatedPageKey =
  | "home"
  | "story"
  | "quests"
  | "npcs"
  | "locations"
  | "rumors"
  | "notes";

/**
 * The line for genuine newcomers, below the hairline on the signed-out panel.
 *
 * Shared rather than per-page: it answers "what is this site?", which is the
 * same question regardless of which URL a stranger happened to land on.
 */
export const GATED_FOOTNOTE =
  "New here? The Companion is a private campaign record for one group at a " +
  "time — a DM invites you with a join link.";

/**
 * The single source of gated wording in `src/`.
 *
 * Context files used to build these sentences themselves, which put five
 * phrasings of two ideas in five different layers — and, because a context
 * cannot tell a signed-out visitor from a member between campaigns, half of
 * them named a group switcher the visitor had no way to see. A context returns
 * a *state*; this module holds the words; the panel renders them.
 */
export const GATED_COPY: Record<GatedPageKey, GatedPageCopy> = {
  home: {
    heading: "Sign in to open your campaign",
    blurb:
      "The Companion keeps one campaign's chapters, quests, NPCs, locations, " +
      "rumors and private notes in one place. Each campaign is visible only " +
      "to the group that plays it.",
    noun: "your campaign",
    requires: "campaign",
  },
  story: {
    heading: "Sign in to read your campaign's story",
    writeHeading: "Sign in to write a chapter",
    blurb:
      "The chapter log is the campaign told in order — one entry a session, " +
      "written by whoever was at the table. Each campaign is visible only to " +
      "the group that plays it.",
    noun: "chapters",
    requires: "campaign",
  },
  quests: {
    heading: "Sign in to see your party's quests",
    writeHeading: "Sign in to add a quest",
    blurb:
      "Quests are the open threads of a campaign — who asked for what, which " +
      "objectives are done, and what the party still owes. Each campaign is " +
      "visible only to the group that plays it.",
    noun: "quests",
    requires: "campaign",
  },
  npcs: {
    heading: "Sign in to see who your party has met",
    writeHeading: "Sign in to add an NPC",
    blurb:
      "NPCs are everyone the party has dealt with: allies, patrons, rivals, " +
      "and the ones nobody trusts yet. Each campaign is visible only to the " +
      "group that plays it.",
    noun: "NPCs",
    requires: "campaign",
  },
  locations: {
    heading: "Sign in to see where your party has been",
    writeHeading: "Sign in to add a location",
    blurb:
      "Locations are the places the party has visited, heard of, or is still " +
      "trying to find, and what happened at each. Each campaign is visible " +
      "only to the group that plays it.",
    noun: "locations",
    requires: "campaign",
  },
  rumors: {
    heading: "Sign in to hear what the realm is saying",
    writeHeading: "Sign in to record a rumor",
    blurb:
      "Rumors are the leads a party picks up in taverns and on notice boards " +
      "— some true, some not, all worth writing down. Each campaign is " +
      "visible only to the group that plays it.",
    noun: "rumors",
    requires: "campaign",
  },
  notes: {
    heading: "Sign in to read your notes",
    writeHeading: "Sign in to write a note",
    blurb:
      "Notes are yours alone; nobody else in the group can read them, not " +
      "even the DM. NPCs you mention can be lifted out into the shared " +
      "record when you're ready.",
    noun: "notes",
    // Was "group": the spec assumed a member with a group but no campaign
    // chosen has notes to read, because `NoteContext` "fetches on
    // `activeGroupId` alone and applies `activeCampaignId` as a filter
    // afterwards". That premise is false -- `NoteContext.tsx` sets
    // `filteredNotes = []` whenever there is no `activeCampaignId` ("If no
    // active campaign, show no notes"), so that member has nothing to read.
    // Gating on `pick-campaign` earlier is honest about that; without it, the
    // member instead hit NotesList's "No Campaign Selected" dead end or, on
    // NotePage, a "doesn't exist or you don't have access to it" message that
    // was simply untrue. `"group"` stays a valid value (see
    // `GatedContextRequirement`) for the day a group-wide notes view exists.
    requires: "campaign",
  },
};

/**
 * Pick the heading for a page in the mode the route is in.
 *
 * A create route asking someone to "sign in to see your party's quests" names
 * the wrong thing; `writeHeading` names the action they were actually trying to
 * take. Pages with no write route omit it and fall back.
 *
 * @param copy The page's copy entry
 * @param mode Whether the route reads or writes
 * @returns The heading to render
 */
export function gatedHeading(
  copy: GatedPageCopy,
  mode: "read" | "write"
): string {
  return mode === "write" && copy.writeHeading
    ? copy.writeHeading
    : copy.heading;
}
