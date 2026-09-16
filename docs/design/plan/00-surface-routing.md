# Surface routing — admin and auth

The design doc for Phase 14. It decides **which surfaces are pages and which
are dialogs**, and specifies the four pages that result.

Ranking: `../../design/design-language.md` decides why and outranks this
document on any principle. `../../design/colour-schema.md` decides every
value. This document decides surface *type* and layout. `../` decides when.

§1 is proposed as an amendment to design language §5. Until it is adopted
there, this document is where the rule lives.

---

## 1. The rule

**A dialog is one decision, taken about the thing behind it, and thrown
away. Everything else is a page.**

Three questions decide it. Ask them in order.

1. **Is the thing behind it the context?** A delete confirmation is *about*
   the row you clicked; the row is why the sentence makes sense. Admin is not
   about the Locations list it currently covers.
2. **Is there a URL worth returning to, sharing or bookmarking?** An invite
   link, a member you were looking at, a destination you were heading to
   before being asked to sign in. If yes, it needs a route.
3. **Is there more than one decision inside?** Tabs, a table, a search field
   and a form is a workspace.

One "yes" to 2 or 3 makes it a page. Only no-no-no is a dialog.

### Why this rule and not "modals are bad"

Dialogs are excellent at the thing they are for, and this phase keeps six of
them. What the rule prevents is the specific failure already in the build: a
*place* implemented as an overlay, which then cannot be linked to, cannot be
returned to, cannot be read on a phone, and loses typed input to a stray
backdrop click.

### The build is already saying it

Two symptoms, both visible without measuring anything:

- `GroupManagementView` ends with a note telling you to use two other tabs.
  A workspace apologising for its own navigation is a workspace with the
  wrong container.
- Sign-in renders the words "Sign In" twice, because a titled `Card` was
  placed inside a titled `Dialog`. Nested chrome is the tell that a page was
  folded into a modal.

A third is in the test suite rather than the UI:
`301-join-group-dialog-form-content-unreachable-in-jsdom.md`,
`302-location-quest-form-sections-dialog-content-unreachable.md` and
`201-group-management-view-error-not-displayed-in-dialog.md` are all the same
shape — content that is hard to reach because of where it is mounted, not
because of what it is.

## 2. The audit

Every dialog in the application, measured against §1.

| Surface | Today | Becomes | Because |
|---|---|---|---|
| `AdminPanel` | dialog | **page** · `/admin/people`, `/admin/campaigns`, `/admin/group` | Three views, two tables, search, destructive actions, phone use |
| `SignInForm` | dialog | **page** · `/signin?next=` | Must carry a destination back out again |
| `JoinGroupDialog` | dialog | **page** · `/join?token=` | An invite link is a link; it should land somewhere |
| `RegistrationForm` | form swapped inside the sign-in dialog | **step inside `/join`** | Accounts come from invitations; this was never a separate decision |
| `DeleteConfirmationDialog` | dialog | dialog | One decision, about the row behind it |
| `DeleteAccountDialog` | dialog | dialog | Ditto, with a higher stake |
| `LeaveGroupDialog` | dialog | dialog | Ditto |
| `CombineRumorsDialog` | dialog | dialog | Acts on the entries selected on the page behind it |
| `ConvertToQuestDialog` | dialog | dialog | Ditto |
| `SessionTimeoutWarning` | dialog | dialog | The page behind it *is* what you are about to lose |
| Share an invite link | inline in a table cell | **dialog** | One decision — copy this and go |

Net: four dialogs out, one small one in, four routes added.

## 3. Information architecture — admin

Four tabs become three views. The regrouping is not tidying; each move
removes a thing the user had to hold in their head.

| Today | Becomes | Why |
|---|---|---|
| Users | **People** | Membership and invitation are one job |
| Registration Tokens | merged into People | See below |
| Campaigns | **Campaigns** | Unchanged in substance |
| Group | **Group** | Loses its "go to another tab" note, gains the danger zone |

### Registration tokens stop being a list

A *used* token is a member. The Users table and the Tokens table currently
show the same five people twice, in different vocabularies, and the second
telling has no action worth taking — you cannot un-use a token.

So the People view shows:

- **Members** — everyone who accepted, with role, join date, and per-row
  actions.
- **Pending invitations** — only tokens nobody has accepted yet, with copy
  link and revoke.

