// components/core/Typography.tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Available variant styles for the Typography component
 */
type TypographyVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'body-lg' 
  | 'body' 
  | 'body-sm' 
  | 'caption';

/**
 * Available color themes for the Typography component
 */
type TypographyColor = 
  | 'default'    // Default text color
  | 'primary'    // Primary brand color
  | 'secondary'  // Secondary text color
  | 'muted'      // Muted/subtle text
  | 'white'      // White text for dark backgrounds
  | 'error'      // Error messages
  | 'success';   // Success messages

/**
 * Props for the Typography component
 */
type TypographyProps<C extends React.ElementType> = {
  /** The variant determines the base styling of the text */
  variant?: TypographyVariant;
  /** The color theme for the text */
  color?: TypographyColor;
  /** Optional CSS classes to extend styling */
  className?: string;
  /** The HTML element to render (defaults based on variant) */
  as?: C;
  /** If true, text will be centered */
  centered?: boolean;
  /** If true, text will be truncated with ellipsis */
  truncate?: boolean;
  /** The content to be rendered */
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<C>;

/**
 * Mapping of variants to their default HTML elements
 */
const defaultElements: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  'body-lg': 'p',
  body: 'p',
  'body-sm': 'p',
  caption: 'span'
};

/**
 * Base styles for each typography variant
 */
const variantStyles: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold tracking-tight',
  'body-lg': 'text-lg',
  body: 'text-base',
  'body-sm': 'text-sm',
  caption: 'text-sm'
};

/**
 * Typography component for consistent text styling throughout the application.
 * Provides various preset styles while remaining flexible through props.
 */
export const Typography = <C extends React.ElementType = 'p'>({
  variant = 'body',
  color = 'default',
  className,
  as,
  centered = false,
  truncate = false,
  children,
  ...props
}: TypographyProps<C>) => {
  const Component = as || defaultElements[variant];

  // Is this variant a heading?
  const isHeading = variant === 'h1' || variant === 'h2' || variant === 'h3' || variant === 'h4';

  // Combine all styles using clsx and tailwind-merge
  const styles = twMerge(
    clsx(
      // Base styles
      'max-w-full',
      'm-0',
      'leading-none',
      
      // Variant styles
      variantStyles[variant],
      
      // Optional styles
      centered && 'text-center',
      truncate && 'truncate',
      
      // Theme-specific classes
      `typography`,
      
      isHeading && `typography-heading`,
      
      // Color-specific classes
      color === 'primary' && `typography-primary`,
      color === 'secondary' && `typography-secondary`,
      color === 'muted' && `typography-muted`,
      color === 'white' && `typography-white`,
      color === 'error' && `typography-error`,
      color === 'success' && `typography-success`,
      
      // Custom classes
      className
    )
  );

  return (
    <Component
      className={styles}
      {...props}
    >
      {children}
    </Component>
  );
};

Typography.displayName = 'Typography';

export default Typography;