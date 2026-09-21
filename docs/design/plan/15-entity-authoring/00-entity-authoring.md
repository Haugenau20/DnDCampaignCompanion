# Entity authoring — quests, rumours, NPCs, locations

The design doc for Phase 15. It decides **where an entity is created, where it
is read, and where it is edited**, and specifies the surfaces that result.

Ranking: `../../design-language.md` decides why and outranks this
document on any principle. `../../colour-schema.md` decides every
value. `../00-surface-routing.md` decides whether a surface
is a page or a dialog, and this document obeys it rather than re-deciding it.
This document decides authoring model and layout. `../` decides when.

**The visual reference** is `Authoring UI handover.dc.html` at the project
root — surfaces `S1`…`S9`. `Entity authoring direction.dc.html` holds the
reasoning and the rejected options; it is not a spec.

---

## 1. The rules

Three. Each replaces a decision currently made per-component.

### 1.1 A record is edited where it is read

There is no edit form. A field is changed by clicking it in the place it is
displayed, which becomes an editor in situ. Create and read surfaces exist;
an edit surface does not.

This is not a new invention in this codebase — `src/pages/npcs/InlineEditor.tsx`
already does it, correctly, including the part everyone gets wrong (see §7).
The phase generalises what one page already proved.

**Why.** Four forms currently exist in three copies each: create, edit, and a
read surface that renders the same fields. Nothing keeps the three in sync,
and the drift is measurable — a quest's related NPCs render twice from two
different fields, a location's parent is silently blanked when invalid, and the
same date is formatted one way on a page and another way in a row. One surface
per record removes the class of defect rather than the instances.

### 1.2 Creating an entity asks for two fields

Name, and one line saying what it is. Nothing else, on any of the four
entities. Everything further is added afterwards, on the record itself.

The required pair is **unchanged** from today's forms — this phase does not
relax validation, it removes the twenty optional fields that currently sit
beside the two required ones at identical visual weight.

### 1.3 A row expands to a summary. A page holds the record.

A directory row expands to the four facts you would ask mid-session, plus
whatever structure sits under it. It does not expand to the whole record, and
it never nests a record card inside another record card.

**This rule was wrong in its first draft and is stated carefully because of
it.** The first version said a row expands to *structure only* and moved all
content to the page. That was rejected: it buries every readable fact one
level deeper and makes the directory useless for the thing it is for. The
correction is a bounded summary — roughly 160px, the same four-fact shape at
every depth — followed by structure. Nesting is the defect; content in the row
is not.

## 2. The audit

Every authoring and reading surface, and what it becomes.

| Entity | Create today | Read today | Edit today | Becomes |
|---|---|---|---|---|
| Quest | `/quests/create` | expanded directory row (9 sections) | `/quests/edit/:id` | quick add → **`/quests/:questId`** (new) + trimmed row |
| Location | `/locations/create` | expanded row, nested record cards | `/locations/edit/:id` | quick add → **`/locations/:locationId`** (new) + tree row |
| NPC | `/npcs/create` | `/npcs/:npcId` | `/npcs/edit/:id` | quick add → **existing page, kept** |
| Rumour | `/rumors/create` | expanded row | `/rumors/edit/:id` | composer row → **row expansion. No page.** |

Net: two routes added, four edit routes retired, four create routes kept but
demoted to a link target for one dialog.

### 2.1 Why the rumour gets no page

It is the one entity nothing points at. A quest is pointed at by rumours
(conversion), NPCs, locations and notes; a location is a hierarchy node; an
NPC is referenced everywhere. A rumour points outward and is then resolved —
confirmed, disproved, or converted into a quest. Its two real operations
already act on a *selection in the list*
(`RumorBatchActions.tsx`, `CombineRumorsDialog`, `ConvertToQuestDialog`), which
is where the entity lives.

Seven fields, one of which is a paragraph, with no inbound links and no
hierarchy, does not earn a route. It earns a row that opens.

### 2.2 Why the quest and the location do

Each holds something a row demonstrably cannot:

- **The location** is a tree. A row cannot show parent, self, children and
  siblings at once, and the current attempt — a record card, a heading, then a
  child record card inside it — is the clumsiness this phase was opened to fix.
