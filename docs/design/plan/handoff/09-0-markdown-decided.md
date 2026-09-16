# PR 9.0 — Markdown, decided

Phase 9 · runs first · nothing else in the phase can start without it

`04-rollout.md` says Phase 9 "carries a dependency the visual work cannot fake:
full CommonMark with raw HTML disabled at the parser (D45) ... Without it the
pull quote and the emphasis in 4b cannot exist in the data. Renderer choice and
write-time vs read-time is Q10, and it is the first PR of the phase."

That is still true, and it is the **only** part of Phase 9's description that
survived measurement intact. See `09-3` for what the rest turned into.

Measured against the tree before this was written:

- **No markdown dependency exists.** Not `react-markdown`, not `remark`, not
  `marked`, not `dompurify`, not a sanitiser of any kind. `package.json` has
  nothing in the family. This is greenfield, which is why it gets its own PR.
- **React 18.2 on `react-scripts` 5.0.1.** That constrains the choice: the
  build is CRA's webpack 5, and a renderer shipping ESM-only or requiring a
  loader change is a fight with the toolchain rather than a design decision.
- **Three body fields, two reading surfaces, and one of them does not exist.**
  D45 names chapter bodies, saga/story descriptions and notes. Chapter bodies
  are read in `ChapterReader`, saga descriptions in `BookViewer` — and **notes
  have no reading surface at all**: `NotePage` mounts `NoteEditor` directly, so
  a note is only ever seen as an editable textarea, a truncated `NoteCard`
  preview, or a row on the NPC page. Decide what that means before writing a
  renderer for it (see Do, 5).

## Scope

- `package.json` (one dependency, plus its types if separate)
- `src/core/components/Markdown.tsx` (new) and its test
- `src/core/themes/css/components.css` — only if the rendered elements need
  paint that `.reader-prose` does not already give them

## Do

1. **Choose the renderer, and write the choice down** in `../03-drift-log.md`
   as the answer to Q10. Whatever you pick, the requirement is fixed: **full
   CommonMark, raw HTML disabled at the parser** (D45). "Disabled at the
   parser" is the phrase that matters — not stripped afterwards by a sanitiser,
   not escaped at render. A parser that never produces an HTML node cannot be
   talked into producing one.
2. **Decide write-time vs read-time and say why.** The two are not equivalent
   and the difference is a data decision, not a rendering one:
   - *Read-time* keeps Firestore holding exactly what the player typed, so the
     source is always recoverable and a renderer change is a deploy rather than
     a migration. It costs parse work on every render.
   - *Write-time* stores HTML, which is faster to read and **irreversible**: the
     markdown a player typed is gone, and a future renderer inherits whatever
     the old one produced. It also puts stored HTML in a database that
     `notes` and `chapters` both read, which is a much larger security surface
     than a parser flag.
   The plan does not prejudge this. Measure the parse cost against a real
   chapter before assuming read-time is too slow — the sample data has chapters
   of realistic length.
3. **One `Markdown` component, in `core/components/`.** Every surface that
   renders prose goes through it, so "raw HTML is off" is a property of one
   file rather than a habit at four call sites. It takes the source string and
   nothing else that changes its safety.
4. **Do not style it from scratch.** `.reader-prose` already exists and already
   sets the serif face, with a medieval variant. The rendered elements —
   `p`, `em`, `strong`, `blockquote`, `ul`, `ol`, `h2`, `h3`, `code` — should
   inherit that context, not introduce a second typographic system beside it.
5. **Settle where rendered markdown appears, and record it.** The obvious
   answer for chapters and sagas is "the reading surface". For notes it is
   genuinely open, because there is no note reader: rendering markdown in a
   `NoteCard` preview means a truncated row showing half a blockquote, and
   *not* rendering it means a note shows `**bold**` as four characters. Both
   are defensible; picking neither is not. This decision belongs here, and
   `09-1` implements whatever it says.

## Do not

- **Do not add a sanitiser to make an HTML-enabled parser safe.** That is the
  configuration D45 exists to forbid. If the parser can emit HTML, the
  sanitiser is now the only thing between a shared campaign record and stored
  XSS, and sanitisers are a moving target. Turn it off at the source.
- Do not add a rich-text editor. The authoring surface stays a plain textarea
  with a small toolbar, and that is `09-2`'s work. TipTap is on the roadmap in
  `deep-dive-feature-enhancements.md` and is a project, not a PR.
- Do not extend markdown to anything D45 does not name. A directory row must
  never need a parser — that is what keeps the highest-frequency surface cheap.
- Do not migrate existing content. Every chapter body in the database today is
  plain text, and plain text is valid CommonMark. Nothing needs converting.

## Gates

- A test asserts that raw HTML in the source does **not** reach the DOM as
  markup. Write it as an attack, not as a formatting case: a `<script>`, an
  `<img onerror=...>`, and an `<iframe>` in a chapter body, each asserted to
  render as text or not at all.
- Bold, italic, blockquote, lists, headings and links all render. Links get
  `rel="noopener noreferrer"` and are checked for `javascript:` hrefs.
- Plain text with no markdown renders exactly as it does today — this is the
  regression that matters, because every existing chapter is plain text.
  `ChapterReader`'s `toParagraphs` already handles literal `\n` escapes and
  drops blank lines; whatever replaces it must not regress that.
- Bundle: record the delta in the PR body. `main.js` is ~300 kB gzipped; a
  renderer that adds more than about 10% of that needs a sentence justifying
  it against the alternatives you rejected.
- `npm run build` — a markdown library is exactly the kind of dependency that
  passes `tsc` and jest and then fails webpack. The four-resolver table in
  `CLAUDE.md` applies.
- Suite green; the count grows by the new tests and nothing else moves.

## References

A4 in `../05-archetypes.md`; D45; Q10 in `../03-drift-log.md`; design language
§4 (serif is the campaign's voice) and §14 (not a dashboard).
