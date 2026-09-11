# Design language

The source of truth for how the Campaign Companion looks and why. It sits
above any implementation plan: `plan/` describes a project and changes often,
this describes the product and should change rarely.

When the two disagree, this wins. When implementation hits a bump, the
principles here are what decide the trade — not the phase checklist.

- **How tokens express this:** `plan/01-token-model.md`
- **The current transition:** `plan/00-transition-plan.md`

---

## 1. What the product is, visually

A shared record, kept by players, reopened many times between sessions.

Two consequences that resolve most arguments before they start:

**It is a returning-user product, not an acquisition product.** Four people
who already signed in, coming back for the fiftieth time. Almost all "what
draws people in" design reasoning is about first impressions and strangers —
it does not apply here. Novelty decays; friction compounds. Ornament that
delights on visit one is noise on visit twenty.

**It is written by players, not published to them.** The content is theirs and
often unfinished. The design's job is to make an incomplete, collectively
written record feel like an artefact worth adding to — not to look like a
finished product about someone else's campaign.

So the design must feel *authored* without competing with the authoring.

## 2. Principles

Six. Each is a rule you can be held to, with the failure it prevents.

### Contrast lives in the chrome; calm lives in the content

Value contrast belongs in the frame — the chrome band, the hero, the footer.
The surfaces you *scan* every session stay quiet.

This is the single most useful principle in the document, and it was learned
the hard way: the first ornamented draft put five competing accents in the top
300px and read as cluttered, while the restrained draft read as flat. Neither
problem was the ornament — both were about *where* the richness sat.

**Not:** richness distributed evenly. Evenly-distributed richness is noise.

### Richness comes from shipped structure, never from user content

The page must feel complete on day one, with an empty campaign, before anyone
uploads anything. Uploads, plates and generated art are enhancements layered
onto something already good.

**Not:** a design whose atmosphere depends on content a user may never add.
That is a design that feels like nothing for most people, most of the time.

### Imagery serves recall, not decoration

Home answers "what do we collectively know, and what happened since we last
played". Imagery earns its place by helping someone *recognise* a person or
place at a glance. If it doesn't aid recognition, it is competing with the
text that does.

**Not:** atmosphere for its own sake behind data you need to read.

### One accent, earned by action

A single accent hue below the chrome, used for things you can act on: the
active filter, a row's action, progress. One status hue for state. That is
the budget.

If a new accent seems necessary, remove one first. If a region feels empty, it
is a layout problem — accents are not filler.

**Not:** hue as decoration, or a third accent because two felt insufficient.

### Ornament recedes as frequency rises

Rich treatment is affordable on surfaces you meet once per visit — the
chrome, the hero, a section head. It is expensive on surfaces you scan
repeatedly — rows, cells, lists.

**Not:** the same ornament density everywhere. Ornament on a dense list is
friction wearing a costume.

### Nothing is encoded by colour alone

Type, status and identity are always also stated in text or shape. A sigil's
hue is a recognition aid on top of a label, never a substitute for it.

**Not:** colour-only status. It fails for colourblind users, in dark themes,
and in print.

## 3. Colour identity

Described as **structure**, not a fixed palette — so it survives value tuning
and theme variants. Concrete values live in `colour-schema.md`, which is
generated from a hue contract and is the source of truth for every number.

The identity is a **value progression**, not a hue:

| Surface | Role | Character |
|---|---|---|
| Chrome | header, footer | Deep, near-neutral ink. The frame. |
| Band | hero, section starters | Dark, textured, holds the campaign identity |
| Page | the ground everything sits on | Warm off-white — paper, not screen |
| Card | content you read | Clean and light, the calmest surface |
| Sunken | secondary, tinted regions | Slightly recessed from card |

The warmth of the page against the neutrality of the chrome *is* the identity.
Get that relationship right and the palette can shift a long way without
losing the product's character.

Beyond surfaces, exactly four colour jobs (amended from three — D26):

- **One accent** — action, interactivity, and anything in progress. Deep,
  low-brightness, never neon. **Never red.** Red is reserved for failure and
  destruction, which is what keeps both of them readable.
- **One outcome pair** — succeeded and failed, and *only* things that
  concluded. This is the single place in the product where red/green valence
  is honest, and therefore the only place it is spent.
- **One knowledge ladder** — three steps of a single hue, for how much the
  party knows. Non-valenced by construction: colour says "how much", never
  "good or bad". A knowledge state must never borrow an outcome token; that
  mistake is what once painted a visited location green.
- **An entity palette** — 6–8 hues in a *single narrow band of lightness and
  chroma*, tuned per theme. Their job is to separate entities from each other
  while all sitting equally quiet against the same ink. Saturated jewel tones
  fail this: they separate beautifully and shout.

**Every theme keeps this structure**, and now cannot do otherwise: a theme
supplies lightness only, while hue and chroma are authored once for the whole
product (`colour-schema.md` §4). A theme changes values, warmth and ornament
strength — never the number of accents or the surface hierarchy. A theme that
needs a second accent is a signal the design is wrong, not the theme.

## 4. Type

