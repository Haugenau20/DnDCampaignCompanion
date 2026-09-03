/**
 * One cell of the example campaign's stat strip.
 *
 * Deliberately just a label and a number: the example shows the *shape* of the
 * product, and anything richer starts inviting a maintainer to make it richer
 * still until it is a second implementation of the dashboard.
 */
export interface ExampleStat {
  label: string;
  value: number;
}

/**
 * One "since you last played" row.
 *
 * Note what this type does *not* have: no author, no username, no character.
 * The product's credibility rests on attribution being real ("Gauthak wrote
 * this"), so an example that models fake people writing things undermines
 * exactly the thing it is advertising. Making the field absent from the *type*
 * means a future contributor cannot add one without deleting this comment.
 */
export interface ExampleUpdate {
  date: string;
  title: string;
  kind: "chapter" | "quest" | "npc";
}

/** The whole example panel, in one value. */
export interface SignedOutExample {
  campaignTitle: string;
  subtitle: string;
  stats: readonly ExampleStat[];
  updates: readonly ExampleUpdate[];
}

/**
 * The static example shown on signed-out Home, and nowhere else.
 *
 * Built from published module content (*The Sunless Citadel*) rather than
 * invented campaign fiction, so nothing here pretends to be a real group's
 * play. It is never derived from live data and never fetched — if it drifts
 * from what the app actually renders, that is a bug in this file, not a reason
 * to wire it to a context.
 */
export const SIGNED_OUT_EXAMPLE: SignedOutExample = Object.freeze({
  campaignTitle: "The Sunless Citadel",
  subtitle: "Started 12/03/2025 · Chapter 14",
  stats: Object.freeze([
    { label: "Chapters", value: 14 },
    { label: "NPCs", value: 23 },
    { label: "Locations", value: 9 },
    { label: "Open quests", value: 4 },
  ]),
  updates: Object.freeze([
    {
      date: "12/03/2025",
      title: "The Twig Blights of Oakhurst",
      kind: "chapter" as const,
    },
    {
      date: "10/03/2025",
      title: "Find the missing Hucrele heirs",
      kind: "quest" as const,
    },
    { date: "09/03/2025", title: "Kerowyn Hucrele", kind: "npc" as const },
  ]),
}) as SignedOutExample;

export default SIGNED_OUT_EXAMPLE;
