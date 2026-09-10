// src/core/components/MarkdownRenderer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

export interface MarkdownRendererProps {
  /** Normalised CommonMark source. `Markdown` has already prepared this. */
  source: string;
}

/**
 * The parser itself, in its own module so it lands in its own chunk.
 *
 * `Markdown` reaches this through `React.lazy`, which is the only reason the
 * split exists as a file boundary rather than a dynamic import inside one
 * component. Everything about *safety* still lives here, because this is where
 * the parser is configured:
 *
 * D45 requires full CommonMark with raw HTML disabled **at the parser**.
 * `react-markdown` emits React elements and never an HTML string, so there is
 * no `dangerouslySetInnerHTML` in the path at all, and enabling raw HTML would
 * mean *adding* `rehype-raw` — a thing done on purpose, not a flag forgotten.
 * A parser that cannot produce an HTML node cannot be talked into producing
 * one.
 *
 * No `remark-gfm`: D45 says CommonMark, and tables, strikethrough and
 * autolinks are GFM extensions. "Do not extend markdown to anything D45 does
 * not name" applies to the parser as much as to the toolbar.
 *
 * `remark-breaks` is the one extension and it is a compatibility decision
 * rather than a feature — see D83. Every chapter written before Phase 9
 * separates its paragraphs with a single newline, which CommonMark reads as a
 * soft break and collapses; measured, that turned three lines into one
 * paragraph with no breaks at all. `remark-breaks` maps the soft break to a
 * real line break *inside* the paragraph, so block parsing stays CommonMark
 * and 4b's two-line pull quote is still one blockquote.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ source }) => (
  <ReactMarkdown
    remarkPlugins={[remarkBreaks]}
    components={{
      // A campaign record is shared, so every link leaves with the referrer
      // and the opener detached. `react-markdown`'s default URL transform
      // already drops unsafe protocols before this runs.
      a: ({ children, ...props }) => (
        <a {...props} rel="noopener noreferrer" target="_blank">
          {children}
        </a>
      ),
    }}
  >
    {source}
  </ReactMarkdown>
);

export default MarkdownRenderer;
