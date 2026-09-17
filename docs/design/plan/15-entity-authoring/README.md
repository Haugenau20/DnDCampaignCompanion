# Phase 15 — Entity authoring: quests, rumours, NPCs, locations

Nine PRs. A record stops having a create form, a read surface and an edit form
that drift apart, and becomes one surface that is edited where it is read.
Nothing in this phase changes a colour, a font or a token.

- **The design doc:** `00-entity-authoring.md` — the three rules, the audit,
  the decisions `D15.1`…`D15.12`, the copy.
- **The handoffs:** `handoff/15-0` … `handoff/15-8`, in order.
- **The visual reference:** the eight `.png` renders in this folder.
  `quick-add.png` is `S1` and `phone.png` is `S9`; the rest cover the
  directory rows, the two new pages and the rumour list. `00-entity-authoring.md`
  §0 names `Authoring UI handover.dc.html` and `Entity authoring direction.dc.html`
  at the project root instead — **neither is in the repository**, so use these.

This is the first phase to live in its own folder. Phases 6–14 are flat in
`../`, with their handoffs in `../handoff/`, so a reference from here to a
document of theirs climbs one level: `../00-surface-routing.md`,
`../../design-language.md`.

## Order, and why it is this order

The project's own pattern: additive first, destructive last.

| PR | What | Breaks anything? |
|---|---|---|
| `15-0` | Documentation only — the retired drift log stops being pointed at | No |
| `15-1` | Quick add: two fields, in a dialog, a sheet and a route | No |
| `15-2` | The attach tray — one browse-first relation picker, adopted in four forms | No |
| `15-3` | Directory rows: a bounded summary, a real objective checkbox, one highlight hook | No |
| `15-4` | `/locations/:locationId` and the hierarchy module — the page shell is built here | No |
| `15-5` | `/quests/:questId`, on that shell. `importantNPCs` is deleted | No |
| `15-6` | The NPC page: four changes, and nothing else | No |
| `15-7` | Rumours are authored in their own rows. No page, deliberately | No |
| `15-8` | Retire the four edit routes and the create forms | **Yes — last** |

`15-4` is sequenced before `15-5` because the location is the hardest test of
the model: it is the one entity a row provably cannot hold. If it fails there,
`15-5` and `15-6` are re-planned rather than built.

`15-7` depends only on `15-2` and can move earlier if a small proof of the
in-place model is wanted first.

## Read-only in every PR of this phase

`../../design-language.md`, `../../colour-schema.md`,
`../../colour-schema.json`, `../01-token-model.md`, the phase plans,
this folder's `00-entity-authoring.md`, and every `handoff/15-*.md`.

A handoff that is wrong is **reported, not rewritten**: file the finding in
`TODO.md` and stop. A merged handoff is never edited by anyone.

`../03-drift-log.md` is **closed** and takes no entries. It is cited by number
from the colour schema and from `TODO.md`, which is why it is kept.

## What this phase does not do

- No token changes. If a surface here seems to need a colour no primitive
  provides, the colour schema is incomplete — a `TODO.md` item, not a hex.
  One such gap is known already, and is filed as `T040`.
- No new permissions model, no edit history, no batch actions on the three
  other entities, and no stored-shape change for note dates.
  `00-entity-authoring.md` §12 records each and why.
