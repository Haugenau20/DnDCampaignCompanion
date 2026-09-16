// src/core/components/Markdown.tsx
import React, { Suspense, lazy, useMemo } from 'react';
import clsx from 'clsx';

/**
 * The parser is behind a dynamic import, so `react-markdown` and its
 * unified/remark/micromark tree (67 packages, +43.1 kB gzipped) land in their
 * own chunk instead of in `main.js`.
 *
 * The split has to sit here rather than at the route, and that is a
 * consequence of the architecture rather than a preference: `ChapterReader`
 * and `BookViewer` are exported from `features/storytelling`'s barrel, and
 * `HomePage`, `SearchContext` and `CampaignStats` all import from that barrel,
 * so anything the barrel can reach is in the initial graph no matter how the
 * routes are loaded. A dynamic import is split by webpack regardless of who
 * imports the module holding it, which is what makes it the one placement that
 * actually works here.
 */
const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

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
 * independently and both comments recorded it as a real bug, so it survives
 * the move to a parser rather than being dropped along with them.
 */
function normalizeSource(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

/**
 * The one place the product turns markdown into elements.
 *
 * Every surface that renders prose goes through here, so "raw HTML is off" is
 * a property of one file rather than a habit at four call sites. The parser
 * configuration that guarantees it lives in `MarkdownRenderer`, one dynamic
 * import away.
 *
 * The Suspense fallback is deliberately **nothing**. A fallback that stood in
 * for the prose would either shift the layout when the real text replaced it,
 * or — if it rendered the raw source — flash literal `**` at the reader. The
 * chunk is a same-origin request that starts when the component mounts, while
 * the body it renders is still arriving from Firestore, so in practice the
 * parser is ready before the content is.
 */
const Markdown: React.FC<MarkdownProps> = ({ content, className }) => {
  const source = useMemo(() => normalizeSource(content), [content]);

  return (
    <div className={clsx('markdown-body', className)}>
      <Suspense fallback={null}>
        <MarkdownRenderer source={source} />
      </Suspense>
    </div>
  );
};

export default Markdown;
