// functions/src/groupManagement/groupLimits.ts
//
// How large a group may grow (T128; the onboarding plan, D2, decided
// 2026-10-08). Membership belongs to the group, so every member reads every
// campaign in it: a second table with other players is a second group, not a
// larger one. The app's `src/core/constants/groupLimits.ts` repeats these
// numbers to say so before a refusal; change both together.

/** The most members one group may have. */
export const MAX_GROUP_MEMBERS = 10;

/** What a full group's next joiner is told. */
export const GROUP_FULL_MESSAGE =
  `This group is full: it has ${MAX_GROUP_MEMBERS} members, the most a group ` +
  "may have.";