Two families, with one durable rule that decides every future case:

- **Serif — the campaign's voice.** Titles, chapter and entity names, quoted
  in-world text, the numbers in stats. Anything that is *content of the
  world*.
- **Sans — the application's voice.** Navigation, labels, metadata, buttons,
  timestamps, authorship. Anything that is *chrome about the content*.

This is why the product reads as a record rather than a dashboard, and it
holds regardless of which families are chosen. When unsure which to use, ask
whether the words belong to the campaign or to the app.

Italic serif is reserved for in-world voice — descriptions, quotes,
atmosphere. It is never used for UI text.

Body copy has normal line height. Titles may be tight. A heading scale that
relies on weight alone is under-designed; use size and family together.

## 5. Surface hierarchy

Depth is expressed by **value and rule**, not by shadow. A card is lighter
than its page and separated by a hairline; it does not float.

Rules and hairlines separate rows *inside* a card rather than boxing each row.
Inset rules that stop short of the card edge read as one object with parts —
boxes read as many objects.

Corner treatment, rule weight and ornament strength are theme-level
expressions, not per-component decisions.

## 6. Imagery

- Every image is **a slot with a designed empty state**, and the empty state
  must look intentional. Most slots will be empty most of the time.
- Text over imagery always sits on a scrim strong enough to meet contrast
  independent of the image. An image must never be load-bearing for
  legibility.
- Imagery goes on low-frequency surfaces: the hero, a campaign header, an
  entity's own page. Not behind lists.
- Sources, when they arrive: shipped public-domain plates first, uploads
  second, generation last. Uploads and generation are enhancements — never the
  foundation.

## 7. Identity marks

A small deterministic mark per entity, derived from its id, so the same NPC or
location looks like itself everywhere it appears — lists, activity, quests,
notes.

This is the highest-leverage graphic in the product: it makes a long list
scannable rather than uniform, and it costs one function and a palette
instead of any art.

Marks are consistent, quiet, and always accompanied by a label. Their hue
comes from the entity palette (§3) and therefore stays inside the same
lightness band as every other mark.

## 8. Density and rhythm

The unit of the product is a **row you scan**, not a card you admire.

Rows are comfortable to read at length, with generous vertical rhythm and a
single line of metadata. A row states its type **once** — a coloured label and
a coloured mark saying the same thing is redundant encoding, and redundant
encoding is one of the most reliable sources of visual noise.

Empty and loading states are designed, not blank. An empty region is where a
returning user is most likely to feel the product is unfinished.

## 9. Motion

Restrained. This is a reference tool that gets opened, read and closed.

Transitions confirm that something changed — hover, selection, expansion.
Nothing animates on load, nothing loops, nothing draws attention to itself
after the first time. Motion is the fastest ornament to become annoying,
because it repeats.

## 10. Accessibility as identity

AA for text, 3:1 for non-text, treated as part of the design rather than a
compliance pass.

The pattern to watch, because it has already happened repeatedly here: a
legitimate colour, in a legitimate slot, wrong in *relation* to what sits
behind it. Warm greys that look right and measure 3.4:1. Small uppercase
accent type treated as though it were large. Muted ink authored for a light
ground, reused on a dark one.

Contrast is a property of **pairs**, which is why the token model makes pairs
the unit. Re-check after any value tuning: changing a value changes ratios.

## 11. Voice

Chrome copy is plain and short — the app does not perform. In-world text is
whatever the players wrote; the design frames it and never editorialises it.

Attribution matters: entries are credited to the character who wrote them.
That crediting is part of the visual identity, not a metadata afterthought —
it is what makes the record feel collectively authored.

## 12. Deciding when in doubt

The tie-breakers, in order. Most implementation bumps are answered here.

1. **Would this still be pleasant on the fiftieth visit?** If no, cut it.
2. **Does it help recognition, or is it atmosphere?** Recognition wins.
3. **Is this region empty, or is it under-designed?** Empty regions are layout
   problems. Do not fill them with ornament.
4. **Is this fact already encoded?** If yes, delete one encoding.
5. **Does this need a new accent?** Remove one first, then reconsider.
6. **How often is this surface scanned?** The more often, the quieter.
7. **Does it survive an empty campaign?** If it only looks good with rich
   content, it is not done.
8. **Is it a new theme-conditional rule?** Then the surface model is missing
   something — fix that instead.

## 13. Signals we got it wrong

Stated so they are recognisable rather than rationalised.

- Players stop noticing the hero — it became a banner to scroll past.
- Anyone describes the app as "busy", or squints at a list.
- A theme needs a second accent to look right.
- An empty campaign looks broken rather than new.
- A new page needs its own colours to fit in.
- The ornament is the first thing anyone mentions.

## 14. Not this

- Dashboard aesthetics: KPI tiles, dense charts, data for its own sake.
- Heavy skeuomorphism — literal leather, torn parchment edges, faux page curl.
  Warmth and ruling, not costume.
- Aggressive gradients, glow, or decorative drop shadows.
- Emoji as iconography.
- Stock fantasy art as background texture behind readable text.
- Colour-only status.
- Any element that exists to fill space.