- **The quest** has five list fields and four relation fields, and *nothing in
  the product can link to one*. A rumour converts into a quest and cannot then
  refer to it. That is a missing address, independent of any authoring change.

## 3. What the row carries, and what the page carries

The dividing test, applied per field: **can this be read while scanning five
of them?** If yes it is in the row. If it is read once, while prepping, it is
on the page.

| | In the row (expanded) | On the page |
|---|---|---|
| **Quest** | description, objectives (tickable), who is in it, status control | background, leads, complications, rewards, places inside, level range, inbound links, record history |
| **Location** | description, features (one line), who is here, quests here, knowledge control | the hierarchy module, notes, tags, inbound links, record history |
| **NPC** | the one-liner, stance control, relations | appearance, personality, background, race/occupation, notes, tags, inbound links |
| **Rumour** | *everything* — the row expansion is the record | — |

Two things are **never** in a row: the inbound-link list ("what points here"),
because a row cannot hold it without becoming a card again; and the full tree.

## 4. Quick add

Approved as `S1`. One component, one layout, four label sets.

**It is a dialog, and it passes Phase 14 §1 on all three questions**: the page
behind it is the context (you are in the NPC list, adding an NPC to it), there
is no URL worth returning to, and it holds one decision. This is the rule
working, not an exception to it.

| Entity | Fields | Lands on |
|---|---|---|
| NPC | name · who they are in a line | `/npcs/:id` |
| Quest | title · what the party was asked to do | `/quests/:id`, caret in the first objective |
| Location | name · description, **parent pre-set** when launched from *Add a place inside* | `/locations/:id` |
| Rumour | title · what was heard | its own row, expanded in place. No dialog, no navigation. |

- **Primary action is *Create & open*.** It navigates to the record with its
  first unwritten field focused. Landing on a read-only page the user must then
  find an edit affordance on defeats the point.
- **Secondary is *Create & add another*** — keeps the dialog, clears it, counts
  quietly. This is the bulk-prep case (ten NPCs before a session), and it is
  the one case a long form genuinely served better.
- **On a phone it is a bottom sheet**, not a centred dialog. A centred dialog
  puts both fields under the keyboard.
- **The `/{entity}/create` routes are kept** and render the same component
  centred on an otherwise empty page — note conversion and pasted links need a
  destination. One component, two mounts. Do not build two.
- **No status field.** A new quest is active, an NPC alive with unknown stance,
  a location known. Each is one click to change from the row afterwards.

## 5. The attach tray

One component, replacing every relation picker in the product.

**Browsing what exists is the primary act, and typing is never the price of
attaching something.** This is a direct constraint from the maintainer and it
decides the shape: the tray is a browsable list, opened in place, with a
filter box as an accelerator. It is not a typeahead — mid-session you attach
the NPC you can see on the list, not the one you can spell.

- **Opens in place**, under the field it fills, with the already-picked chips
  visible above it throughout. It is not a dialog: it fails Phase 14 §1
  question 1, because it is *part of* the form behind it rather than a decision
  about it.
- **Each entry carries its identity mark, its name, and the one line that
  disambiguates it** — an NPC's occupation and location, a location's type and
  parent, a quest's status. A bare name cannot be chosen from confidently, and
  the current pickers offer nothing else.
- **Ordered by recently touched**, not alphabetically. The entries you attach
  mid-session are the ones the session has been about.
- **Ends with an escape hatch** — "no such person yet — add one" — which opens
  quick add with the relation pre-wired.
- **On a phone it is a sheet**, same list.

This retires three distinct affordances (a bare `⊕` glyph, an outlined button,
a full-width bar), two vocabularies (`Add` vs `Add tag`), and the modal grid
of centred chips with no filter and no count.

## 6. The location hierarchy

The hard part of the phase, and the reason `15-4` is sequenced before the
quest page.

### 6.1 In the directory — a tree of rows

Every place is **one line** until asked: identity mark, name, type in words,
knowledge step, what is inside, a way in. Indentation of 30px per level plus a
1px rail carries the hierarchy.

Expanding adds the bounded summary from §3 — description, features, who is
here, quests here, and the knowledge step as three buttons — and then lists
what is inside as more one-line rows. **A child expanded inside an expanded
parent still reads as one object with parts**, because the summary is bounded
and the rows are uniform. That is the whole fix.

