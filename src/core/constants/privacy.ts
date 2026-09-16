// src/core/constants/privacy.ts

/**
 * Every fact the privacy page states, with exactly one definition each.
 *
 * This file exists because the page used to render
 * `new Date().toLocaleDateString(...)` for "Last updated", so it claimed a
 * revision every day it was viewed -- quietly defeating the page's own promise
 * to record when the text changed. A policy's date is the one fact it exists to
 * carry, so it is a constant, bumped by hand.
 *
 * The same reasoning applies to the rest: a claim about retention or about what
 * leaves the product should be stated once, be greppable, and be assertable in a
 * test. See docs/superpowers/specs/2026-09-03-privacy-policy-design.md for the
 * code references behind each value.
 */

/**
 * ISO date of the last substantive change to the policy text.
 *
 * BUMP THIS BY HAND whenever the wording changes, and add a PRIVACY_CHANGELOG
 * line saying what changed. Never derive it from Date.now().
 */
export const PRIVACY_LAST_UPDATED = "2026-09-03";

/** What changed in the revision named by PRIVACY_LAST_UPDATED, newest first. */
export const PRIVACY_CHANGELOG: readonly string[] = [
  "Added a section on entity extraction: what leaves the app when you scan a note, who receives it, and for how long they keep it.",
  "Replaced the request-by-email deletion text with the self-service Delete account button, and said what survives it.",
  "Named the data controller, the hosting region, the legal basis for each purpose, and your right to complain to Datatilsynet.",
];

/**
 * Who is responsible for the data, and how to reach them.
 *
 * Contact is the existing contact form rather than an address: the form routes
 * to a hidden mailbox in a Cloud Function, so it demonstrably reaches the
 * controller without publishing a personal email on a public page.
 */
export const PRIVACY_CONTROLLER = {
  name: "Søren Haug",
  country: "Denmark",
  contactPath: "/contact",
} as const;

/** Google Cloud region holding Firestore, Authentication and the Cloud Functions. */
export const PRIVACY_HOSTING_REGION = "europe-west1 (Belgium)";

/**
 * Whether OpenAI's data processing addendum has been accepted for this
 * organisation. Flip to true only once it actually has been -- it turns on a
 * sentence naming the DPA as the safeguard for the US transfer.
 */
export const OPENAI_DPA_ACCEPTED = false;

/**
 * The entity-extraction disclosure, in one place, because the same facts are
 * stated twice: here on the privacy page and beside the Scan note button.
 */
export const EXTRACTION_FACTS = {
  provider: "OpenAI",
  product: "the OpenAI platform API",
  caps: "10 scans a day, 30 a week and 100 a month",
  retention:
    "kept by OpenAI for up to 30 days for abuse monitoring and then deleted",
  transfer: "processed in the United States",
} as const;

/** One row of the at-a-glance table. */
export interface PrivacyTableRow {
  /** Stable key, also used as the test hook. */
  id: string;
  /** What we keep. */
  what: string;
  /** Why we keep it. */
  why: string;
  /** Where it goes. */
  where: string;
  /** How long it stays. */
  howLong: string;
  /**
   * Draws the reader's eye to the row that matters most -- the one where text
   * leaves the product. Rendered with the `card-subtle` token, never a colour.
   */
  highlighted?: boolean;
}

/**
 * The summary table. Every row is traceable to code; see the spec's section 2.
 * Retention strings that describe a session deliberately omit the durations --
 * the page interpolates INACTIVITY_TIMEOUT_TEXT and REMEMBER_ME_TEXT from
 * core/constants/time so there is only ever one definition of those numbers.
 */
export const PRIVACY_TABLE_ROWS: readonly PrivacyTableRow[] = [
  {
    id: "identifiers",
    what: "Email and username",
    why: "To sign you in and credit your work",
    where: "Firebase Authentication",
    howLong: "Until you delete the account",
  },
  {
    id: "session",
    what: "Session state",
    why: "To keep you signed in, and to time you out when idle",
    where: "Your browser and Firestore",
    howLong: "SESSION_DURATIONS",
  },
  {
    id: "campaign-content",
    what: "Campaign content",
    why: "Chapters, quests, NPCs, locations and rumors — the app itself",
    where: "Firestore, visible to your group",
    howLong: "Stays with the group if you leave",
  },
  {
    id: "extraction",
    what: "Note text you scan for entities",
    why: "To suggest NPCs, places and quests from what you wrote",
    where: "Sent to OpenAI when you press Scan note",
    howLong: "Up to 30 days for abuse monitoring, then deleted",
    highlighted: true,
  },
  {
    id: "messages",
    what: "Messages you send us",
    why: "To answer you",
    where: "Email, via a Cloud Function",
    howLong: "Until your question is resolved",
  },
];

/** A linkable section of the full policy text. */
export interface PrivacySection {
  /** The element id, so /privacy#<id> works. */
  id: string;
  /** The label shown in the sticky anchor list. */
  label: string;
}

/**
 * The full text's sections, in render order. The anchor list is generated from
 * this, so a section can never exist without a link to it, or the reverse.
 */
export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  { id: "your-rights", label: "Your rights" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "groups-and-sharing", label: "Groups and sharing" },
  { id: "entity-extraction", label: "Entity extraction" },
  { id: "device-storage", label: "On your device" },
  { id: "security", label: "Security" },
  { id: "retention", label: "Retention and deletion" },
  { id: "legal-basis", label: "Legal basis" },
  { id: "changes", label: "Changes to this page" },
];
