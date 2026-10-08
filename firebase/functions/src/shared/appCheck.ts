// functions/src/shared/appCheck.ts

/**
 * Whether a callable refuses a call without an App Check token (T126).
 *
 * On for the callables a stranger reaches on the way in -- `reserveSignUp`,
 * `redeemInvitation`, `createGroup` -- so the public API key alone cannot
 * drive them from a script. The live site attaches App Check to every call
 * (`src/core/services/firebase/config/appCheck.ts`; Auth and Storage already
 * enforce it). The dev app attaches none against the emulators (bug #1411),
 * so inside the Functions emulator, where `FUNCTIONS_EMULATOR` is set, the
 * callables take the call.
 *
 * Read when a callable's module loads, which is when its options are set.
 */
export const ENFORCE_APP_CHECK = process.env.FUNCTIONS_EMULATOR !== "true";
