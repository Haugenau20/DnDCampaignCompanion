# PR 15.7 — Rumours are authored in their own rows

Phase 15 · eighth PR · depends on `15-2`

A rumour is seven fields, one of which is a paragraph, and it exists to be
confirmed, disproved or turned into a quest. Nothing in the campaign points at
one. Its two real operations already act on a selection in the list. So it
gets no page — it gets its row, and the round trip to `/rumors/edit/:id` to
change "unconfirmed" to "confirmed" stops existing.

This PR needs no route and depends on nothing but the tray. It can move earlier
in the phase if a small proof of the in-place model is wanted first.

Visual reference: `Authoring UI handover.dc.html` · `S8`.

## Scope

- `src/features/campaign-entities/rumors/components/RumorDirectory.tsx`
- `src/features/campaign-entities/rumors/components/RumorForm.tsx` — reused
  inside the row, or retired into it
- the matching test files

## Do

1. **A composer row, permanently at the top of the list.** Title it, press
   Add, and the new rumour's row expands in place with "what was heard"
   focused. No dialog, no navigation — there is no page to land on.
2. **The row expansion is the whole record**, not a summary: what was heard,
   heard from, who exactly, is it true, points at. This is the one entity
   where `00-entity-authoring.md` §1.3's bound does not apply, because there
   is no page holding the remainder.
3. **Keep the conditional source field.** "Who exactly" appears only after a
   source kind is chosen, and becomes an NPC picker when the kind is *An NPC*.
   That conditional already exists in `RumorForm` and is good; carry it over.
4. **"Heard from" is four buttons**, not a select. Four short options do not
   need a dropdown.
5. **Status is the knowledge ladder.** Unconfirmed → confirmed → disproved,
   changed in one click from the row. **A disproved rumour is fully known and
   is a good outcome** — it takes `knowledge.2` plus a strike through the
   title, never failure red. Colour schema §3 exists because of this exact
   case.
6. **"Disproved", not "False"** in every string. It describes what the party
   did, not a data value.
7. **Relations use `15-2`'s tray**, in place, replacing the flat `<select>` of
   every location in the campaign.
8. **One row open at a time**, and an open row **survives a filter or sort
   change without losing typed text**. This is the failure mode most likely to
   bite: the list re-renders underneath an editor. Test it explicitly.
9. **Edit in place**, per §7. Same save contract as everywhere else.
10. **Formatted dates**, via `15-3`'s helper.

## Do not

- **Do not touch `CombineRumorsDialog` or `ConvertToQuestDialog`.** Both stay
  dialogs: each acts on the entries selected on the page behind it, which
  answers Phase 14 §1 question 1 decisively. T038 records that each holds a
  nested scroll region and that capping the selection would remove the symptom
  without moving the surface — **that is not this PR's job**.
- **Do not touch `RumorBatchActions`.** T017 records it as the worst write
  amplification in the app: every selected rumour costs a profile read, a
  write, and a full re-query of the collection. Do not extend it, do not copy
  it, do not "improve" it here.
- Do not give the rumour a page or a route.
- Do not delete `/rumors/edit/:id`; `15-8` redirects it.
- Do not change the rumour summary bar or its legend. T008 asks whether an
  adjacent bar segment owes a rule that a row does not, and it is open.
- Do not add relations the rumour does not already have.

## Gates

- A rumour is creatable, readable, editable and resolvable without leaving
  `/rumors`.
- An open row survives filtering, sorting and a status change elsewhere in the
  list with its typed text intact.
- Confirming or disproving is one click, with the write contract from §7.
- Disproved renders as fully-known plus a strike; grep clean for outcome-red
  on any rumour status, and for the string "False" as a status label.
- Combine and convert still work, from the same selection, unchanged.
- At 390px and 320px: the expanded row is usable one-handed, 44px targets, no
  horizontal scroll.
- Empty campaign: the composer row and a designed empty state.

## References

`00-entity-authoring.md` §2.1, §1.3 (and its exception here), §7, §10.
Colour schema §3 (why valence is split from knowledge — the disproved rumour
is the worked example), §5.5 (`knowledge.*`), §6 (non-colour cues: the strike).
Design language §2 (nothing encoded by colour alone), §8. Phase 14 §1, §2
(both rumour dialogs correctly stay dialogs). `TODO.md` T008, T017, T038.