An accepted invitation moves from the second list to the first. That is the
whole model, and it is the same sentence in the UI: *"Accepted invitations
appear above as members."*

### Admin is a role, not a person

Stated because the current copy blurs it and the visual reference fixes it
deliberately.

**An admin is any member of the group holding the admin role. There may be
several. Nothing may imply the admin is the DM, the group's owner, or the
person who created the campaign.** The DM is a fact about the table, not a
fact the software stores.

Concretely: the band says *"you are one of 2 admins"*; the members table has
a Role column with more than one Admin row; no copy anywhere reads "the
admin" in the singular or names a role "Dungeon Master". `GroupManagementView`
may keep showing who created the group as a historical fact, and must not
present that person as the authority.

## 4. `/admin/*` — the page

Approved as option `1b` in `Admin and sign-in direction.dc.html`.

### Structure, top to bottom

1. **App chrome** — unchanged. `surface.chrome`. Admin is inside the
   application, not a separate console.
2. **Band** — `surface.band`. Eyebrow "Group administration" in sans; the
   group name in serif at heading scale (it is content of the world); one
   metadata line — member count, campaign count, *"you are one of N admins"*.
   Right-aligned: a back control naming the campaign you came from.
3. **Sub-navigation** — three links on `surface.page`, active one marked by
   `accent.edge` as a 2px bottom rule plus full-strength ink. These are
   routes: `aria-current="page"`, real `<a>`, browser back works.
4. **Content** — cards on `surface.page`, `surface.card` for the cards
   themselves. Rules between rows *inside* a card, never a box per row
   (design language §5).

### Entry point

**The user menu only, and only for admins.** No nav item, no badge, no
campaign-switcher entry. The route exists; nothing advertises it. A member who
types `/admin` gets §4.1.

Rationale: a few times per campaign (your answer) does not earn a slot in
chrome that is scanned every session — design language §2, "ornament recedes
as frequency rises", applied to navigation.

### 4.1 States, which is half the reason this is a page

The current panel already implements all three. They are page concerns
wearing a dialog.

- **Loading** — the band renders immediately from the group you are already
  in; only the content area waits. Keep the existing 3-second loading timeout
  exactly as it is and move it; `AdminPanel.tsx` says why removing it is a
  behaviour change nobody can predict.
- **Not an admin** — a full page, not a dialog with a Back button. Plain
  statement, no alarm styling, and one link back to the campaign. It is not
  an error; the person is simply not an admin.
- **Signed out** — redirect to `/signin?next=/admin/people`. This is the
  case that makes `?next=` worth building, and
  `1423-edit-pages-redirect-to-list-during-auth-rehydration.md` is the trap:
  do not decide "not signed in" while auth is still rehydrating.
- **No active group** — a page saying so, with the group switcher reachable.

### 4.2 Phone

This is the argument that would settle it alone. The current dialog locks body
scroll, traps focus and puts a four-column table inside a panel. As a page:

- The band compresses; the sub-nav is three words and needs no scroll.
- Table rows become two-line rows — name in serif, one metadata line in sans,
  action right-aligned. Minimum 44px hit targets; the reference uses 64px rows.
- Primary action ("Invite someone") is full-width above the list.

No horizontal scroll at 390px, in any of the three views.

## 5. `/signin` and `/join` — the pages

Approved as option `1c`.

### 5.1 `/signin?next=`

Split page. Left, `surface.band`: eyebrow "Private campaign", a serif
headline, one sentence of what the record is, and — when `next` is present —
a line naming where you were going. Right, on `surface.page`: the form,
titled **once**.

- Email, password, "Keep me signed in for 30 days", primary Sign in.
- Error copy stays as it is: one message for both fields, no field-level
  guessing about which was wrong.
- A hairline, then the truthful statement that accounts come from invitations,
  with a link to `/join`.
- No "Create Account" button. It promises a path that does not exist without
  a token, and it is why the form currently swaps itself out mid-dialog.

**`next` handling.** Captured on every redirect to `/signin`, restored on
success, and validated before use: accept a same-origin path beginning with a
single `/`, reject anything with a scheme, a protocol-relative `//`, or a
host. An unvalidated `next` is an open redirect. When `next` is absent or
rejected, land on campaign home.

### 5.2 `/join?token=`

Same page family, band on top rather than beside. The band names the group
you have been invited to, in serif, with who invited you.

