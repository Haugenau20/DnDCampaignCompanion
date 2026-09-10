// src/core/components/__tests__/Markdown.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import Markdown from '../Markdown';

/**
 * The security half of these tests is written as an attack, not as a
 * formatting case (handoff 09-0). D45 requires raw HTML to be disabled *at the
 * parser* rather than stripped afterwards, so each assertion is that the
 * dangerous element never reaches the DOM at all — not that it was neutered on
 * the way out.
 */
describe('Markdown — raw HTML is off at the parser', () => {
  it('does not put a script element in the DOM', () => {
    const { container } = render(
      <Markdown content={'Before\n\n<script>window.pwned = true;</script>\n\nAfter'} />
    );

    expect(container.querySelector('script')).toBeNull();
    expect((window as unknown as Record<string, unknown>).pwned).toBeUndefined();
  });

  it('does not put an img element in the DOM for an onerror payload', () => {
    const { container } = render(
      <Markdown content={'<img src=x onerror="window.pwned = true">'} />
    );

    expect(container.querySelector('img')).toBeNull();
  });

  it('does not put an iframe element in the DOM', () => {
    const { container } = render(
      <Markdown content={'<iframe src="https://example.com"></iframe>'} />
    );

    expect(container.querySelector('iframe')).toBeNull();
  });

  it('does not honour an inline event handler smuggled into a paragraph', () => {
    const { container } = render(
      <Markdown content={'A sentence <b onmouseover="window.pwned = true">with markup</b> inside it.'} />
    );

    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('[onmouseover]')).toBeNull();
  });
});

describe('Markdown — the marks the design needs', () => {
  it('renders bold', () => {
    const { container } = render(<Markdown content="a **bold phrase** here" />);
    expect(container.querySelector('strong')).toHaveTextContent('bold phrase');
  });

  it('renders italic', () => {
    const { container } = render(<Markdown content="a *quiet aside* here" />);
    expect(container.querySelector('em')).toHaveTextContent('quiet aside');
  });

  it('renders a blockquote', () => {
    const { container } = render(<Markdown content="> They come from the fruit." />);
    expect(container.querySelector('blockquote')).toHaveTextContent('They come from the fruit.');
  });

  it('renders a multi-line blockquote as one blockquote', () => {
    const { container } = render(
      <Markdown content={'> They come from the fruit.\n> — Erky Timbers'} />
    );

    expect(container.querySelectorAll('blockquote')).toHaveLength(1);
  });

  it('renders an unordered list', () => {
    const { container } = render(<Markdown content={'- one\n- two'} />);
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
  });

  it('renders an ordered list', () => {
    const { container } = render(<Markdown content={'1. one\n2. two'} />);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('renders headings at h2 and h3', () => {
    render(<Markdown content={'## Second level\n\n### Third level'} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Second level' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Third level' })).toBeInTheDocument();
  });

  it('renders inline code', () => {
    const { container } = render(<Markdown content="a `literal` here" />);
    expect(container.querySelector('code')).toHaveTextContent('literal');
  });
});

describe('Markdown — links', () => {
  it('renders a link with rel="noopener noreferrer"', () => {
    render(<Markdown content="[the wiki](https://example.com/wiki)" />);

    const link = screen.getByRole('link', { name: 'the wiki' });
    expect(link).toHaveAttribute('href', 'https://example.com/wiki');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('does not emit a javascript: href', () => {
    const { container } = render(
      // eslint-disable-next-line no-script-url
      <Markdown content="[click me](javascript:window.pwned=true)" />
    );

    const anchors = Array.from(container.querySelectorAll('a'));
    anchors.forEach((anchor) => {
      expect(anchor.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
    });
  });
});

describe('Markdown — plain text, which is what every stored chapter is today', () => {
  it('renders a plain sentence as a paragraph', () => {
    const { container } = render(<Markdown content="We came back up the well at dawn." />);

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent('We came back up the well at dawn.');
  });

  it('renders nothing for an empty body without throwing', () => {
    const { container } = render(<Markdown content="" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('does not emit empty paragraph nodes for runs of blank lines', () => {
    const { container } = render(<Markdown content={'First.\n\n\n\nSecond.'} />);

    const paragraphs = Array.from(container.querySelectorAll('p'));
    expect(paragraphs).toHaveLength(2);
    paragraphs.forEach((paragraph) => {
      expect(paragraph.textContent?.trim()).not.toBe('');
    });
  });

  it('renders a single newline as a line break, not as collapsed whitespace', () => {
    // Every chapter written before Phase 9 separates its paragraphs with one
    // newline, because that is what one Enter press in a textarea produces and
    // what `toParagraphs` rendered as a paragraph. Strict CommonMark treats it
    // as a soft break and collapses it, which turns those chapters into a
    // single wall of text — measured, then decided against.
    const { container } = render(
      <Markdown content={'Paragraph one.\nParagraph two.\nParagraph three.'} />
    );

    expect(container.querySelectorAll('br')).toHaveLength(2);
    expect(container.textContent).toContain('Paragraph one.');
    expect(container.textContent).toContain('Paragraph three.');
  });

  it('still separates blank-line-delimited prose into real paragraphs', () => {
    const { container } = render(<Markdown content={'Paragraph one.\n\nParagraph two.'} />);

    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('does not let line breaks reach inside a block construct', () => {
    // The reason `remark-breaks` was chosen over rewriting newlines into
    // paragraph breaks: block structure still parses as CommonMark, so 4b's
    // two-line pull quote is one blockquote.
    const { container } = render(<Markdown content={'- one\n- two\n- three'} />);

    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelectorAll('ul li')).toHaveLength(3);
    expect(container.querySelectorAll('ul br')).toHaveLength(0);
  });

  it('turns literal \\n escape sequences into real breaks', () => {
    // Stored content really does contain these — `toParagraphs` and
    // `formatContent` both fixed it, and both comments say so.
    const { container } = render(<Markdown content={'First.\\n\\nSecond.'} />);

    expect(container.textContent).not.toContain('\\n');
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });
});

describe('Markdown — the container', () => {
  it('passes its className through so a caller can keep its measure', () => {
    const { container } = render(<Markdown content="Text." className="reader-prose" />);
    expect(container.firstElementChild).toHaveClass('reader-prose');
  });

  it('always carries markdown-body, which is what paints the block elements', () => {
    // Tailwind's preflight strips margins from p, list markers from ul/ol and
    // every default from blockquote. The typographic voice comes from the
    // caller's context (`reader-prose`); the structure has to come from the
    // component, or a rendered list has no bullets wherever it appears.
    const { container } = render(<Markdown content="Text." />);
    expect(container.firstElementChild).toHaveClass('markdown-body');
  });

  it('keeps markdown-body when a caller also passes a className', () => {
    const { container } = render(<Markdown content="Text." className="reader-prose" />);
    expect(container.firstElementChild).toHaveClass('markdown-body', 'reader-prose');
  });
});
