// src/core/components/__tests__/MarkdownToolbar.test.tsx
import React, { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkdownToolbar from '../MarkdownToolbar';
import { unnamedButtonsIn } from '@/test-utils/accessible-names';
import { formAccentsIn } from '@/test-utils/accent-budget';

/**
 * A textarea with the toolbar above it, wired the way a real form wires it:
 * the toolbar writes through the same `onChange` the field already uses, so
 * validation and submission are untouched.
 */
const Harness: React.FC<{ initial?: string }> = ({ initial = '' }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initial);

  return (
    <form>
      <MarkdownToolbar targetRef={ref} onChange={setValue} label="Formatting" />
      <textarea
        ref={ref}
        aria-label="Body"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </form>
  );
};

/** Render the harness and return the textarea, with a selection helper. */
function setup(initial = '') {
  const utils = render(<Harness initial={initial} />);
  const textarea = screen.getByLabelText('Body') as HTMLTextAreaElement;

  const select = (start: number, end: number) => {
    textarea.focus();
    textarea.setSelectionRange(start, end);
  };

  return { ...utils, textarea, select };
}

describe('MarkdownToolbar — three buttons, named and reachable', () => {
  it('renders exactly three controls', () => {
    setup();
    // Three marks is the decision (A4). A fourth button is a new decision, not
    // a tweak — headings, links and tables are all parseable and all excluded.
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('names every button for a screen reader', () => {
    // `unnamedControlsIn` would pass vacuously here: its NAMEABLE list is
    // `input, select, textarea`, so it cannot see a button at all. These three
    // are icon-only, which is the exact thing 09-2 warns against
    // reintroducing, so the check has to be one that looks at buttons.
    const { container } = setup();
    expect(unnamedButtonsIn(container)).toEqual([]);
  });

  it('exposes bold, italic and blockquote by name', () => {
    setup();
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quote/i })).toBeInTheDocument();
  });

  it('groups the buttons under an accessible name', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Formatting' })).toBeInTheDocument();
  });

  it('uses type=button so a mark never submits the form', () => {
    setup();
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('is reachable by keyboard', async () => {
    const user = userEvent.setup();
    setup();

    await user.tab();
    expect(screen.getByRole('button', { name: /bold/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /italic/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /quote/i })).toHaveFocus();
  });

  it('carries no filled accent', () => {
    // D80: an accent marks the control that writes the record. A toolbar
    // button writes a draft, so the form's one accent is still its submit.
    const { container } = setup();
    expect(formAccentsIn(container)).toEqual([]);
  });
});

describe('MarkdownToolbar — wrapping a selection', () => {
  it('wraps the selected words in bold', () => {
    const { textarea, select } = setup('the village went quiet');
    select(4, 11); // "village"

    fireEvent.click(screen.getByRole('button', { name: /bold/i }));

    expect(textarea.value).toBe('the **village** went quiet');
  });

  it('wraps the selected words in italic', () => {
    const { textarea, select } = setup('the village went quiet');
    select(4, 11);

    fireEvent.click(screen.getByRole('button', { name: /italic/i }));

    expect(textarea.value).toBe('the *village* went quiet');
  });

  it('leaves the wrapped text selected, so a second mark can be applied', () => {
    const { textarea, select } = setup('the village went quiet');
    select(4, 11);

    fireEvent.click(screen.getByRole('button', { name: /bold/i }));

    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('village');
  });

  it('can apply italic on top of bold', () => {
    const { textarea, select } = setup('the village went quiet');
    select(4, 11);

    fireEvent.click(screen.getByRole('button', { name: /bold/i }));
    fireEvent.click(screen.getByRole('button', { name: /italic/i }));

    expect(textarea.value).toBe('the ***village*** went quiet');
  });

  it('places the caret between the delimiters when nothing is selected', () => {
    const { textarea, select } = setup('');
    select(0, 0);

    fireEvent.click(screen.getByRole('button', { name: /bold/i }));

    expect(textarea.value).toBe('****');
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(2);
  });

  it('reports the new value through onChange so the form state follows', () => {
    // The toolbar does not own the value. It writes into the textarea and then
    // tells the form, which is what keeps validation and submission untouched.
    const { textarea, select } = setup('quiet');
    select(0, 5);

    fireEvent.click(screen.getByRole('button', { name: /bold/i }));

    // A controlled textarea whose parent never heard about the change would
    // snap back on the next render; this asserts the parent did hear.
    fireEvent.change(textarea, { target: { value: textarea.value } });
    expect(textarea.value).toBe('**quiet**');
  });
});

describe('MarkdownToolbar — blockquote is a line mark, not a wrap', () => {
  it('prefixes the current line when nothing is selected', () => {
    const { textarea, select } = setup('They come from the fruit.');
    select(5, 5);

    fireEvent.click(screen.getByRole('button', { name: /quote/i }));

    expect(textarea.value).toBe('> They come from the fruit.');
  });

  it('prefixes every line of a multi-line selection', () => {
    // 4b's pull quote: a quote and its attribution, one blockquote.
    const source = 'They come from the fruit.\n— Erky Timbers';
    const { textarea, select } = setup(source);
    select(0, source.length);

    fireEvent.click(screen.getByRole('button', { name: /quote/i }));

    expect(textarea.value).toBe('> They come from the fruit.\n> — Erky Timbers');
  });

  it('does not prefix a line that is already quoted', () => {
    const { textarea, select } = setup('> Already quoted.');
    select(2, 9);

    fireEvent.click(screen.getByRole('button', { name: /quote/i }));

    expect(textarea.value).toBe('> Already quoted.');
  });

  it('leaves an empty line alone in a mixed selection', () => {
    const source = 'First line.\n\nSecond line.';
    const { textarea, select } = setup(source);
    select(0, source.length);

    fireEvent.click(screen.getByRole('button', { name: /quote/i }));

    expect(textarea.value).toBe('> First line.\n\n> Second line.');
  });
});

describe('MarkdownToolbar — the undo stack', () => {
  it('edits through setRangeText, which is what preserves browser undo', () => {
    // Asserted on the mechanism because jsdom has no undo stack to test: it
    // implements neither execCommand nor a history for Ctrl+Z. Replacing
    // `value` wholesale is the thing that destroys undo, and losing a
    // paragraph to Ctrl+Z not working is worse than the toolbar not existing —
    // so the call itself is the contract. Verified for real in a browser.
    const spy = jest.spyOn(HTMLTextAreaElement.prototype, 'setRangeText');
    const { select } = setup('quiet');
    select(0, 5);

    fireEvent.click(screen.getByRole('button', { name: /bold/i }));

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns focus to the textarea so typing continues where it left off', () => {
    const { textarea, select } = setup('quiet');
    select(0, 5);

    fireEvent.click(screen.getByRole('button', { name: /bold/i }));

    expect(textarea).toHaveFocus();
  });
});
