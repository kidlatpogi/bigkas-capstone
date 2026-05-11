import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import AppRouter from './routes/AppRouter';

// Styles
import './styles/globals.css';
import './styles/mobileViewport.css';
import './index.css';

/**
 * Bigkas Web Application
 * A pronunciation practice app
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SessionProvider>
          <AppRouter />
        </SessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Register Service Worker for asset caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
