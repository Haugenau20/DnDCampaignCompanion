import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ThemeProvider } from './themes/ThemeContext';
import App from './App';
import './styles/globals.css';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getApp } from 'firebase/app';

// Initialize AppCheck for enhanced security
// In development, we'll use debug tokens
if (process.env.NODE_ENV === 'development') {
  // Set debug token for Firebase App Check in development
  // @ts-ignore
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  
  // Use dynamic import to load the testing utilities
  import('./utils/__dev__/sessionTester')
    .then(() => console.log('Session testing utilities loaded'))
    .catch(err => console.error('Failed to load session testing utilities:', err));
}

// Initialize Firebase App Check to prevent abuse of our Cloud Functions
  // This requires a reCAPTCHA v3 site key from Google Console
  // https://console.cloud.google.com/security/recaptcha
  try {
    // Make sure we have a valid site key
    const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      console.error('Missing REACT_APP_RECAPTCHA_SITE_KEY environment variable');
      throw new Error('Missing reCAPTCHA site key');
    }

    const appCheckConfig = {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    };

    initializeAppCheck(getApp(), appCheckConfig);
    console.log('Firebase App Check initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase App Check:', error);
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