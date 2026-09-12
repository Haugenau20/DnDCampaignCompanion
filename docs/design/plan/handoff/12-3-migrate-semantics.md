# PR 12.3 — Migrate consumers and delete `status.*`

Phase 12 · third PR · the semantic fix

This is the PR that stops the application claiming that visiting a place is a
victory and that a disproven rumour is a failure.

## Read-only, in every PR of this phase

`../../design/colour-schema.md`, `colour-schema.json`, `design-language.md`,
`01-token-model.md`, `06-colour-schema-rollout.md` and every
`handoff/12-*.md` are **read-only**. A handoff that is wrong is reported, not
rewritten. `../03-drift-log.md` is append-only and is where findings go.
Schema §9 has the procedure.

## Scope

- `src/core/themes/css/components.css`
- `src/features/campaign-entities/quests/components/QuestDirectory.tsx`
- `src/features/campaign-entities/rumors/components/RumorDirectory.tsx`
- `src/features/campaign-entities/locations/` — the directory and its rows
- `src/features/campaign-entities/npcs/` — the directory and its rows
- `src/core/themes/token-types.ts`, `definitions/`, `derive/`

## Do

1. **Map every domain state per schema §3.** That table is the specification;
   it is short, and it is the whole design decision. Notably: quest *active*
   takes the accent rather than a status hue, and both rumours and locations
   take the knowledge ladder rather than the outcome pair.
2. **Progress and bars.** Active fills in `accent`, completed in
   `outcome.succeeded`, failed in `outcome.failed.fill`. Text labels use
   `outcome.failed.ink`.
3. **NPC presence loses its hues.** Alive is `surface.*.on`; deceased is
   `surface.*.onMuted`; missing is `knowledge.1`. The default state of
   anything needs no encoding at all.
4. **Delete `status.*`** and every class that reads it —
   `.status-*`, `.npc-status-*`, `.location-status-*`, `.rumor-status-*`.
5. **Delete the pre-pair-model tokens** marked "Retired · 12-3" in schema §5.4,
   with their consumers:
   - `color.primary`, `color.secondary`, `color.accent` — consumers move to
     the accent role. Three names for one value is why the audit found ten jobs
     on one red.
   - `state.hoverLight`, `state.hoverMedium`, `state.selected` — consumers
     move to their own surface's `hover` and `selected`. A global hover grey
     is precisely what token model §2 says cannot exist once surfaces carry
     their own feedback.

   `color.emphasis` and `color.heading` stay: they are real roles, and §5.4
   gives them sources.

## Do not

- Do not leave a compatibility alias mapping `status.completed` to
  `outcome.succeeded`. The alias is the defect: it is what made the wrong
  token reachable. Delete, and let the compiler find the consumers.
- Do not keep `color.primary` as a deprecated synonym for the accent. Nothing
  is using the site during this phase; there is no audience for a shim.
- Do not let a location or a rumour touch an `outcome` token, or a quest
  outcome touch `knowledge`. If a state seems to need both, it is two facts
  and the row should state one of them (design language §8).
- Do not encode state by row background. It puts hue behind text you have to
  read on the surface you scan most.
- Do not add an `unknown` hue back. Genuinely-uncertain states are
  `knowledge.1`, which is the bottom of the ladder and already means this.

## Gates

- `grep -r "status-"` clean across `src/`, and `color-primary`,
  `color-secondary`, `color-accent`, `state-hover` and `state-selected`
  likewise.
- `colour-schema.md` and `colour-schema.json` unmodified in the diff.
- The knowledge ladder is **monotonic in contrast** against its ground, in
  ladder order, in both modes. A ladder that is not ordered is not a ladder.
- Colour-blind pass: quests, locations, rumours and NPCs fully readable with
  hue removed. Expect failure here until `12-4` lands; record it rather than
  working around it with a colour change.
- Screenshots: quests in all states, locations in all three knowledge states,
  rumours in all states, NPCs alive/deceased/missing — both modes.
- Each route still correct with an empty campaign.

## References

Schema §3 (the mapping table, and the bug it fixes). Design language §2
(nothing encoded by colour alone), §8 (a row states its type once), §12.4 (if a
fact is already encoded, delete one encoding). Record D25 and D27.