Keep the existing behaviour: read `token` and `groupId` from the query,
validate the token, debounce the username check, then `joinGroupWithToken`.
Three changes:

- The token arriving by link is **stated, not re-entered** — a confirmation
  line, not a text field. The paste field appears only when there is no
  `token` param (the "I have an invite" path).
- Username gets the honest helper text: this is the name other members see on
  everything you write. It is not an account name.
- An already-signed-in visitor is told so and offered "join as <username>",
  rather than being shown a registration form.

Token invalid, expired or already used is a **page** state, not a red line
under a field: the link is the problem, and the next step is asking the person
who sent it. Keep the role check case-insensitive —
`702-invitation-admin-role-check-case-sensitive.md`.

### 5.3 The one dialog that stays in auth

`SessionTimeoutWarning`. Question 1 answers it: the page behind is exactly
what is at stake, and after re-authenticating you want the paragraph you were
reading, not a route. Do not move it, and do not route it.

## 6. The dialog diet

Approved as option `1e`. For the six that remain:

- **No card inside a dialog.** The dialog *is* the card — one title, one
  border, one padding. `Dialog` already supplies the title; a `Card` inside it
  is the duplication seen in sign-in.
- **No tabs, no tables, no second scroll region.** If it needs one, §1 already
  said it is a page.
- **No backdrop-dismiss once input exists.** Backdrop click and Escape may
  close an untouched dialog; once anything is typed they must not silently
  discard it. Offer Cancel.
- **Destructive confirms name the object and the blast radius.** "Delete
  *The Hobbit*?" then who loses what, then "This cannot be undone". The
  confirm button says the verb — "Delete campaign", never "OK".
- **`danger.confirmBg` / `danger.confirmText`** for the destructive button;
  red appears nowhere else on the dialog.

The new one — **share an invite link** — is the shape to copy: a title, one
sentence of consequence, the link in a monospace field with Copy, one button.

## 7. What was considered and not chosen

**Sign-in inline in the landing hero** (option `1d`, deferred). Fewer clicks,
and reasonable if the landing page's job were conversion. It is not: this is a
returning-user product (design language §1), so a permanent form in the hero
optimises for the visit that happens once. It also still has no URL — a deep
link while signed out has to go *somewhere*, and "the landing page, scrolled
to the form, holding your destination" is a page pretending not to be one.
Revisit only if you want a single public URL that does everything; then
`1c`'s split page becomes the landing page and `1d` collapses into it.

**Admin as a nav item.** Rejected on frequency: a few times per campaign,
in chrome that is scanned every session.

**Admin as a separate console at its own top-level domain of the app** (no app
chrome). Rejected: administration is per-group and you arrive from a campaign;
dropping the chrome would make "which group am I administering" ambiguous,
which is the one question the band exists to answer.

**Keeping four tabs.** Rejected because of §3 — the fourth tab's content is
mostly a redirect to the other three.

## 8. Decisions to record in `../03-drift-log.md`

- **D40 — A dialog is one decision about the thing behind it.** The three
  questions in §1 are the test. Proposed as an amendment to design language §5.
- **D41 — Admin and auth become routes.** `/admin/{people,campaigns,group}`,
  `/signin`, `/join`. Four dialogs retired.
- **D42 — Used registration tokens are not shown.** A used token is a member
  row; the invitations list holds only what nobody has accepted.
- **D43 — Admin is a plural group role, never the DM.** Copy and layout state
  the count and the holders; the software stores no notion of a DM.
- **D44 — Accounts are created from invitations only.** "Create account" is a
  step inside `/join`, not a button on sign-in.
- **D45 — `next` is validated as a same-origin path.** An unvalidated return
  destination is an open redirect.
- **D46 — Inline sign-in deferred, not rejected.** §7 records the condition
  under which it returns.

## 9. References

Design language §1 (returning-user product), §2 (ornament recedes as frequency
rises; nothing encoded by colour alone), §4 (serif is the campaign's voice —
group and campaign names; sans is the application's — labels, nav, metadata),
§5 (surface hierarchy; rules inside cards), §8 (the row is the unit; designed
empty states), §11 (chrome copy is plain and short), §12 (tie-breakers).

Colour schema §5.1 (surfaces), §5.2 (`accent.*`, `field.*`, `danger.*`),
§5.3 (entity palette, for member marks), §5.5 (`feedback.*` for form
feedback — and the pairing rule: a washed banner takes body ink, never the
hue on its own wash).
