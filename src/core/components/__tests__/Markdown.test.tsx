// src/core/components/__tests__/Markdown.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { flushLazy } from '@/test-utils/flush-lazy';
import Markdown from '../Markdown';

/**
 * Render and resolve the parser's Suspense boundary.
 *
 * The parser sits behind a dynamic import, so the first mount in a file
 * suspends for a microtask. Two things follow, and the second one is the
 * important one:
 *
 * 1. `findBy*` is the wrong tool here — its polling does not wrap the lazy
 *    resolution, so it times out. Flushing inside `act` does.
 * 2. **A suspended boundary renders nothing, so any test that only asserts
 *    absence would pass vacuously.** That is fatal for the attack tests below:
 *    "there is no `<script>` element" is trivially true of an empty tree. So
 *    every test goes through this helper, and every attack test also asserts
 *    that the surrounding prose *did* render — proof that the parser ran and
 *    declined to emit the markup, rather than never having run at all.
 */
async function renderMarkdown(content: string, className?: string) {
  const utils = render(<Markdown content={content} className={className} />);
  await flushLazy();
  return utils;
}

/**
 * The security half of these tests is written as an attack, not as a
 * formatting case (handoff 09-0). D45 requires raw HTML to be disabled *at the
 * parser* rather than stripped afterwards, so each assertion is that the
 * dangerous element never reaches the DOM at all — not that it was neutered on
 * the way out.
 */
