import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import ErrorBoundary from '@/components/ErrorBoundary';
import '@/index.css';
import '@/i18n';

// StrictMode enabled for best practices and identifying potential issues
ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </>
);