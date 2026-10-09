// src/core/constants/groupLimits.ts

/**
 * How large a group may grow (T128; the onboarding plan, D2, decided
 * 2026-10-08). The functions hold these limits
 * (`firebase/functions/src/groupManagement/groupLimits.ts`); the app repeats
 * them only to say so before a refusal. Change both together.
 */
export const GROUP_LIMITS = {
  /** The most members one group may have. */
  members: 10,
  /** The most campaigns one group may have; deleting one frees its place. */
  campaigns: 5,
} as const;
