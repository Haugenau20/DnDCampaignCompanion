// src/core/components/Select.tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Props for the Select primitive.
 *
 * Deliberately the same names as `Input` for the same jobs — a caller who
 * knows one knows the other, and 8.1 moves labels onto `label` in both
 * without having to remember which component wants which prop.
 */
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Label text displayed above the select */
  label?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Error message displayed below the select, replacing the helper text */
  error?: string;
  /** Success message displayed below the select, replacing the helper text */
  successMessage?: string;
  /** Size variant of the select */
  size?: 'sm' | 'md' | 'lg';
  /** Full width of container */
  fullWidth?: boolean;
  /** Container className */
  containerClassName?: string;
}

/**
 * Size-specific styles mapping. Matches `Input` exactly so a select and a text
 * field sitting side by side in a two-column row line up.
 */
const sizeStyles = {
  sm: 'h-8 text-sm px-2',
  md: 'h-10 text-base px-3',
  lg: 'h-12 text-lg px-4'
};

/**
 * A labelled `<select>`, shaped like `Input`.
 *
 * The control stays a native `<select>`: the browser owns keyboard handling,
 * screen-reader semantics and the touch picker, and all three are correct for
 * free. This is not a listbox and should not become one.
 *
 * When a `label` is provided it is associated with the control via
 * `htmlFor`/`id` (WCAG 1.3.1, 4.1.2), so screen readers announce the control
 * by name and `getByLabelText()` resolves it. An explicitly-passed `id` always
 * wins; otherwise a stable id comes from `React.useId()`.
 *
 * Error and helper text never render together — the error replaces the helper,
 * so the message under a field is always the one that matters most. The error
 * is also announced rather than merely coloured (design language §2: nothing is
 * encoded by colour alone), via `aria-invalid` and `aria-describedby`.
 *
 * Paints from the `field.*` tokens through the shared `.input` classes. It
 * introduces no token of its own.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      successMessage,
      size = 'md',
      fullWidth = false,
      containerClassName,
      className,
      id,
      ...props
    },
    ref
  ) => {
    // An explicitly-passed id always wins over the generated one. The generated
    // id exists only to associate a label with its control, so it is applied
    // only when a label is actually rendered.
    const generatedId = React.useId();
    const selectId = label ? (id ?? generatedId) : id;

    // The message under the field, if any. Error beats success beats helper —
    // one message, never a stack.
    const message = error || successMessage || helperText;
    const messageId = `${selectId ?? generatedId}-message`;

    const selectStyles = twMerge(
      clsx(
        'w-full rounded-lg border transition-colors duration-200',
        'focus:outline-none',
        sizeStyles[size],

        // Theme-specific classes — the same paint Input uses.
        `input`,
        error && `input-error`,
        successMessage && `input-success`,
        className
      )
    );

    const containerStyles = twMerge(
      clsx(
        'flex flex-col',
        fullWidth && 'w-full',
        containerClassName
      )
    );

    return (
      <div className={containerStyles}>
        {label && (
          <label
            htmlFor={selectId}
            className={clsx(
              'mb-1.5 text-sm font-medium',
              `form-label`
            )}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={selectStyles}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...props}
        />
        {message && (
          <p
            id={messageId}
            className={clsx(
              'mt-1.5 text-sm',
              error && `form-error`,
              successMessage && `form-success`,
              !error && !successMessage && `form-helper`
            )}
          >
            {message}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
