# PR 9.1 — The prose surfaces adopt it

Phase 9 · second PR · depends on 9.0

Every place the product renders a body of prose goes through `Markdown`. Narrow
and mechanical, which is why it is separate from the decision that precedes it
and the authoring that follows.

Measured: there are **two** prose reading surfaces, not the four the rollout
implies.

| surface | renders | today |
|---|---|---|
| `ChapterReader` | a chapter body | `toParagraphs()` — splits on `\n`, drops blank lines |
| `BookViewer` | the saga / story body | `formatContent()` then a 250-word paginator |

`NotePage` is **not** one: it mounts `NoteEditor` directly, so a note is only
ever a textarea. Whatever `9.0` decided about notes (its Do, 5) is implemented
here, and if the decision was "notes render markdown", the surface it renders on
has to be named — because there isn't one yet.

## Scope

- `features/storytelling/stories/components/ChapterReader.tsx`
- `features/storytelling/stories/components/BookViewer.tsx`
- `features/collaboration/notes/components/NoteCard.tsx` — only if 9.0 said so
- the matching test files

## Do

1. **`ChapterReader` renders through `Markdown`.** Its `toParagraphs` helper
   goes, but its two behaviours must not: literal `\n` escape sequences become
   real newlines, and blank lines do not become empty `<p>` nodes carrying a
   margin and cluttering the accessibility tree. Both are documented in the
   function's own comment and both were bugs once. Assert them after the swap.
2. **`BookViewer` renders through `Markdown`** — and this is the interesting
   one, because **its paginator splits on words**. `formatContent(content)`
   then `.split(' ')` in 250-word slices. Markdown does not survive being cut
   at an arbitrary word: a page boundary can land inside `**a bold phrase**`
   and produce two pages of literal asterisks.
   Two honest options, and the PR must pick one and say why:
   - Paginate on **block boundaries** — parse first, then fill pages with whole
     paragraphs/blockquotes until the page is full. Keeps the page-turning
     presentation, which is a deliberate decision (see `09-3`, R-entry), and
     changes where pages break.
   - Render the saga as **one scrolling column**, the way `ChapterReader`
     already does, and retire the paginator. This is a *design* change and
     contradicts a decision already made — it needs the owner's agreement
     before it is built, not after.
   Do not split the difference by rendering markdown inside a word-sliced page.
   That is the one option that is definitely wrong.
3. **Keep the measure.** `ChapterReader` already caps at `max-w-[68ch]` and
   wears `.reader-prose`. A4 asks for 68–72 characters and it is already there;
   do not re-derive it, and do not let the rendered elements escape the
   container that enforces it.
4. **Nothing outside a reading surface gains a parser.** A directory row, a
   roster field and an NPC page note stay plain text (D45 names three fields,
   not every field).

## Do not

- Do not restyle the reader. `413259e` rebuilt it deliberately — serif prose at
  a ~68ch measure, sans chrome, no book ornament, one footer row carrying
  position. This PR changes what the body text is *parsed by*, not what the
  page looks like.
- Do not change `storyProgress` or the reading-position arithmetic. The
  completion threshold of 98% and the percentage-not-page-number storage are
  settled; a markdown swap that also moves the progress model is two PRs.
- Do not add a "preview" toggle. Authoring is `09-2`'s surface.

## Gates

- Every existing chapter still reads identically. This is the regression that
  matters: all stored content is plain text today, so a rendered chapter must
  be indistinguishable from the current output. Screenshot before and after.
- The two `toParagraphs` behaviours survive, asserted: literal `\n`, and no
  empty paragraph nodes.
- If `BookViewer` keeps pagination: a test that a bold phrase spanning a page
  boundary renders as bold on both pages, or is not split at all.
- No parser reaches a row: `grep` for `Markdown` under `*Directory*`,
  `Roster`, `*Card*` returns nothing except whatever 9.0 explicitly decided.
- The story suites stay green; counts may rise.
- Empty campaign: a story with no chapters, and a chapter with an empty body,
  both still render their designed empty states rather than a parser error.

## References

`09-0` for the component; D45; `413259e` for what the reader already is;
design language §4, §8.
