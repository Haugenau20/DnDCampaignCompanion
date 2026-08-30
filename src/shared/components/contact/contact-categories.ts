// src/shared/components/contact/contact-categories.ts

/**
 * The fixed set of things a person can contact us about.
 *
 * This used to be a free-text subject line that the app deep-linked a magic
 * string into and then recovered with `subject.includes("Limit Increase")`.
 * It was always a category; it is now typed as one.
 *
 * The ids and subject labels here are mirrored in
 * `firebase/functions/src/contact.ts`, which cannot import from `src/`
 * because it is a separate npm package. See the design doc, section 4.
 */
export type ContactCategoryId =
  | "broken"
  | "feature"
  | "smart-detection"
  | "account"
  | "other";

/**
 * One contact category.
 */
export interface ContactCategory {
  /** Stable id, sent to the cloud function as the `category` field */
  id: ContactCategoryId;
  /** Text on the selectable pill */
  chipLabel: string;
  /** What the composed email subject calls this category */
  subjectLabel: string;
  /** Helper copy shown under the message field, or null if none applies */
  guidance: string | null;
  /** Label for the optional second field, or null if this category has none */
  extraFieldLabel: string | null;
}

/**
 * The categories, in the order their chips are rendered.
 */
export const CONTACT_CATEGORIES: readonly ContactCategory[] = [
  {
    id: "broken",
    chipLabel: "Something is broken",
    subjectLabel: "Bug report",
    guidance:
      "For a bug, three things help most: what you clicked, what happened, and what you expected instead.",
    extraFieldLabel: null,
  },
  {
    id: "feature",
    chipLabel: "Feature idea",
    subjectLabel: "Feature request",
    guidance:
      "Describe the feature and how it would improve your experience — what you're trying to do matters more than how you'd build it.",
    extraFieldLabel: null,
  },
  {
    id: "smart-detection",
    chipLabel: "More smart detection",
    subjectLabel: "Smart detection limit increase",
    guidance:
      "Tell us roughly how much you scan and what for. That's what we weigh when raising a limit.",
    extraFieldLabel: "Why do you need more?",
  },
  {
    id: "account",
    chipLabel: "Account or group",
    subjectLabel: "Account or group",
    guidance: null,
    extraFieldLabel: null,
  },
  {
    id: "other",
    chipLabel: "Something else",
    subjectLabel: "General enquiry",
    guidance: null,
    extraFieldLabel: null,
  },
];

/**
 * Look up a category by id.
 *
 * Throws rather than returning undefined: every caller in the app holds an
 * id that came out of this module, so a miss is a programming error and
 * should be loud, not a silently unrendered chip.
 *
 * @param id - The category id to look up
 * @returns The matching category
 */
export const getContactCategory = (id: ContactCategoryId): ContactCategory => {
  const found = CONTACT_CATEGORIES.find((category) => category.id === id);
  if (!found) {
    throw new Error(`Unknown contact category: ${id}`);
  }
  return found;
};

/**
 * Map a legacy `?subject=` deep link onto a category.
 *
 * `EntityExtractionService` links to
 * `/contact?subject=Smart Detection Limit Increase Request`, and older links
 * in the wild may carry variants. Those keep working; anything unrecognised
 * returns null, and the caller passes the string through as free text rather
 * than mislabelling it as a category it is not.
 *
 * @param subject - The raw `subject` query parameter
 * @returns The category id, or null when the subject maps to none
 */
export const categoryFromLegacySubject = (
  subject: string
): ContactCategoryId | null => {
  if (subject.includes("Limit Increase")) {
    return "smart-detection";
  }
  return null;
};