describe('Markdown — raw HTML is off at the parser', () => {
  it('does not put a script element in the DOM', async () => {
    const { container } = await renderMarkdown(
      'Before\n\n<script>window.pwned = true;</script>\n\nAfter'
    );

    // Proof the parser ran at all, so the absence below means something.
    expect(container.querySelector('p')).toHaveTextContent('Before');
    expect(container.querySelector('script')).toBeNull();
    expect((window as unknown as Record<string, unknown>).pwned).toBeUndefined();
  });

  it('does not put an img element in the DOM for an onerror payload', async () => {
    const { container } = await renderMarkdown(
      'A line.\n\n<img src=x onerror="window.pwned = true">'
    );

    expect(container.querySelector('p')).toHaveTextContent('A line.');
    expect(container.querySelector('img')).toBeNull();
  });

  it('does not put an iframe element in the DOM', async () => {
    const { container } = await renderMarkdown(
      'A line.\n\n<iframe src="https://example.com"></iframe>'
    );

    expect(container.querySelector('p')).toHaveTextContent('A line.');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('does not honour an inline event handler smuggled into a paragraph', async () => {
    const { container } = await renderMarkdown(
      'A sentence <b onmouseover="window.pwned = true">with markup</b> inside it.'
    );

    // The text survives as text; the element and its handler do not.
    expect(container.textContent).toContain('with markup');
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('[onmouseover]')).toBeNull();
  });
});

describe('Markdown — the marks the design needs', () => {
  it('renders bold', async () => {
    const { container } = await renderMarkdown('a **bold phrase** here');
    expect(container.querySelector('strong')).toHaveTextContent('bold phrase');
  });

  it('renders italic', async () => {
    const { container } = await renderMarkdown('a *quiet aside* here');
    expect(container.querySelector('em')).toHaveTextContent('quiet aside');
  });

  it('renders a blockquote', async () => {
    const { container } = await renderMarkdown('> They come from the fruit.');
    expect(container.querySelector('blockquote')).toHaveTextContent('They come from the fruit.');
  });

  it('renders a multi-line blockquote as one blockquote', async () => {
    const { container } = await renderMarkdown('> They come from the fruit.\n> — Erky Timbers');
    expect(container.querySelectorAll('blockquote')).toHaveLength(1);
  });

  it('renders an unordered list', async () => {
    const { container } = await renderMarkdown('- one\n- two');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
  });

  it('renders an ordered list', async () => {
    const { container } = await renderMarkdown('1. one\n2. two');
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('renders headings at h2 and h3', async () => {
    await renderMarkdown('## Second level\n\n### Third level');
    expect(screen.getByRole('heading', { level: 2, name: 'Second level' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Third level' })).toBeInTheDocument();
  });

  it('renders inline code', async () => {
    const { container } = await renderMarkdown('a `literal` here');
    expect(container.querySelector('code')).toHaveTextContent('literal');
  });
});

describe('Markdown — links', () => {
  it('renders a link with rel="noopener noreferrer"', async () => {
    await renderMarkdown('[the wiki](https://example.com/wiki)');

    const link = screen.getByRole('link', { name: 'the wiki' });
    expect(link).toHaveAttribute('href', 'https://example.com/wiki');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('does not emit a javascript: href', async () => {
    // eslint-disable-next-line no-script-url
    const { container } = await renderMarkdown('[click me](javascript:window.pwned=true)');

    expect(container.textContent).toContain('click me');
    Array.from(container.querySelectorAll('a')).forEach((anchor) => {
      expect(anchor.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
    });
  });
});

describe('Markdown — plain text, which is what every stored chapter is today', () => {
  it('renders a plain sentence as a paragraph', async () => {
    const { container } = await renderMarkdown('We came back up the well at dawn.');

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent('We came back up the well at dawn.');
  });

  it('renders nothing for an empty body without throwing', async () => {
    const { container } = await renderMarkdown('');
    expect(container.querySelector('p')).toBeNull();
  });

  it('does not emit empty paragraph nodes for runs of blank lines', async () => {
    const { container } = await renderMarkdown('First.\n\n\n\nSecond.');

    const paragraphs = Array.from(container.querySelectorAll('p'));
    expect(paragraphs).toHaveLength(2);
    paragraphs.forEach((paragraph) => {
      expect(paragraph.textContent?.trim()).not.toBe('');
    });
  });

  it('renders a single newline as a line break, not as collapsed whitespace', async () => {
    // Every chapter written before Phase 9 separates its paragraphs with one
    // newline, because that is what one Enter press in a textarea produces and
    // what `toParagraphs` rendered as a paragraph. Strict CommonMark treats it
    // as a soft break and collapses it, which turns those chapters into a
    // single wall of text — measured, then decided against (D83).
    const { container } = await renderMarkdown(
      'Paragraph one.\nParagraph two.\nParagraph three.'
    );

    expect(container.querySelectorAll('br')).toHaveLength(2);
    expect(container.textContent).toContain('Paragraph one.');
    expect(container.textContent).toContain('Paragraph three.');
  });

  it('still separates blank-line-delimited prose into real paragraphs', async () => {
    const { container } = await renderMarkdown('Paragraph one.\n\nParagraph two.');
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('does not let line breaks reach inside a block construct', async () => {
    // The reason `remark-breaks` was chosen over rewriting newlines into
    // paragraph breaks: block structure still parses as CommonMark, so 4b's
    // two-line pull quote is one blockquote.
    const { container } = await renderMarkdown('- one\n- two\n- three');

    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelectorAll('ul li')).toHaveLength(3);
    expect(container.querySelectorAll('ul br')).toHaveLength(0);
  });

  it('turns literal \\n escape sequences into real breaks', async () => {
    // Stored content really does contain these — `toParagraphs` and
    // `formatContent` both fixed it, and both comments said so.
    const { container } = await renderMarkdown('First.\\n\\nSecond.');

    expect(container.textContent).not.toContain('\\n');
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });
});

describe('Markdown — the container', () => {
  it('passes its className through so a caller can keep its measure', async () => {
    const { container } = await renderMarkdown('Text.', 'reader-prose');
    expect(container.firstElementChild).toHaveClass('reader-prose');
  });

  it('always carries markdown-body, which is what paints the block elements', async () => {
    // Tailwind's preflight strips margins from p, list markers from ul/ol and
    // every default from blockquote. The typographic voice comes from the
    // caller's context (`reader-prose`); the structure has to come from the
    // component, or a rendered list has no bullets wherever it appears.
    const { container } = await renderMarkdown('Text.');
    expect(container.firstElementChild).toHaveClass('markdown-body');
  });

  it('keeps markdown-body when a caller also passes a className', async () => {
    const { container } = await renderMarkdown('Text.', 'reader-prose');
    expect(container.firstElementChild).toHaveClass('markdown-body', 'reader-prose');
  });
});
