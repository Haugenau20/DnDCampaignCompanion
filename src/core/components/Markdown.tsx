// src/core/components/Markdown.tsx
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import clsx from 'clsx';

export interface MarkdownProps {
  /** Raw CommonMark source, as the player typed it into a textarea. */
  content: string;
  /**
   * Applied to the wrapper. Callers pass their own prose context — usually
   * `reader-prose` plus a measure cap — rather than this component inventing a
   * second typographic system beside it (handoff 09-0, Do 4).
   */
  className?: string;
}

/**
 * Prepare stored content for the parser.
 *
 * One transformation only, and it predates markdown: some stored bodies
 * contain literal backslash-n escape sequences rather than real newlines.
 * Both `ChapterReader.toParagraphs` and `BookViewer.formatContent` fixed this
 * independently and both comments record it as a real bug, so it survives the
 * move to a parser rather than being dropped along with them.
 */
function normalizeSource(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

/**
 * The one place the product turns markdown into elements.
 *
 * D45: full CommonMark with raw HTML disabled **at the parser**. That is a
 * property of this file rather than a habit at four call sites — which is the
 * whole reason the component exists. `react-markdown` emits React elements and
 * never an HTML string, so there is no `dangerouslySetInnerHTML` anywhere in
 * the path and enabling raw HTML would take *adding* a plugin (`rehype-raw`),
 * not forgetting to configure one. A parser that cannot produce an HTML node
 * cannot be talked into producing one.
 *
 * No `remark-gfm`. D45 says CommonMark; tables, strikethrough and autolinks
 * are GFM extensions, and the handoff's "do not extend markdown to anything
 * D45 does not name" applies to the parser as much as to the toolbar.
 *
 * `remark-breaks` is the one extension, and it is a compatibility decision
 * rather than a feature. Every chapter written before Phase 9 separates its
 * paragraphs with a single newline — one Enter press in a textarea, which
 * `toParagraphs` rendered as a paragraph. CommonMark reads that as a soft
 * break and collapses it, so strict parsing would reflow every existing
 * chapter into one wall of text (measured, not assumed). `remark-breaks` maps
 * the soft break to a real line break *inside* the paragraph, which leaves
 * block parsing alone: a two-line pull quote is still one blockquote, and a
 * list written on consecutive lines is still one list. Rewriting newlines into
 * paragraph breaks before parsing would have matched the old spacing exactly
 * and broken both.
 */
const Markdown: React.FC<MarkdownProps> = ({ content, className }) => {
  const source = useMemo(() => normalizeSource(content), [content]);

  return (
    <div className={clsx('markdown-body', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          // A campaign record is shared, so every link leaves with the
          // referrer and the opener detached. `react-markdown`'s default URL
          // transform already drops unsafe protocols before this runs.
          a: ({ children, ...props }) => (
            <a {...props} rel="noopener noreferrer" target="_blank">
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
