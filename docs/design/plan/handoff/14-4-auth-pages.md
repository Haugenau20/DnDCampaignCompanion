# PR 14.4 — `/signin` and `/join` as pages

Phase 14 · fourth PR · additive

The two auth arrivals you named: clicking Sign in, and following an invite
link. Both become pages that can hold a destination.

Depends on `14-1` (routes and the validated `next` helper).

## Read-only, in every PR of this phase

`../../../design/design-language.md`, `../../../design/colour-schema.md`,
`colour-schema.json`, `../../01-token-model.md`, `../00-surface-routing.md`
and every `14-*.md` handoff. Findings go to `../../03-drift-log.md`.

## Scope

- `src/features/user-management/auth/pages/SignInPage.tsx`
- `src/features/user-management/groups/pages/JoinPage.tsx`
- `src/features/user-management/auth/components/SignInForm.tsx`
- `src/features/user-management/auth/components/RegistrationForm.tsx`
- `src/features/user-management/auth/components/PrivacyNotice.tsx` — placement
- Their `__tests__`

Out of scope: `SessionTimeoutWarning` (stays a dialog, untouched), and
removing the dialogs (`14-5`).

## Do — `/signin?next=`

1. **Split layout.** Left panel on `surface.band`: eyebrow "Private
   campaign", serif headline, one sentence about what the record is. Right, on
   `surface.page`: the form. At phone width the band becomes a compressed
   header above the form.
2. **Title the form once.** Remove the `Card` + `Card.Header title="Sign In"`
   duplication — one heading, in serif, on the page.
3. **Fields**: email, password, "Keep me signed in for 30 days". Keep the
   30-day semantics and the existing `rememberMe` wiring exactly.
4. **When `next` is present and valid**, the band names the destination in
   serif — "You were heading to Locations · Mines of Moria. We'll take you
   back there." Derive the label from the route; if it cannot be named,
   omit the line rather than printing a path.
5. **On success**, go to the validated `next`, else campaign home.
6. **Error copy unchanged**: one message for both fields. Do not add
   per-field validation that guesses which one was wrong. Render it with
   `feedback.error` — washed background, `feedback.error.edge` border, and
   **body ink for the text** (colour schema §5.5).
7. **Remove the "Create Account" button** and the registration swap. In its
   place, below a hairline: accounts come from an invitation, with a link to
   `/join`. `RegistrationForm` is re-homed as a step inside `/join`, not
   deleted.
8. **`PrivacyNotice`** keeps its place in the account-creation step, where
   consent belongs, not on the sign-in form.

## Do — `/join?token=`

1. **Band on top**: "You have been invited to join", the group name in serif,
   who invited you. Form below on `surface.page`.
2. **A token from the link is stated, not re-entered.** Show a confirmation
   line that the invitation was read from the link. Render the paste field
   **only** when no `token` query param is present.
3. **Keep the existing mechanics** from `JoinGroupDialog`: read `token` and
   `groupId` from the query, `validateToken`, the 500ms debounced
   `validateUsername`, then `joinGroupWithToken(token, username)`. Keep the
   role check case-insensitive —
   `docs/testing/bug-tracking/702-invitation-admin-role-check-case-sensitive.md`.
4. **Username helper text says what it is for**: 3–20 characters, and other
   members see this name on everything you write. It is a name in this group,
   not an account name.
5. **Registration is a step on this page**, not a swapped form: invitation
   confirmed → your name in this group → email and password → join.
6. **An already-signed-in visitor** is told so and offered "Join as
   <username>". No registration form.
7. **A bad link is a page state**, not a field error: invalid, expired or
   already used → a plain statement and the advice to ask the person who sent
   it. The next step is a conversation, not a retry.

## Do not

- Do not use `next` without the `14-1` validator. An unvalidated return
  destination is an open redirect.
- Do not swap one form for another inside a single container. Steps on a page
  have URLs or at least visible progress; a swap has neither.
- Do not autofocus the password field, or any field, on the invite page — the
  first thing to read there is which group this is.
- Do not add social or magic-link sign-in. Not in the data model, not in this
  PR.
- Do not route `SessionTimeoutWarning`.

## Gates

- Deep link while signed out → `/signin?next=…` → sign in → land on the
  original URL, with the query string intact.
- `next` rejection cases all land on campaign home and never off-origin.
- Invite link end to end, as a new visitor and as a signed-in member.
- Invalid, expired and already-used tokens each render their page state.
- "Sign In" appears once in the DOM of `/signin`.
- The full flow works at 390px without zoom; targets ≥44px.
- Contrast: form fields on `surface.page`, band ink on `surface.band`, error
  banner ink on its wash — both modes.
- No hex in the diff.

## References

Design doc §5, §5.1, §5.2, §5.3. Design language §1, §4, §11. Colour schema
§5.1, §5.2, §5.5. Record D44, D45.
