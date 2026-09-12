// src/core/themes/derive/index.ts
// The generator's public surface.
//
// `deriveTokens` is what a theme definition calls. Everything else is exported
// for the gates: the fixture comparison, and the borrowed-role verification
// this module runs on itself.

export { deriveTokens, derivePrimitives, findBorrowedRoleFailures, verifyBorrowedRoles } from "./generate";
export type { Primitives, BorrowedRoleFailure } from "./generate";
export { HUE, RAMP, ENTITY_COUNT, TEXT_MINIMUM, NON_TEXT_MINIMUM } from "./contract";
export type { LightnessRamp } from "./contract";
export { ROLE_MAP } from "./role-map";
export type { Role } from "./role-map";
export { oklchToHex, contrastRatio, withAlpha } from "./oklch";
export type { Oklch } from "./oklch";
