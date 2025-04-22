// components/core/Button.tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../context/ThemeContext';

/**
 * Button variant types for different visual styles
 */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';

/**
 * Button size options
 */
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Icon position options
 */
type IconPosition = 'start' | 'end' | 'top';

/**
 * Props for the Button component
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The visual style variant of the button */
  variant?: ButtonVariant;
  /** The size of the button */
  size?: ButtonSize;
  /** Icon to display before the button text */
  startIcon?: React.ReactNode;
  /** Icon to display after the button text */
  endIcon?: React.ReactNode;
  /** Position of the icon relative to text (start, end, or top) */
  iconPosition?: IconPosition;
  /** If true, the button will take up the full width of its container */
  fullWidth?: boolean;
  /** Loading state of the button */
  isLoading?: boolean;
  /** If true, centers the button content */
  centered?: boolean;
}

/**
 * Size styles for the button
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-6 py-3'
};

/**
 * A versatile button component with multiple variants and sizes.
 * Supports icons in different positions including above text.
 * Follows accessibility best practices and supports loading states and full width.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  startIcon,
  endIcon,
  iconPosition = 'start',
  fullWidth = false,
  isLoading = false,
  centered = true,
  className,
  children,
  disabled,
  ...props
}) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  // Determine if we're using the vertical layout
  const isVertical = iconPosition === 'top';
  
  // Get the icon based on position
  const icon = iconPosition === 'end' ? endIcon : startIcon;
  
  // Combine styles using clsx and tailwind-merge
  const buttonStyles = twMerge(
    clsx(
      // Base styles
      'relative rounded-lg font-medium transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      
      // Size specific styles
      variant !== 'link' && sizeStyles[size],
      
      // Width styles
      fullWidth ? 'w-full' : 'w-auto',
      
      // Content alignment
      'inline-flex items-center',
      isVertical ? 'flex-col' : 'flex-row',
      centered && 'justify-center',
      
      // Loading state styles
      isLoading && 'cursor-wait',
      
      // Theme-specific classes
      `${themePrefix}-button`,
      `${themePrefix}-button-${variant}`,
      
      // Custom classes
      className
    )
  );

  return (
    <button
      className={buttonStyles}
      disabled={disabled || isLoading}
      data-variant={variant}
      {...props}
    >
      {isLoading && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Loading spinner */}
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
      )}
      
      <span className={clsx('inline-flex items-center', isVertical ? 'flex-col' : 'flex-row', isLoading && 'invisible')}>
        {isVertical ? (
          <>
            {icon && <div className="mb-1">{icon}</div>}
            <div className={clsx(isVertical && "text-xs font-medium")}>{children}</div>
          </>
        ) : (
          <>
            {startIcon && <span className="mr-2">{startIcon}</span>}
            {children}
            {endIcon && <span className="ml-2">{endIcon}</span>}
          </>
        )}
      </span>
    </button>
  );
};

export default Button;