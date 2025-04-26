// src/components/core/__tests__/Card.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../../themes/ThemeContext';
import Card from '../Card';

// Helper function to render Card with ThemeProvider
const renderCard = (props = {}, children: React.ReactNode = null) => {
  return render(
    <ThemeProvider>
      <Card {...props}>{children}</Card>
    </ThemeProvider>
  );
};

describe('Card Component', () => {
  // Zero: Test minimal rendering
  describe('Zero State', () => {
    it('renders without crashing', () => {
      // Arrange & Act
      const { container } = renderCard({}, 'Card content');
      
      // Assert
      expect(container).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      // Arrange & Act
      renderCard({}, 'Test card content');
      
      // Assert
      expect(screen.getByText('Test card content')).toBeInTheDocument();
    });
  });

  // One: Test single props and simple interactions
  describe('One Prop', () => {
    it('renders with custom className', () => {
      // Arrange & Act
      const { container } = renderCard({ className: 'custom-class' }, 'Card content');
      
      // Assert
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders as hoverable when hoverable prop is true', () => {
      // Arrange & Act
      const { container } = renderCard({ hoverable: true }, 'Card content');
      
      // Assert
      expect(container.firstChild).toHaveClass('hover:shadow-md');
    });

    it('handles click events when provided', async () => {
      // Arrange
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      // Act
      const { container } = renderCard({ onClick: handleClick }, 'Clickable card');
      await user.click(container.firstChild as Element);
      
      // Assert
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has role="button" when onClick is provided', () => {
      // Arrange & Act
      const { container } = renderCard({ onClick: jest.fn() }, 'Clickable card');
      
      // Assert
      expect(container.firstChild).toHaveAttribute('role', 'button');
    });
  });

  // Many: Test subcomponents and combinations
  describe('Card Composition', () => {
    it('renders CardHeader with title correctly', () => {
      // Arrange & Act
      render(
        <ThemeProvider>
          <Card>
            <Card.Header title="Test Title" />
            <Card.Content>Content</Card.Content>
          </Card>
        </ThemeProvider>
      );
      
      // Assert
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders CardHeader with subtitle correctly', () => {
      // Arrange & Act
      render(
        <ThemeProvider>
          <Card>
            <Card.Header title="Test Title" subtitle="Test Subtitle" />
            <Card.Content>Content</Card.Content>
          </Card>
        </ThemeProvider>
      );
      
      // Assert
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('renders CardHeader with action component correctly', () => {
      // Arrange & Act
      render(
        <ThemeProvider>
          <Card>
            <Card.Header 
              title="Test Title" 
              action={<button data-testid="action-button">Action</button>} 
            />
            <Card.Content>Content</Card.Content>
          </Card>
        </ThemeProvider>
      );
      
      // Assert
      expect(screen.getByTestId('action-button')).toBeInTheDocument();
    });

    it('renders CardContent with default padding', () => {
      // Arrange & Act
      render(
        <ThemeProvider>
          <Card>
            <Card.Content>
              <span data-testid="content">Test content</span>
            </Card.Content>
          </Card>
        </ThemeProvider>
      );
      
      // Assert
      const contentParent = screen.getByTestId('content').parentElement;
      expect(contentParent).toHaveClass('p-4'); // Default padding is 'md'
    });

    it('renders CardContent with different padding sizes', () => {
      // Arrange & Act
      const { container } = render(
        <ThemeProvider>
          <Card>
            <Card.Content padding="lg">
              Large padding
            </Card.Content>
          </Card>
        </ThemeProvider>
      );
      
      // Assert
      // Find the first div inside the Card that would be Card.Content
      const contentDiv = container.querySelector('.p-6');
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv).toHaveTextContent('Large padding');
    });

    it('renders CardFooter correctly', () => {
      // Arrange & Act
      render(
        <ThemeProvider>
          <Card>
            <Card.Content>Content</Card.Content>
            <Card.Footer>
              <span data-testid="footer-content">Footer content</span>
            </Card.Footer>
          </Card>
        </ThemeProvider>
      );
      
      // Assert
      expect(screen.getByTestId('footer-content')).toBeInTheDocument();
      const footerEl = screen.getByTestId('footer-content').parentElement;
      expect(footerEl).toHaveClass('px-6 py-4');
    });
  });

  // Boundary: Test edge cases and extremes
  describe('Boundary Behaviors', () => {
    it('handles empty children gracefully', () => {
      // Arrange & Act
      const { container } = renderCard({}, '');
      
      // Assert
      expect(container.firstChild).toBeInTheDocument();
    });

    it('works with nested content', () => {
      // Arrange & Act
      renderCard({}, 
        <div>
          <span>Level 1</span>
          <div>
            <span data-testid="nested-content">Level 2</span>
          </div>
        </div>
      );
      
      // Assert
      expect(screen.getByTestId('nested-content')).toBeInTheDocument();
    });
  });

  // Interface: Test component API
  describe('Component API', () => {
    it('accepts a ref', () => {
      // Arrange
      const ref = React.createRef<HTMLDivElement>();
      
      // Act
      render(
        <ThemeProvider>
          <Card ref={ref}>Card with ref</Card>
        </ThemeProvider>
      );
      
      // Assert
      expect(ref.current).not.toBeNull();
    });

    it('forwards additional props to the DOM element', () => {
      // Arrange & Act
      const { container } = renderCard({ 'data-testvalue': 'test' }, 'Card content');
      
      // Assert
      expect(container.firstChild).toHaveAttribute('data-testvalue', 'test');
    });
  });

  // Exception: Test error handling
  describe('Exception Handling', () => {
    // Most React component errors are caught by error boundaries,
    // which can't be effectively tested with regular test methods.
    // We're focusing on DOM validation and user interactions.
    
    it('is accessible with a role when clickable', () => {
      // Arrange & Act
      const { container } = renderCard({ onClick: jest.fn() }, 'Accessible card');
      
      // Assert
      expect(container.firstChild).toHaveAttribute('role', 'button');
      expect(container.firstChild).toHaveAttribute('tabIndex', '0');
    });
  });

  // Simple: Test typical usage patterns
  describe('Simple Scenarios', () => {
    it('renders a basic card with header, content and footer', () => {
      // Arrange & Act
      render(
        <ThemeProvider>
          <Card>
            <Card.Header title="Card Title" />
            <Card.Content>
              <p data-testid="card-body">Card body content</p>
            </Card.Content>
            <Card.Footer>
              <button data-testid="footer-button">Action</button>
            </Card.Footer>
          </Card>
        </ThemeProvider>
      );
      
      // Assert
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByTestId('card-body')).toBeInTheDocument();
      expect(screen.getByTestId('footer-button')).toBeInTheDocument();
    });

    it('renders with theme-specific styling', () => {
      // Arrange & Act
      const { container } = renderCard({}, 'Themed card');
      
      // Assert - Check for theme class presence
      // The card should have a classname with the theme prefix
      expect(container.firstChild).toHaveClass('default-card');
    });
  });
});