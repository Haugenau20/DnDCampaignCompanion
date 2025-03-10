import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './styles/globals.css';

// Only import session testing tools in development
if (process.env.NODE_ENV === 'development') {
  // Use dynamic import to load the testing utilities
  import('./utils/__dev__/sessionTester')
    .then(() => console.log('Session testing utilities loaded'))
    .catch(err => console.error('Failed to load session testing utilities:', err));
}

// Router wrapper component to handle redirects
const RouterWrapper = () => {
  const { navigateToPage, createPath, getCurrentQueryParams } = useNavigation();

  useEffect(() => {
    // Get the route from URL parameters
    const { route } = getCurrentQueryParams();
    
    if (route) {
      // Remove the query parameter and navigate to the actual route
      const newUrl = window.location.pathname.replace(/\/$/, '');
      window.history.replaceState(null, '', newUrl);
      navigateToPage(createPath('/' + route))
    }
  }, [navigateToPage, createPath, getCurrentQueryParams]);

  return <App />;
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <NavigationProvider>
          <RouterWrapper />
        </NavigationProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);