# Token model

The rules that keep the visual work consistent and the shared package
extractable. This is the document to re-read when a change feels like it needs
a new token.

This is the *how*. The *why* — colour identity, principles, look and feel —
lives in `../design/design-language.md`.

---

## 1. Why the model changes at all

Today's tokens name *the colour of a specific thing*: `--button-primary-bg`,
`--npc-card-deceased`, `--journal-quest-item-hover`. About 95 of them, applied
by a positional map.

What none of them can express is **a surface together with the ink that goes
on it**. The consequence is already visible in the codebase: when the header
stopped being a blue field, no token could say "text on the chrome surface",
so it was patched per theme by hand. A dark chrome multiplies that patch
across the nav items, the search trigger, the keyboard hint and the avatar
chip.

Three defects found while recreating the current UI all share one shape: a
valid token, in a valid slot, wrong in *relation* to what sits behind it. A
model of independent colour values cannot prevent that class of bug. A model
of pairs can.

## 2. Surfaces carry their foreground

A component never picks an ink colour. It picks a surface, and the ink comes
with it.

```
surface.chrome   → bg, on, on-muted, border
surface.page
surface.card
surface.sunken
surface.band      (the hero)
```

Rules:

- Every surface defines all four roles. No partial surfaces.
- `on-muted` is part of the pair, not a global grey. A muted ink that passes
  on `card` may fail on `sunken` — the pair is what makes that checkable.
- Contrast is verified **per pair, once**, not per usage. This is the property
  that makes the class of bug above unrepresentable.
- If a component needs an ink the pair doesn't offer, the surface is
  under-specified. Add the role to the surface; do not add a one-off token.

## 3. Surface owns paint, state owns feedback

- **Surface** classes own resting background, border and ink.
- **State** classes own hover, selected, focus, disabled. Nothing else.

A state class must never set a resting background. This is the rule Phase 0
enforces, and violating it is what flattened every list in the app.

Layer order is declared explicitly, surface before state, so precedence is
legible in source rather than a function of file order.

## 4. Naming derives from the token path

Variable names are produced from token paths mechanically. No hand-maintained
map, no positional lists.

```
surface.chrome.bg → --surface-chrome-bg
```

Consequences, all wanted: a token cannot exist without its variable, a
variable cannot exist without its token, and the set is enumerable — so it can
be checked against a manifest.

Ambiguous paths are rejected rather than resolved. Two paths must never
produce one name.

## 5. Every new token falls back to an existing one

**The rule that makes partial theme migration safe.** A theme that has not
been migrated must render exactly as it does today — never a missing surface,
never unstyled chrome.

So each new token resolves, in order:

1. the theme's own value, if migrated
2. the token it replaces, from today's set
3. a documented last resort

Corollary: adding a token is never a breaking change, and Phase 1 can be
screenshot-identical while introducing the whole new model. Dark and medieval
stay correct while unmigrated.

Fallbacks are removed only when every theme defines the token, as deliberate
cleanup — never opportunistically.

## 6. Two token shapes beyond the flat leaf

Today every token is a colour leaf. Two more shapes are needed, and both are
worth deciding once.

### Ordered collection — the entity palette

The sigils need N hues that are all legible against one ink. That is an
*ordered list*, not a record: an entity's mark is derived from its id, so
position matters and must be stable.

Requirements:

- Tuned per theme; every entry legible against the same ink.
- Stable ordering — appending is safe, reordering changes existing marks.
- Absorbs `--location-type-region` … `--location-type-poi`, which is this
  pattern already solved as eight ad-hoc flat tokens.

Open question for the package: index-suffixed variables, or one joined value?
It changes what a manifest can assert. Decide before extraction.

### Enum — ornament mode

Ornament is not a colour. It is a rule weight, a rule ink, a corner treatment,
an ornament strength.

```
rule.hairline / rule.emphasis
ornament.corner    → none | brackets
ornament.strength
```

This is what makes "tuned per theme" a *value* rather than a code path. It is
also why medieval is currently the only theme with any ornament at all:
ornament lives in hardcoded theme-conditional CSS with literal sizes and hex
inside data-URI SVGs, so adding it elsewhere means hand-writing another block.

Note this drags the largest un-validated theme-conditional path in the app
back inside the token system — a correctness win that happens to look like a
design change.

Validating an enum means checking the **value** is legal, not just that the
variable exists. That is a stronger guarantee than a spelling check, and it
needs saying out loud in the package spec.

## 7. What tokens must not be

- Not a colour named after one component (`--npc-card-deceased`). Name the
  role; let the component pick a surface.
- Not layout constants, unless they genuinely vary by theme. Ornament does, by
  definition. Padding does not.
- Not a second way to say something a pair already says. Every addition should
  reduce the count of theme-conditional rules, not grow it.

## 8. What this model still cannot catch

Worth knowing so it isn't mistaken for a guarantee.

A generated manifest proves every consumed variable **exists**. It cannot
prove the right one **wins** — the `.selectable-item` defect involved no
invalid variable, no missing token and no misspelling. Every naming invariant
held.

Precedence is a separate mechanism: the declared layer order in §3, plus a
lint that a state class never sets a resting background.

Contrast is a third. Because §2 makes pairs the unit, contrast becomes
computable from the token set alone — a real check the package could own,
rather than a review habit.
