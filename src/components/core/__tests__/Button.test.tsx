import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../../themes/ThemeContext';
import Button from '../Button';

// Helper function to render Button with ThemeProvider
const renderButton = (props = {}) => {
  return render(
    <ThemeProvider>
      <Button {...props} />
    </ThemeProvider>
  );
};

describe('Button Component', () => {
  // Zero: Test default rendering
  describe('Zero State', () => {
    it('renders without crashing', () => {
      // Arrange & Act
      const { getByRole } = renderButton({ children: 'Click me' });
      
      // Assert
      expect(getByRole('button')).toBeInTheDocument();
    });

    it('renders with default variant and size', () => {
      // Arrange & Act
      const { getByRole } = renderButton({ children: 'Click me' });
      const button = getByRole('button');
      
      // Assert
      expect(button).toHaveClass('default-button-primary'); // Default variant
      expect(button).toHaveClass('text-base px-4 py-2'); // Default size (md)
    });
  });

  // One: Test single props and simple interactions
  describe('One Prop', () => {
    it('renders with custom className', () => {
      // Arrange & Act
      const { getByRole } = renderButton({ children: 'Click me', className: 'custom-class' });
      
      // Assert
      expect(getByRole('button')).toHaveClass('custom-class');
    });

    it('handles click events', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleClick = jest.fn();
      const { getByRole } = renderButton({ children: 'Click me', onClick: handleClick });
      
      // Act
      await user.click(getByRole('button'));
      
      // Assert
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('can be disabled', () => {
      // Arrange & Act
      const { getByRole } = renderButton({ children: 'Click me', disabled: true });
      
      // Assert
      expect(getByRole('button')).toBeDisabled();
    });
  });

  // Many: Test multiple variants, sizes, and combinations
  describe('Many Variants and Sizes', () => {
    // Test all variants
    it.each([
      ['primary', 'default-button-primary'],
      ['secondary', 'default-button-secondary'],
      ['outline', 'default-button-outline'],
      ['ghost', 'default-button-ghost'],
      ['link', 'default-button-link']
    ])('renders %s variant correctly', (variant, expectedClass) => {
      // Arrange & Act
      const { getByRole } = renderButton({ children: 'Click me', variant });
      
      // Assert
      expect(getByRole('button')).toHaveClass(expectedClass);
    });

    // Test all sizes
    it.each([
      ['sm', 'text-sm px-3 py-1.5'],
      ['md', 'text-base px-4 py-2'],
      ['lg', 'text-lg px-6 py-3']
    ])('renders %s size correctly', (size, expectedClasses) => {
      // Arrange & Act
      const { getByRole } = renderButton({ children: 'Click me', size });
      const button = getByRole('button');
      
      // Assert
      expectedClasses.split(' ').forEach(className => {
        expect(button).toHaveClass(className);
      });
    });
  });

  // Boundary: Test edge cases and constraints
  describe('Boundary Behaviors', () => {
    it('handles empty children', () => {
        // Act
        const { getByRole } = renderButton({ children: '' });
        
        // Assert
        expect(getByRole('button')).toBeInTheDocument();
      });

    it('handles very long text content', () => {
      // Arrange
      const longText = 'A'.repeat(100);
      
      // Act
      const { getByRole } = renderButton({ children: longText });
      
      // Assert
      expect(getByRole('button')).toHaveTextContent(longText);
    });
  });

  // Interface: Test component API and accessibility
  describe('Interface and Accessibility', () => {
    it('supports aria-label', () => {
      // Arrange & Act
      const { getByRole } = renderButton({ children: 'Click me', 'aria-label': 'Custom Label' });
      
      // Assert
      expect(getByRole('button')).toHaveAttribute('aria-label', 'Custom Label');
    });
  });

  // Exceptional: Test loading states and error handling
  describe('Exceptional Behavior', () => {
    it('shows loading state', () => {
      // Arrange & Act
      const { getByRole, getByText } = renderButton({ children: 'Click me', isLoading: true });
      
      // Assert
      expect(getByRole('button')).toHaveClass('cursor-wait');
      expect(getByText('Click me')).toHaveClass('invisible');
    });

    it('prevents clicks when loading', async () => {
      // Arrange
      const user = userEvent.setup();
      const handleClick = jest.fn();
      const { getByRole } = renderButton({ 
        children: 'Click me', 
        isLoading: true, 
        onClick: handleClick 
      });
      
      // Act
      await user.click(getByRole('button'));
      
      // Assert
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Simple: Test straightforward use cases
  describe('Simple Scenarios', () => {
    it('renders with start icon', () => {
      // Arrange & Act
      const { getByTestId } = renderButton({ 
        children: 'Click me',
        startIcon: <span data-testid="start-icon">→</span>
      });
      
      // Assert
      expect(getByTestId('start-icon')).toBeInTheDocument();
    });

    it('renders with end icon', () => {
      // Arrange & Act
      const { getByTestId } = renderButton({ 
        children: 'Click me',
        endIcon: <span data-testid="end-icon">←</span>
      });
      
      // Assert
      expect(getByTestId('end-icon')).toBeInTheDocument();
    });

    it('renders as full width', () => {
      // Arrange & Act
      const { getByRole } = renderButton({ children: 'Click me', fullWidth: true });
      
      // Assert
      expect(getByRole('button')).toHaveClass('w-full');
    });
  });
});