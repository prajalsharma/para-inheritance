/**
 * Para Allowance Wallet - Entry Point
 *
 * Sets up the React application with:
 * - React Query for data management (required by Para SDK)
 * - ParaProvider for Para SDK integration
 * - PermissionProvider for local permission management
 *
 * @see https://www.getpara.com/
 */

// Display error function - must be defined before any async operations
function displayFatalError(error: unknown, phase: string) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';
  console.error(`[Fatal Error - ${phase}]`, error);

  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #faf5ff 100%);">
        <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 600px; text-align: center;">
          <div style="width: 64px; height: 64px; background: #fef2f2; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0 0 8px;">Failed to Load Application</h1>
          <p style="color: #64748b; margin: 0 0 16px; font-size: 14px;">Error during: ${phase}</p>
          <pre style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: left; overflow: auto; font-size: 12px; color: #475569; margin: 0 0 16px; border: 1px solid #e2e8f0; white-space: pre-wrap; word-break: break-word;">${message}${stack ? '\n\n' + stack : ''}</pre>
          <button onclick="window.location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}

// Global error handlers - set up immediately
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[Global Error]', { message, source, lineno, colno, error });
  displayFatalError(error || message, 'Runtime Error');
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('[Unhandled Promise Rejection]', event.reason);
  displayFatalError(event.reason, 'Unhandled Promise');
};

// Main bootstrap function using dynamic imports
async function bootstrap() {
  try {
    console.log('[Bootstrap] Starting application...');

    // Import React first
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    console.log('[Bootstrap] React loaded');

    // Import React Query
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    console.log('[Bootstrap] React Query loaded');

    // Import Para SDK
    const { ParaProvider, Environment } = await import('@getpara/react-sdk');
    await import('@getpara/react-sdk/styles.css');
    console.log('[Bootstrap] Para SDK loaded');

    // Import app components
    const { PermissionProvider } = await import('./contexts/PermissionContext');
    const { default: App } = await import('./App');
    await import('./index.css');
    console.log('[Bootstrap] App components loaded');

    // Get API key
    const PARA_API_KEY = import.meta.env.VITE_PARA_BETA_KEY ||
                         import.meta.env.VITE_PARA_API_KEY ||
                         '';

    if (!PARA_API_KEY) {
      console.warn('[Para] No API key found. Set VITE_PARA_BETA_KEY or VITE_PARA_API_KEY');
    } else {
      console.log('[Para] API key loaded, prefix:', PARA_API_KEY.split('_')[0]);
    }

    // Create React Query client
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          retry: 1,
        },
      },
    });

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Error Boundary Component
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean; error?: Error }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }

      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[Error Boundary]', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            style: {
              padding: '40px',
              textAlign: 'center',
              fontFamily: 'Inter, system-ui, sans-serif',
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #faf5ff 100%)'
            }
          }, React.createElement('div', {
            style: {
              background: 'white',
              padding: '40px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              maxWidth: '500px',
              width: '100%'
            }
          }, [
            React.createElement('h1', { key: 'title', style: { color: '#ef4444', marginBottom: '16px' } }, 'Application Error'),
            React.createElement('pre', {
              key: 'error',
              style: {
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'left',
                overflow: 'auto',
                fontSize: '12px',
                marginBottom: '16px'
              }
            }, this.state.error?.message || 'Unknown error'),
            React.createElement('button', {
              key: 'reload',
              onClick: () => window.location.reload(),
              style: {
                padding: '12px 24px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }
            }, 'Reload')
          ]));
        }
        return this.props.children;
      }
    }

    // Render the app
    console.log('[Bootstrap] Rendering application...');
    createRoot(rootElement).render(
      React.createElement(React.StrictMode, null,
        React.createElement(ErrorBoundary, null,
          React.createElement(QueryClientProvider, { client: queryClient },
            React.createElement(ParaProvider, {
              paraClientConfig: {
                apiKey: PARA_API_KEY,
                env: Environment.BETA,
              },
              config: {
                appName: 'Para Allowance Wallet',
              }
            },
              React.createElement(PermissionProvider, null,
                React.createElement(App, null)
              )
            )
          )
        )
      )
    );

    console.log('[Bootstrap] Application rendered successfully');

    // Clear the timeout set in index.html since app loaded successfully
    if (typeof window !== 'undefined' && (window as unknown as { __appLoadTimeout?: ReturnType<typeof setTimeout> }).__appLoadTimeout) {
      clearTimeout((window as unknown as { __appLoadTimeout: ReturnType<typeof setTimeout> }).__appLoadTimeout);
    }

  } catch (error) {
    console.error('[Bootstrap] Failed to initialize:', error);
    displayFatalError(error, 'Initialization');
  }
}

// Start the application
bootstrap();
