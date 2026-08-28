# Bug #1407 — `deleteUser` and `removeUserFromGroup` collapse their own error codes into `internal`

## Title
Both user-management Cloud Functions throw precise `HttpsError` codes (`permission-denied`,
`not-found`, `failed-precondition`) from inside a `try` whose `catch` rethrows everything as
`internal` — so no caller can ever distinguish "you are not allowed" from "the server broke".

## Status
✅ FIXED (2026-08-01) — awaiting a Functions deploy to take effect. See "Resolution" at the foot of
this document.

Originally 🔍 DISCOVERED — 2026-07-29. Found by the subagent implementing
[#1403](./1403-campaign-delete-confirmed-but-never-performed.md) while following these functions as
the pattern to copy; verified independently.

## Category
VALIDATION

## Discovered In
Code reading, 2026-07-29, while establishing the callable-function convention for #1403's new
`deleteCampaign`. **Not reproduced against a deployed function** — but the control flow is a plain
`throw` inside a `try` with a catch-all that rethrows, which is unambiguous on the page.

## Affected Files
- `firebase/functions/src/userManagement/deleteUser.ts` — throws at `:39` (`permission-denied`) and
  `:54` (`not-found`), inside the `try` opened at `:23`; caught at `:106`, rethrown `internal` at `:108`
- `firebase/functions/src/userManagement/removeUserFromGroup.ts` — throws at `:37`
  (`permission-denied`) and `:54` (`failed-precondition`), inside the `try` opened at `:20`; caught at
  `:120`, rethrown `internal` at `:122`

## Description

Both functions have this shape:

```ts
try {
  ...
  if (!adminProfile.exists || adminProfile.data()?.role !== "admin") {
    throw new functions.HttpsError("permission-denied", "Only group admins can remove other users.");
  }
  ...
} catch (error) {
  console.error("Error removing user from group:", error);
  throw new functions.HttpsError("internal", `Failed to remove user: ${...}`);
}
```

The deliberate, meaningful error codes are thrown *inside* the `try`, so the catch-all swallows them
and replaces them with `internal`. The original message survives (interpolated into the new one), but
the **code does not**.

Only the `unauthenticated` guard escapes, in both files, because it sits *before* the `try` opens
(`deleteUser.ts:17`, `removeUserFromGroup.ts:14`) — which makes the inconsistency accidental rather
than designed.

### Why it matters

`code` is the part a client can branch on; the message is free text for humans. A caller that wants to
show "you don't have permission to do that" rather than "something went wrong" has to string-match
the message, and `internal` is the code that monitoring and retry logic treat as *"server fault, try
again"* — precisely wrong for a permission denial, which will never succeed on retry.

### Confirmed by contrast

The new `deleteCampaign` added for #1403 deliberately does **not** copy this. It re-throws
`HttpsError` unchanged before the generic wrap:

```ts
if (error instanceof functions.HttpsError) throw error;
```

That deviation from the sibling pattern was flagged at the time rather than made silently, and is the
reason this entry exists.

## Reproduction

Not run. To confirm against the emulator: call `removeUserFromGroup` as a non-admin for another user
and inspect `error.code` on the client — expected `permission-denied`, predicted `internal`.

## Expected vs Actual

**Expected**: a callable function's deliberate error codes reach the caller intact; only genuinely
unexpected failures become `internal`.

**Actual**: every failure except `unauthenticated` arrives as `internal`.

## Recommended Fix

Add the same guard both functions' newer sibling already uses, as the first line of each `catch`:

```ts
if (error instanceof functions.HttpsError) throw error;
```

Two lines, no behaviour change for genuine internal failures. Deliberately **not** bundled into
#1403's change — that PR adds a new function, and quietly editing two shipped ones alongside it would
mix an unreviewed production change into a feature review. Both require a Functions deploy.

Worth checking `contact.ts` and `entityExtraction.ts` for the same shape before deploying.

## Resolution (2026-08-01)

Fixed — but **not** by pasting the two-line guard into each `catch`, which would have re-created the
condition that produced the bug. This defect exists because the guard was a copy-paste convention:
six callables, four of which had it and two of which did not, with no mechanism making the rule
single-sourced.

**One helper now owns the rule**: `firebase/functions/src/shared/httpsErrors.ts` exports
`rethrowHttpsError(error, fallbackMessage, onWrapped?)`, and all six callables route their `catch`
through it.

### The survey the fix was based on

| File | Before | After |
|---|---|---|
| `userManagement/deleteUser.ts` | **DEFECTIVE** — collapsed `permission-denied`/`not-found` into `internal` | uses helper |
| `userManagement/removeUserFromGroup.ts` | **DEFECTIVE** — collapsed `permission-denied`/`failed-precondition` | uses helper |
| `campaignManagement/deleteCampaign.ts` | already correct (inline guard, added by #1403) | uses helper |
| `groupManagement/createGroup.ts` | already correct (inline guard) | uses helper |
| `contact.ts` | already correct (inline guard) | uses helper |
| `entityExtraction.ts` (×2 callables) | already correct (inline guard, **named** `HttpsError` import) | uses helper |

So the report's scope was exactly right: only the two functions it named were broken. Its suggestion
to check `contact.ts`/`entityExtraction.ts` was worth making and came back clean.

### Two things that needed checking rather than assuming

1. **`instanceof` across import styles.** Five files use `import * as functions from
   "firebase-functions/v2/https"` (→ `functions.HttpsError`); `entityExtraction.ts` also uses the
   named `import { HttpsError }`. Both resolve to the same class from the same module specifier, so
   one `instanceof` check in the helper is correct for all of them. **Verified by reading every
   import line in the package** — all eight are `firebase-functions/v2/https`. Had any file used v1's
   `functions.https.HttpsError`, the check would have failed **silently** and reinstated the bug.
2. **The `onWrapped` callback exists to preserve a real difference, not for generality.**
   `deleteUser`, `removeUserFromGroup`, `contact.ts` and `entityExtraction.ts` logged every caught
   error *unconditionally*; `deleteCampaign.ts` and `createGroup.ts` logged *only* on the wrap path,
   after their early return. Unifying the six catch blocks without `onWrapped` would have quietly
   changed which errors get logged in two of them.

### Verification, and its limits — read this before trusting the fix

- `cd firebase/functions && npm run build` — exit 0.
- `npm run lint` — 435 errors / 2 warnings, against a **pre-existing** baseline of 437 / 2 measured
  on the unmodified tree. All remaining errors are package-wide whitespace/quote-style/JSDoc noise
  unrelated to this bug.
- Root `tsc --noEmit` — clean; no `src/` file was touched.

⚠️ **There is no test proving this fix.** `firebase/functions/` has no test runner at all — its
`package.json` has only lint/build/serve/shell/deploy. So unlike every other fix in this tracker,
this one is verified by **compilation and reading only**, with no revert-proof. That is a real gap,
not a formality: the `instanceof` correctness above is exactly the kind of claim that fails silently
in production and compiles perfectly.

**`firebase-functions-test@^3.1.0` is already in `devDependencies` and entirely unused.** A harness
using it (invoke each callable as a non-admin, assert `error.code`) would make this bug and any
regression in the helper provable. Deliberately **not** built here — adding a test runner to the
functions package is infrastructure scope for the owner to approve, not part of a bug fix.

⚠️ **Requires `firebase deploy --only functions` to reach users.** Nothing changes in production
until that runs.
