// components/core/Input.tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Base props shared between input and textarea
 */
interface BaseInputProps {
  /** Label text displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Success message displayed below the input */
  successMessage?: string;
  /** Size variant of the input */
  size?: 'sm' | 'md' | 'lg';
  /** Full width of container */
  fullWidth?: boolean;
  /** Left icon component */
  startIcon?: React.ReactNode;
  /** Right icon component */
  endIcon?: React.ReactNode;
  /** Container className */
  containerClassName?: string;
  rows?: number;
}

/**
 * Props specific to textarea inputs
 */
interface TextAreaInputProps extends BaseInputProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  isTextArea: true;
  rows?: number;
}

/**
 * Props specific to regular inputs
 */
interface StandardInputProps extends BaseInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  isTextArea?: false;
}

/**
 * Combined input props type
 */
type InputProps = TextAreaInputProps | StandardInputProps;

/**
 * Size-specific styles mapping
 */
const sizeStyles = {
  sm: 'h-8 text-sm px-2',
  md: 'h-10 text-base px-3',
  lg: 'h-12 text-lg px-4'
};

/**
 * Input component that supports both regular inputs and textareas.
 *
 * When a `label` is provided, it is associated with the rendered control via
 * `htmlFor`/`id` (WCAG 1.3.1) so screen readers announce it and
 * `getByLabelText()` queries resolve it. An explicitly-passed `id` prop is
 * always honoured; otherwise a stable id is generated with `React.useId()`.
 */
export const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      successMessage,
      size = 'md',
      fullWidth = false,
      startIcon,
      endIcon,
      containerClassName,
      className,
      isTextArea,
      rows = 3,
      id,
      ...props
    },
    ref
  ) => {
    // An explicitly-passed id always wins over the generated one. The
    // generated id is only needed to associate a label with its control, so
    // it's only applied when a label is actually rendered — otherwise the
    // control gets whatever id (if any) the caller explicitly passed, same
    // as before this fix.
    const generatedId = React.useId();
    const inputId = label ? (id ?? generatedId) : id;

    const inputStyles = twMerge(
      clsx(
        'w-full rounded-lg border transition-colors duration-200',
        'focus:outline-none',
        !isTextArea && sizeStyles[size],
        isTextArea && 'p-3',
        startIcon && 'pl-10',
        endIcon && 'pr-10',
        
        // Theme-specific classes
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
            htmlFor={inputId}
            className={clsx(
              'mb-1.5 text-sm font-medium',
              `form-label`
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className={clsx(
              "absolute left-3 top-1/2 -translate-y-1/2",
              `typography-secondary`
            )}>
              {startIcon}
            </div>
          )}
          {isTextArea ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={inputId}
              className={inputStyles}
              rows={rows}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              id={inputId}
              className={inputStyles}
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
          {endIcon && (
            <div className={clsx(
              "absolute right-3 top-1/2 -translate-y-1/2",
              `typography-secondary`
            )}>
              {endIcon}
            </div>
          )}
        </div>
        {(helperText || error || successMessage) && (
          <p className={clsx(
            'mt-1.5 text-sm',
            error && `form-error`,
            successMessage && `form-success`,
            !error && !successMessage && `form-helper`
          )}>
            {error || successMessage || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;