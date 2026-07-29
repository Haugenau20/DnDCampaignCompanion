# Bug #1407 — `deleteUser` and `removeUserFromGroup` collapse their own error codes into `internal`

## Title
Both user-management Cloud Functions throw precise `HttpsError` codes (`permission-denied`,
`not-found`, `failed-precondition`) from inside a `try` whose `catch` rethrows everything as
`internal` — so no caller can ever distinguish "you are not allowed" from "the server broke".

## Status
🔍 DISCOVERED — 2026-07-29. Found by the subagent implementing
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
