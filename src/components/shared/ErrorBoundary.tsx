// components/shared/ErrorBoundary.tsx
import React from 'react';
import Typography from '../core/Typography';
import Button from '../core/Button';
import { AlertCircle } from 'lucide-react';
import { useTheme } from '../../themes/ThemeContext';
import clsx from 'clsx';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided, otherwise use default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

// Separate functional component to access theme context
const ErrorFallback: React.FC = () => {
  const { theme } = useTheme();
  const themePrefix = theme.name;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <AlertCircle className={clsx("w-12 h-12 mb-4", `${themePrefix}-status-failed`)} />
      <Typography variant="h2" className="mb-4">
        Something went wrong
      </Typography>
      <Typography color="secondary" className="mb-6 text-center">
        We're sorry, but something unexpected happened. Please try refreshing the page.
      </Typography>
      <Button
        onClick={() => window.location.reload()}
        startIcon={<AlertCircle size={18} />}
      >
        Refresh Page
      </Button>
    </div>
  );
};

export default ErrorBoundary;