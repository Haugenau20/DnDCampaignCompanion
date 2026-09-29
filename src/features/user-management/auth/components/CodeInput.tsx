// src/features/user-management/auth/components/CodeInput.tsx
import React, { useEffect, useId, useRef } from 'react';
import clsx from 'clsx';

interface CodeInputProps {
  /** What the boxes are for; labels the group. */
  label: string;
  /** The digits typed so far, left to right. */
  value: string;
  /** Called with the new digits whenever they change. */
  onChange: (value: string) => void;
  /** How many digits the code has. */
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * A one-time code typed into a row of single-digit boxes.
 *
 * Purely a way of drawing one short string: `value` is always the digits typed
 * so far, filled from the left, so a box can only be reached once every box
 * before it holds a digit. Typing moves on to the next box, Backspace clears
 * and moves back, and pasting -- or the phone's own one-time-code autofill,
 * which fills the first box -- spreads the digits across the boxes.
 *
 * The boxes split into two halves, so a 6-digit code reads as "482 913" -- the
 * way the page that shows it groups it.
 */
const CodeInput: React.FC<CodeInputProps> = ({
  label,
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false
}) => {
  const labelId = useId();
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  // The digits as of the latest change. Focus moves before the new `value`
  // renders, and deciding where it may land by the old one bounces it back.
  const latest = useRef(value);
  latest.current = value;

  const focusBox = (index: number) => {
    boxes.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  };

  // When the digits are cleared from outside (a wrong code), the caret
  // follows them back rather than stranding past the gap.
  useEffect(() => {
    const focused = boxes.current.findIndex((box) => box === document.activeElement);
    if (focused > value.length) focusBox(value.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (index: number, typed: string) => {
    let digits = typed.replace(/\D/g, '');
    if (!digits) return;
    // A digit typed beside the one already there (the box was clicked, not
    // selected) arrives with it: keep only the new one.
    const current = value[index];
    if (current && digits.length === 2) {
      digits = digits[0] === current ? digits[1] : digits[0];
    }
    const next = (value.slice(0, index) + digits + value.slice(index + digits.length)).slice(0, length);
    latest.current = next;
    onChange(next);
    focusBox(index + digits.length);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      // An empty box clears the one before it, as a single field would.
      const target = index < value.length ? index : index - 1;
      if (target < 0) return;
      latest.current = value.slice(0, target) + value.slice(target + 1);
      onChange(latest.current);
      focusBox(target);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(Math.min(index + 1, value.length));
    }
  };

  const handleFocus = (index: number, event: React.FocusEvent<HTMLInputElement>) => {
    // No gaps: a box past the typed digits sends focus back to the first empty one.
    if (index > latest.current.length) {
      focusBox(latest.current.length);
      return;
    }
    // Selected, so typing over a digit replaces it.
    event.target.select();
  };

  return (
    <div role="group" aria-labelledby={labelId}>
      <div id={labelId} className="mb-1.5 text-sm font-medium form-label">
        {label}
      </div>
      <div className="flex justify-center gap-1.5 sm:gap-2">
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(element) => {
              boxes.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${index + 1} of ${length}`}
            value={value[index] ?? ''}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onFocus={(event) => handleFocus(index, event)}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            className={clsx(
              'input w-full min-w-0 max-w-[3rem] h-12 sm:h-14 rounded-lg border text-center',
              'font-heading text-xl sm:text-2xl focus:outline-none transition-colors duration-200',
              index === Math.floor(length / 2) && 'ml-2 sm:ml-3'
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default CodeInput;
