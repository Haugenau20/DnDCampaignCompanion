// src/core/components/MarkdownToolbar.tsx
import React, { useCallback } from 'react';
import { Bold, Italic, Quote } from 'lucide-react';
import clsx from 'clsx';
import Button from 'core/components/Button';

export interface MarkdownToolbarProps {
  /** The textarea this toolbar writes into. */
  targetRef: React.RefObject<HTMLTextAreaElement>;
  /**
   * Called with the field's new value after a mark is applied.
   *
   * The toolbar does not own the value — it writes into the textarea and then
   * reports, so the form's existing change handler stays the single path into
   * state and validation and submission are untouched.
   */
  onChange: (value: string) => void;
  /** Accessible name for the button group, e.g. "Chapter content formatting". */
  label: string;
  className?: string;
}

/** The line prefix a blockquote wears in CommonMark. */
const QUOTE_PREFIX = '> ';

/**
 * Apply a wrapping mark to the current selection.
 *
 * Written through `setRangeText` rather than by assigning `value`, which is
 * the whole reason this is a helper and not two lines inline: assigning
 * `value` clears the browser's native undo stack, and a player losing a
 * paragraph because Ctrl+Z stopped working is a worse bug than the toolbar not
 * existing at all.
 */
function applyWrap(textarea: HTMLTextAreaElement, delimiter: string): void {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);

  textarea.setRangeText(`${delimiter}${selected}${delimiter}`, selectionStart, selectionEnd, 'end');

  if (selected.length === 0) {
    // Nothing was selected, so leave the caret between the delimiters — the
    // player asked for bold and can now type the bold words.
    const caret = selectionStart + delimiter.length;
    textarea.setSelectionRange(caret, caret);
    return;
  }

  // Keep the original text selected, so a second mark can be applied on top
  // of the first without reselecting.
  const start = selectionStart + delimiter.length;
  textarea.setSelectionRange(start, start + selected.length);
}

/**
 * Prefix every line the selection touches with the blockquote marker.
 *
 * A blockquote is a *line* mark, not a wrap, which is why it cannot share the
 * code above: wrapping a selection in `>` would produce `>quoted>`. Lines that
 * are already quoted are left alone so a second click does not stack markers,
 * and blank lines are skipped because a quoted blank line splits one
 * blockquote into two (D86's problem, seen from the authoring side).
 */
function applyQuote(textarea: HTMLTextAreaElement): void {
  const { selectionStart, selectionEnd, value } = textarea;

  // Grow the range to whole lines: a mark that applies to a line has to
  // rewrite the line, not the fragment the player happened to highlight.
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const nextBreak = value.indexOf('\n', selectionEnd);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const block = value.slice(lineStart, lineEnd);
  const quoted = block
    .split('\n')
    .map((line) =>
      line.trim().length === 0 || line.startsWith(QUOTE_PREFIX) ? line : `${QUOTE_PREFIX}${line}`
    )
    .join('\n');

  if (quoted === block) return;

  textarea.setRangeText(quoted, lineStart, lineEnd, 'end');
  textarea.setSelectionRange(lineStart, lineStart + quoted.length);
}

/**
 * Bold, italic, blockquote. Three buttons.
 *
 * The restraint is the design (A4): the point is to make the three marks
 * discoverable to a player who does not know markdown, not to build a word
 * processor. Anyone who knows the syntax can still type it, and the parser
 * supports far more than this — headings, links, lists, code — which the
 * toolbar deliberately does not offer.
 *
 * No accent (D80). A toolbar button writes to a draft; the form's one filled
 * accent is still its submit.
 */
const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  targetRef,
  onChange,
  label,
  className,
}) => {
  const apply = useCallback(
    (mark: (textarea: HTMLTextAreaElement) => void) => {
      const textarea = targetRef.current;
      if (!textarea) return;

      mark(textarea);
      onChange(textarea.value);

      // Back to the field, so the next keystroke lands in the prose rather
      // than on the button that was just pressed.
      textarea.focus();
    },
    [onChange, targetRef]
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={clsx('flex items-center gap-1 mb-1.5', className)}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Bold"
        title="Bold"
        onClick={() => apply((textarea) => applyWrap(textarea, '**'))}
        startIcon={<Bold size={16} />}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Italic"
        title="Italic"
        onClick={() => apply((textarea) => applyWrap(textarea, '*'))}
        startIcon={<Italic size={16} />}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Quote"
        title="Quote"
        onClick={() => apply(applyQuote)}
        startIcon={<Quote size={16} />}
      />
    </div>
  );
};

export default MarkdownToolbar;
