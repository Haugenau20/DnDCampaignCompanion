# PR 12.3a — Campaign semantics, and `status.*` deleted

Phase 12 · fourth PR · the semantic fix

Depends on `12-2b`: `disposition.*` and `outcome.failed.on` are built there,
not here. This PR migrates consumers and deletes `status.*` — it adds no
tokens.

## Read-only, in every PR of this phase

`../../design/colour-schema.md`, `colour-schema.json`, `design-language.md`,
`01-token-model.md`, `06-colour-schema-rollout.md` and every
`handoff/12-*.md` are **read-only**. A handoff that is wrong is reported, not
rewritten. `../03-drift-log.md` is append-only and is where findings go.
Schema §9 has the procedure.

This is the PR that stops the application claiming that visiting a place is a
victory and that a disproven rumour is a failure. It covers the campaign's own
record only; the application's self-reporting is `12-3b`.

## This PR assumes `12-2b` has landed

`12-1` and `12-2` are merged; `12-2b` adds the `accent`, `feedback` and
`disposition` scales additively. **Do not start this PR before it.** Every
token named below exists only after `12-2b`, and the fixture assertions move
there, not here.

## Scope

- `src/core/themes/css/components.css` — the `.status-*` families
- `src/core/components/Roster.tsx` — the `STATUS_CLASS` map every directory
  routes through. Start here: it is the choke point, and the handoff that
  preceded this one missed it.
- `QuestDirectory` · `RumorDirectory` · `LocationDirectory` · `NPCDirectory` ·
  `NPCLegend` · `NPCDetailPage`
- `pages/OpenQuests`, `pages/CampaignStats`
- `storytelling/` — `ChapterList`, `BookViewer`, `ResumeBar` (via `.progress-bar*`)
- `src/core/themes/token-types.ts`, `derive/role-map.ts`, `derive/generate.ts`
- `src/core/themes/__tests__/token-values.baseline.json`,
  `token-manifest.test.ts` — the new tokens are enumerated

## Do

1. **Map every domain state per schema §3.** That table is the specification.
   Notably: quest *active* takes `accent.ink` rather than a status hue, and
   both rumours and locations take the knowledge ladder rather than the outcome
   pair. The ladder is **0-indexed** — `knowledge.0` is "known", the least
   knowledge, and contrast rises with the index.
2. **Progress and bars.** Active fills in `accent.fill`, completed in
   `outcome.succeeded`, failed in `outcome.failed.fill`. The word "Failed"
   uses `outcome.failed.ink`.
3. **NPC presence loses its hues.** Alive is `surface.*.on`; deceased is
   `surface.*.onMuted`; missing is `knowledge.0`.
4. **NPC relationship becomes `disposition.*`** — friendly, neutral, hostile,
   unknown. Schema §3 explains why this scale is valenced where presence is
   not.
5. **Delete `status.*`** and every class that reads it: `.status-*`,
   `.npc-status-*`, `.location-status-*`, `.rumor-status-*`,
   `.npc-relationship-*`. `status.on` becomes `outcome.failed.on`.
6. **Delete the comment at `LocationDirectory.tsx:60`** — "There is no failure
   state here, so `bg-status-failed` is never used." Someone noticed half of
   this bug and worked around it in prose. The fix removes the reason for the
   note.

## Do not

- Do not leave a compatibility alias mapping `status.completed` to
  `outcome.succeeded`. The alias is the defect: it is what made the wrong
  token reachable.
- Do not let a location or a rumour touch an `outcome` token, or a quest
  outcome touch `knowledge`.
- Do not touch the ten application-feedback consumers listed in `12-3b`. They
  read `status.*` too, so the compiler will point at them — resolve them
  against `feedback.*` in that PR, not this one.
- Do not encode state by row background.

## Gates

- The knowledge ladder is **monotonic in contrast** against its ground, in
  ladder order, in both modes.
- Screenshots: quests in all states, locations in all three knowledge states,
  rumours in all states, NPCs alive/deceased/missing and friendly/hostile —
  both modes.
- Colour-blind pass will **fail** until `12-5` lands. Record it; do not work
  around it with a colour change.
- Each route still correct with an empty campaign.
- `colour-schema.md` and `colour-schema.json` unmodified in the diff.

## References

Schema §3 (the mapping table and the bug it fixes), §5.4 (scales). Design
language §2, §8, §12.4. Record D25, D27 and D34.