- ~~The twisty and the name are **different targets**: the twisty toggles the
  branch, the name opens the page. A place with nothing inside shows no
  twisty.~~ **Superseded after `15-8`, from the running app.** This was written
  before §1.3 gave every row a bounded summary, and once it had one the two
  halves together left a leaf with no control that opened it at all — its
  description, features, knowledge step, people and quests were unreachable
  from the directory, and its name simply left for the page. Every row now
  opens, from the twisty or from the name, and the page is reached through
  *More info* inside the expansion (D41), which is what a quest row and an NPC
  row already did.
- **Search flattens the tree** and shows each match with its path ("Gondolin ·
  in Beleriand"). A filtered tree with orphaned parents is unreadable.
- Visual indent caps at four levels; logical indent continues. The name column
  never collapses.

### 6.2 On the page — "Where this sits"

Three levels at once — parent, self, what is inside — plus siblings at reduced
emphasis. This is the module a row deliberately does not carry.

- **Reparenting is *Move elsewhere*** → the attach tray filtered to locations,
  **excluding self and all descendants**. Today's form offers a combobox that
  silently blanks an invalid parent.
- **Adding a child is *Add a place inside***, which is quick add with the
  parent pre-set. It is the only way a child is created, so nothing lands loose.
- **Deleting a parent must ask what happens to its children** — promote to the
  grandparent, or delete the subtree. Never orphan. Never decide silently.

### 6.3 Cycles are a live hazard, not a hypothetical

`PERF-11`, tracked in `TODO.md` under T033 and T014, reports that
`LocationDirectory`'s parent walk uses repeated `locations.find` with **no
visited set**, so a node inside a parent cycle never terminates. Every
traversal this phase adds — the tree render, the breadcrumb, the descendant
exclusion in §6.2 — walks the same edges.

**Every traversal added or touched in this phase carries a visited set and a
depth cap.** Reparenting additionally refuses to create a cycle. This is a
gate, not a nicety: the feature that makes cycles reachable ships in the same
phase as the guard.

### 6.4 Features are not children

A location's `features` are free text on the record. Children are real
location documents. They are different things and the page shows both, with a
**promote** action moving a feature across when the party actually gets there.

The same shape applies to a quest's *places inside* — free text with a promote
action, not a second relation. §11 records why this was chosen over making
them real locations.

## 7. Editing in place — the save contract

`src/pages/npcs/InlineEditor.tsx` is the reference implementation and the
behaviour it already has is non-negotiable for every field in this phase:

1. **Nothing claims success before the write resolves.** No optimistic tick,
   no "Saved!" ahead of the server.
2. **A failed write keeps every character typed**, and says what happened in
   words, next to the field it happened to.
3. **One field open at a time.** Escape cancels; Save commits.

This matters more here than in a normal form because the record is shared. Four
people read it, and a row that shows a tick nobody's server agreed to is worse
than a row that shows a spinner.

**The objective checkbox obeys the same contract** — it is a write, not a
toggle. It shows a pending state on its own row and reverts visibly on failure.

## 8. What attribution may claim

**Corrected against the code, and this narrows the visual reference.**

`ContentAttribution` (`src/core/types/common.ts`) stores created-by and
last-modified-by and **nothing in between**. `TODO.md` T005 asks whether an
entity keeps real edit history and says, correctly, to answer it *before
anything in the UI promises a timeline*.

So:

- **A page's record line states what exists**: who created it and when, who
  last modified it and when. That is two facts, and they are real.
- **Per-field attribution is not built.** The visual reference shows
  "DungeonMaster · 31 May" beneath individual blocks and
  "gandlaf ticked *Find the secret door* · last session" in a quest row. **Do
  not implement either.** Both imply per-field or per-objective history the
  data model does not carry.
- **Notes are the exception and already work**: a note carries its own author
  and date, because a note is a document. The location page's notes list and
  the NPC page's notes list may credit each entry, because each entry really
  is credited.

When T005 is answered, the blocks are where per-field attribution goes. Until
then the pages are honest about holding two facts rather than a timeline.

### 8.1 Dates are formatted, everywhere, once

T001: two directories print `{note.date}` raw, so a row shows
`2025-05-31T19:27:30.387Z` while `NPCDetailPage`'s own `formatNoteDate`
renders the same value properly. Every surface in this phase displays a
formatted date, from one shared helper.

T001 also records that the real defect is upstream — `NPCNote.date` has no
agreed stored shape. This phase does not fix the stored shape; it stops four
consumers from each inventing a display. If a handoff finds itself needing the
stored shape decided, that is T001, reported not patched.

## 9. URL state, and not inventing a fifth dialect

The trimmed row needs an address: a link from a rumour, a note or the command
palette must be able to open a directory with one row expanded.

**There is already a parameter for this and it is already a mess.** T014: four
directories read `?highlight=` four different ways — two match by id *or name*
and auto-expand ancestors, one is id-only with no expand, one sets a prop and
does nothing else — and `/story` ignores it entirely while the command palette
emits it.

**This phase does not add `?open=`.** The addressable expansion *is*
`?highlight=`, and `15-3` unifies the four consumers into one shared hook as
part of trimming the rows. Adding a second parameter beside a parameter that
already has four meanings is how a fifth meaning gets created.

The contract `15-3` establishes: **match by id**; expand the target and every
ancestor needed to reveal it; scroll it into view; do not clear the parameter
on unrelated state changes. Name-matching is dropped, because links are
emitted with both and ids are the ones that survive a rename — this is a
behavioural change and it is T014's to record.

## 10. Copy

- **"Disproved", never "False."** It describes what the party did. A disproved
  rumour is a good outcome and a fully-known one.
- **Knowledge is a ladder, not a verdict** — known / explored / visited for
  locations, unconfirmed / confirmed / disproved for rumours. Never outcome
  red or green. A child location may be more known than its parent; that is
  legal and is not a warning.
- **Deceased is presence, not valence** — muted ink and a strike through the
  name. Stance (friendly / neutral / hostile / unknown) is the only valenced
  thing in the NPC list.
- **Section headings are the application's voice** and take the sans, per
  design language §4. "Basic Information" is retired outright: every field on
  the form is basic information, so the heading says nothing. Headings name
  what is under them — *Objectives*, *Prep*, *Where this sits*, *What points
  here*.
- **Prompts are questions, not labels.** An unwritten section renders
  "+ What do they want?", not an empty box under the word "Personality".
- **Destructive copy names the object and the blast radius**, per Phase 14 §6 —
  including, for a parent location, how many places are inside it.

## 11. What was considered and not chosen

**Inline typeahead instead of the tray.** Fastest for someone who knows the
name, and directly against the constraint in §5: it makes recall a
precondition. Rejected as the primary mechanism; the filter box inside the
tray is what survives of it.

**Keeping the relation picker as a redesigned modal.** Cheapest option — fix
the grid, add a filter and counts. Rejected: it still covers the form it is
filling in, still fails Phase 14 §1 question 1, and still cannot show you the
field you are deciding about.

**A page for the rumour.** Rejected in §2.1. Revisit only if something starts
pointing *at* rumours.

**Emptying the directory rows** (the first draft of §1.3). Rejected by the
maintainer and correctly — see §1.3.

**Making a quest's *places inside* real locations.** They are notes about
places inside the quest's location ("Secret door", "Great hall"), written
during prep, mostly never visited. Promoting all of them would fill the
location tree with unvisited stubs. Free text plus a promote action keeps the
tree meaning something. Left as an open question in §13.

**Auto-completing a quest when its last objective is ticked.** Offered, never
assumed. A party can finish every objective and fail the quest.

## 12. What this phase does not do

- **No token changes.** If a surface here seems to need a colour no primitive
  provides, the colour schema is incomplete — a `TODO.md` item, not a hex. One
  such gap is known already; see §13.
- **No new permissions model.** Who may edit a shared record is unchanged.
- **No edit history.** §8. The pages state two facts and promise nothing more.
- **No batch actions on the three other entities.** That is T017, it wants the
  rumour selection mechanics generalised first, and T017 records that the
  rumour implementation has the worst write amplification in the app. Not this
  phase.
- **No stored-shape change for note dates.** §8.1.
- **No change to `/story`.** T014's story-route gap is real and is not this
  phase's to close; `15-3` unifies the four entity directories and records
  that `/story` still reads nothing.

## 13. Decisions this phase records

The drift log (`../03-drift-log.md`) is **retired** — findings now go to
`TODO.md` in the repository root. So these are numbered within the phase,
`D15.n`, rather than continuing the log's sequence. A finding that contradicts
one of them is a `TODO.md` entry, not an edit to this file.

- **D15.1 — A record is edited where it is read.** No edit surface exists.
  Four edit routes retire; `InlineEditor`'s save contract generalises (§1.1, §7).
- **D15.2 — Creating an entity asks for two fields.** The required pair is
  unchanged; the optional twenty leave the create surface (§1.2, §4).
- **D15.3 — A row expands to a bounded summary plus structure**, never to the
  whole record and never to a nested record card (§1.3, §3).
- **D15.4 — Quest and location become routes.** `/quests/:questId`,
  `/locations/:locationId`. A quest was previously unlinkable (§2.2).
- **D15.5 — The rumour stays in its list, deliberately.** Nothing points at it
  and its operations act on a selection (§2.1).
- **D15.6 — One attach tray, browse-first.** Typing is never the price of
  attaching. Three affordances and two vocabularies retire (§5).
- **D15.7 — `importantNPCs` is deleted** in favour of `relatedNPCIds`. Two
  fields for one relationship, both rendered, is why Thorin and Smaug appear
  twice on the quest card today. Maintainer's decision.
- **D15.8 — Every location traversal carries a visited set and a depth cap**,
  and reparenting refuses cycles. The guard ships with the feature (§6.3).
- **D15.9 — Features and children are different things**, bridged by a promote
  action, in both locations and quests (§6.4).
- **D15.10 — The UI promises only the attribution that exists**: created-by and
  last-modified-by, plus per-note credit. Per-field history waits for T005 (§8).
- **D15.11 — Addressable expansion reuses `?highlight=`** and unifies its four
  existing consumers rather than adding a parameter (§9).
- **D15.12 — Quick add is a dialog, and this is Phase 14 §1 agreeing, not an
  exception.** On a phone it is a sheet; the create routes remain as a second
  mount of one component (§4).

### Two items to file in `TODO.md` before `15-1` starts

1. **No accent pair is authored for the band surface.** Colour schema §5.2
   solves `accent.*` against page, card and sunken only. Every page in this
   phase has a band header carrying a status chip, and light `#8D4F00` on band
   `#26211C` measures ~1.9:1. Until the schema answers it, band chips take the
   neutral band treatment — which is what the visual reference shows. Four
   surfaces hit this gap, so it wants answering at the source.
2. **The drift log's retirement is not reflected in three documents.** Both
   handoff READMEs are corrected in `15-0`; `colour-schema.md` §9's read-only
   table still lists `plan/03-drift-log.md` as "yes — append only", and that
   file may not be edited by an implementation PR. It needs the maintainer's
   hand, alongside the existing T010/T011 schema doc debt.

## 14. References

Design language §1 (returning-user product; written by players, not published
to them), §2 (ornament recedes as frequency rises; nothing encoded by colour
alone), §4 (serif is the campaign's voice — entity names, descriptions,
in-world text; sans is the application's — labels, headings, metadata), §5
(surface hierarchy; rules inside cards, not a box per row), §7 (identity
marks, always with a label), §8 (the row is the unit; a row states its type
once; designed empty and loading states), §9 (motion confirms a change and
does nothing else), §11 (attribution is part of the identity), §12
(tie-breakers — especially 3, "is this region empty or under-designed", and 4,
"is this fact already encoded").

Colour schema §5.1 (surfaces), §5.2 (`accent.*`, `field.*`, `danger.*`), §5.3
(entity palette, for identity marks), §5.5 (`feedback.*` for save state,
`knowledge.*` for the ladders, `disposition.*` for stance, `outcome.*` for
concluded quests only).

Phase 14 `00-surface-routing.md` §1 (the dialog rule, which §4 and §5 obey),
§6 (the dialog diet, which quick add follows).

`TODO.md` T001, T005, T006, T014, T015, T016, T017, T023, T033, T038 — the
entries this phase touches, resolves or must not break.
