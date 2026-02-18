/**
 * Navigation Component
 *
 * Modern top navigation bar with user info and logout.
 * Design: Clean, minimal fintech style header
 *
 * Includes wallet button in profile area for children to open Para wallet UI.
 */

import { useParaAuth } from '../hooks/useParaAuth';
import { usePermissions } from '../contexts/PermissionContext';
import { useParaWallet } from '../hooks/useParaWallet';

interface NavigationProps {
  onLogout: () => void;
}

export function Navigation({ onLogout }: NavigationProps) {
  const { email, wallets, logout } = useParaAuth();
  const { userProfile } = usePermissions();
  const { openWallet, canOpenWallet } = useParaWallet();
  const isChild = userProfile?.role === 'child';

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900">Allowance Wallet</h1>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    userProfile?.role === 'parent'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {userProfile?.role === 'parent' ? 'Parent' : 'Child'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-right">
              {email && (
                <div>
                  <p className="text-sm font-medium text-slate-900">{email}</p>
                  {wallets[0] && (
                    <p className="text-xs text-slate-500 font-mono">
                      {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-4)}
                    </p>
                  )}
                </div>
              )}
              {/* Wallet button for children */}
              {isChild && canOpenWallet && (
                <button
                  onClick={openWallet}
                  className="w-9 h-9 bg-primary-100 hover:bg-primary-200 rounded-full flex items-center justify-center transition-colors"
                  title="Open Wallet"
                >
                  <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </button>
              )}
              {/* Profile icon (non-clickable for now) */}
              {(!isChild || !canOpenWallet) && (
                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
