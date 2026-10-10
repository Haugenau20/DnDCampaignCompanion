// src/app/AnalyticsPageView.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from 'core/services/firebase/analytics/analytics';
import { analyticsPageFor } from 'app/DocumentTitle';

/**
 * Reports each address the player opens to Google Analytics, reduced to its
 * section (T138). Nothing leaves the browser unless the player agreed to
 * analytics. Renders nothing.
 */
const AnalyticsPageView: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(analyticsPageFor(pathname));
  }, [pathname]);

  return null;
};

export default AnalyticsPageView;
