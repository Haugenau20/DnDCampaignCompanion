# PR 6.4 — Quest and rumour status

Phase 6 · fourth PR · closes the phase

Status is the one hue in the app that is not the accent and not an entity
(design language §3). Quests and rumours are where it lives.

## Scope

- `src/features/campaign-entities/quests/components/QuestDirectory.tsx`
- `src/features/campaign-entities/rumors/components/RumorDirectory.tsx`
- `src/features/campaign-entities/rumors/components/RumorBatchActions.tsx`
- `src/core/themes/css/components.css`

## Do

1. **Consume `status.*`** — `active`, `completed`, `failed`, `unknown`,
   `general`, on `status.on`. No local colour for state anywhere in these
   components.
2. **Status is stated in text**, always. The hue is a scanning aid on top of a
   word.
3. **One status treatment** shared by both directories: same shape, same
   placement in the row, same weight. A quest's "completed" and a rumour's
   "confirmed" should look like the same kind of fact.
4. **Batch selection** uses `surface.*.selected` from the row's own surface —
   not the accent, not a status hue. Selection is feedback, not state.

## Do not

- Do not let `status.failed` and the accent diverge by a hair. In 3a they are
  the same value (`#8C1D1D`) on purpose; if that reads as ambiguous, the fix
  is a drift-log entry and a value change, not a local override.
- Do not encode status by row background. It puts the hue behind text you have
  to read (§2, "ornament recedes as frequency rises").

## Gates

- Every status hue at AA against the surface its text sits on, both themes.
- Grep clean: no hard-coded green, amber or red in either directory.
- A colour-blind pass: the directories remain fully readable with hue removed.
- Screenshot: quests in all four states, rumours in all states, batch
  selection active.

## References

Design language §3 (one status hue), §2 (nothing encoded by colour alone),
D10 (contrast per pair).
