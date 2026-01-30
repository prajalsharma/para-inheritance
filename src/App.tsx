/**
 * Para Allowance Wallet App
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */

import { useState, useMemo, useEffect } from 'react';
import { usePermissions } from './contexts/PermissionContext';
import { useParaAuth } from './hooks/useParaAuth';
import type { UserRole } from './types/permissions';
import { RoleSelector } from './components/RoleSelector';
import { ParentOnboarding } from './components/ParentOnboarding';
import { PermissionPolicyScreen } from './components/PermissionPolicyScreen';
import { ChildView } from './components/ChildView';
import { Navigation } from './components/Navigation';
import './App.css';

type AppView = 'role-select' | 'parent-onboarding' | 'parent-dashboard' | 'child-view';

function App() {
  const [manualView, setManualView] = useState<AppView | null>(null);
  const { userProfile, currentPolicy } = usePermissions();
  const { isAuthenticated, isParaReady } = useParaAuth();

  const computedView = useMemo((): AppView => {
    if (userProfile && isAuthenticated) {
      if (userProfile.role === 'child') {
        return 'child-view';
      } else if (currentPolicy) {
        return 'parent-dashboard';
      } else {
        return 'parent-onboarding';
      }
    }
    return 'role-select';
  }, [userProfile, isAuthenticated, currentPolicy]);

  const view = manualView ?? computedView;

  // Reset manual view when auth state changes (e.g., after login completes)
  useEffect(() => {
    if (isAuthenticated && manualView === 'parent-onboarding') {
      // Stay on onboarding - the component handles the auth->policy transition
    } else if (isAuthenticated && manualView === 'child-view') {
      // Stay on child view - now showing the authenticated child dashboard
    }
  }, [isAuthenticated, manualView]);

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'parent') {
      setManualView('parent-onboarding');
    } else {
      setManualView('child-view');
    }
  };

  const handleOnboardingComplete = () => {
    setManualView('parent-dashboard');
  };

  const handleLogout = () => {
    setManualView('role-select');
  };

  if (!isParaReady) {
    return (
      <div className="app">
        <div className="auth-prompt-container">
          <div className="auth-prompt">
            <h1>Loading...</h1>
            <p>Initializing Para SDK...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {view === 'role-select' && (
        <RoleSelector onRoleSelect={handleRoleSelect} />
      )}

      {view === 'parent-onboarding' && (
        <div className="app-content">
          <ParentOnboarding onComplete={handleOnboardingComplete} />
        </div>
      )}

      {view === 'parent-dashboard' && (
        <>
          <Navigation onLogout={handleLogout} />
          <main className="app-main">
            <PermissionPolicyScreen />
          </main>
        </>
      )}

      {view === 'child-view' && (
        <>
          {isAuthenticated ? (
            <>
              <Navigation onLogout={handleLogout} />
              <main className="app-main">
                <ChildView />
              </main>
            </>
          ) : (
            <ChildAuthPrompt onBack={() => setManualView('role-select')} />
          )}
        </>
      )}
    </div>
  );
}

function ChildAuthPrompt({ onBack }: { onBack: () => void }) {
  const { openAuthModal, isParaReady } = useParaAuth();

  // Auto-open modal when child auth prompt mounts
  useEffect(() => {
    if (isParaReady) {
      console.log('[Para] Auto-opening modal for child auth');
      openAuthModal();
    }
  }, [isParaReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="auth-prompt-container">
      <div className="auth-prompt">
        <h1>Login to View Your Wallet</h1>
        <p>
          Sign in to view your allowance rules and wallet information.
        </p>

        <button className="auth-button" onClick={openAuthModal}>
          Sign In with Para
        </button>

        <button className="back-link" onClick={onBack}>
          Back to role selection
        </button>

        <p className="powered-by">
          Powered by{' '}
          <a
            href="https://docs.getpara.com/v2/concepts/universal-embedded-wallets"
            target="_blank"
            rel="noopener noreferrer"
          >
            Para Universal Embedded Wallets
          </a>
        </p>
      </div>
    </div>
  );
}

export default App;
