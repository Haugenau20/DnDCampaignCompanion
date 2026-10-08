// functions/src/shared/refusal.ts
//
// An action refused for a reason its caller should be told, as opposed to a
// failure. The operator page (T137) answers one with a plain sentence and a
// 4xx status; anything else it answers with a 500 and a trace id.

/** Why an action was refused. */
export type RefusalReason =
  | "invalid_input"
  | "budget_spent"
  | "link_not_found"
  | "link_ambiguous"
  | "link_used"
  | "no_profile";

/** An action refused, with a sentence fit to show the person who asked. */
export class Refusal extends Error {
  /**
   * @param {RefusalReason} reason Why, for the audit line and the status
   * @param {string} message What to tell the person who asked
   */
  constructor(readonly reason: RefusalReason, message: string) {
    super(message);
    this.name = "Refusal";
  }
}
