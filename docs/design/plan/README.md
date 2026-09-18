# Phase 14 — Surface routing: admin and auth become pages

Five PRs. Admin and sign-in stop being dialogs; the dialogs that remain get
smaller. Nothing in this phase changes a colour, a font or a token.

- **The design doc:** `00-surface-routing.md` — the rule, the decisions, the
  information architecture, the screen specs, the copy.
- **The handoffs:** `handoff/14-1` … `handoff/14-5`, in order.
- **The visual reference:** `Admin and sign-in direction.dc.html` at the
  project root — options `1b` (admin page) and `1c` (auth pages) are the
  approved ones. `1d` is deferred; `1e` is the dialog diet and is approved.

## Order, and why it is this order

The project's own pattern: additive first, destructive last.

| PR | What | Breaks anything? |
|---|---|---|
| `14-1` | Routes, guards, entry points. Existing components rendered as-is under the new routes. Dialogs still reachable. | No |
| `14-2` | `/admin/people` — Users and Registration Tokens merge into one view | No |
| `14-3` | `/admin/campaigns`, `/admin/group` | No |
| `14-4` | `/signin`, `/join` as pages, with `?next=` | No |
| `14-5` | Delete the dialog entry points; shrink the surviving dialogs | **Yes — last** |

A route that exists but is unreferenced is cheap. A deleted dialog with no
route to replace it is an outage, which is why `14-5` is fifth and not first.

## Read-only in every PR of this phase

`../../design/design-language.md`, `../../design/colour-schema.md`,
`../../design/colour-schema.json`, `../01-token-model.md`, this folder's
`00-surface-routing.md`, and every `handoff/14-*.md`.

A handoff that is wrong is **reported, not rewritten**: file the finding in
`TODO.md` and stop. A merged handoff is never edited by anyone.

## The phase number is proposed

Phases 12 and 13 are the colour schema and the package extraction. If those
renumber, this becomes whatever follows them; nothing here depends on the
number except the filenames.

## What this phase does not do

- No token changes. If a surface here seems to need a colour no primitive
  provides, the colour schema is incomplete — a `TODO.md` item, not a hex.
- No new permissions model. `14-2` renders roles and may not invent role
  editing beyond what the server already enforces; see
  `docs/testing/bug-tracking/1409-member-can-escalate-to-group-admin.md`.
- No landing-page change. Option `1d` (sign-in inline in the hero) is
  deferred, deliberately — `00-surface-routing.md` §7 records why.
