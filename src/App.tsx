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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Loading...</h1>
          <p className="text-slate-600">Initializing Para SDK...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {view === 'role-select' && (
        <RoleSelector onRoleSelect={handleRoleSelect} />
      )}

      {view === 'parent-onboarding' && (
        <ParentOnboarding onComplete={handleOnboardingComplete} />
      )}

      {view === 'parent-dashboard' && (
        <>
          <Navigation onLogout={handleLogout} />
          <main>
            <PermissionPolicyScreen />
          </main>
        </>
      )}

      {view === 'child-view' && (
        <>
          {isAuthenticated ? (
            <>
              <Navigation onLogout={handleLogout} />
              <main>
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

  useEffect(() => {
    if (isParaReady) {
      console.log('[Para] Auto-opening modal for child auth');
      openAuthModal();
    }
  }, [isParaReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Login to View Your Wallet
        </h1>
        <p className="text-slate-600 mb-8">
          Sign in to view your allowance rules and wallet information.
        </p>

        <button
          onClick={openAuthModal}
          className="w-full btn-primary btn-lg mb-4"
        >
          Sign In with Para
        </button>

        {/* Beta environment notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-amber-800 mb-1">Beta Environment</h4>
              <p className="text-sm text-amber-700">
                Use email: <code className="bg-amber-100 px-1 rounded">yourname@test.getpara.com</code>
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Any OTP code works (e.g., <code className="bg-amber-100 px-1 rounded">123456</code>)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          Back to role selection
        </button>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
            <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-slate-600">
              Powered by{' '}
              <a
                href="https://www.getpara.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 hover:text-primary-600 transition-colors"
              >
                Para
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
