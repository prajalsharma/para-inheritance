/**
 * Para Allowance Wallet - Entry Point
 *
 * Sets up the React application with:
 * - React Query for data management (required by Para SDK)
 * - ParaProvider for Para SDK integration
 * - PermissionProvider for local permission management
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */

import { Component } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ParaProvider, Environment } from '@getpara/react-sdk';
import '@getpara/react-sdk/styles.css';
import { PermissionProvider } from './contexts/PermissionContext';
import App from './App';
import './index.css';

/**
 * Error Boundary to catch and display React errors
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>Check the browser console (F12) for details.</p>
          <pre style={{
            background: '#f1f5f9',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'left',
            overflow: 'auto',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Para API Key - loaded from environment variable
 * NEVER hardcode API keys in source files
 *
 * @see https://docs.getpara.com
 */
const PARA_API_KEY = import.meta.env.VITE_PARA_API_KEY;

if (!PARA_API_KEY) {
  console.error('[Para] Missing VITE_PARA_API_KEY environment variable. Please add it to your .env file.');
} else {
  console.log('[Para] API key loaded, prefix:', PARA_API_KEY.split('_')[0]);
}

/**
 * React Query Client
 * Required by Para SDK for managing async operations
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

/**
 * Application Root
 *
 * Wrapped with ParaProvider for Para SDK integration.
 * Uses environment variables for API key configuration.
 *
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: PARA_API_KEY || '',
          env: Environment.BETA,
        }}
        config={{
          appName: 'Para Allowance Wallet',
        }}
      >
        <PermissionProvider>
          <App />
        </PermissionProvider>
      </ParaProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
