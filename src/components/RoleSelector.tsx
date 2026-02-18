/**
 * Role Selector Component
 *
 * Initial screen that lets users choose their role:
 * - Parent: Creates and manages allowance policies
 * - Child: Views their allowance rules (read-only)
 *
 * Design: Modern fintech onboarding with clear visual hierarchy
 */

import { usePermissions } from '../contexts/PermissionContext';
import type { UserRole } from '../types/permissions';

interface RoleSelectorProps {
  onRoleSelect: (role: UserRole) => void;
}

export function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  const { setUserRole } = usePermissions();

  const handleSelect = (role: UserRole) => {
    setUserRole(role);
    onRoleSelect(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-6">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Para Allowance Wallet
          </h1>
          <p className="text-lg text-slate-600 max-w-md mx-auto">
            Secure crypto allowances with parent-controlled permissions
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Parent Card */}
          <button
            onClick={() => handleSelect('parent')}
            className="group relative bg-white rounded-2xl border-2 border-slate-200 p-8 text-left transition-all duration-300 hover:border-primary-400 hover:shadow-elevated focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>

            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary-200 transition-colors">
              <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              I'm a Parent
            </h2>
            <p className="text-slate-600 mb-6">
              Create a wallet and set up allowance rules for your child.
            </p>

            <ul className="space-y-3">
              {[
                'Create secure embedded wallets',
                'Set up child wallets on Base',
                'Configure spending limits',
                'Block risky transactions',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-success-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <span className="inline-flex items-center text-sm font-medium text-primary-600 group-hover:text-primary-700">
                Get started as parent
                <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </button>

          {/* Child Card */}
          <button
            onClick={() => handleSelect('child')}
            className="group relative bg-white rounded-2xl border-2 border-slate-200 p-8 text-left transition-all duration-300 hover:border-primary-400 hover:shadow-elevated focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>

            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary-200 transition-colors">
              <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              I'm a Child
            </h2>
            <p className="text-slate-600 mb-6">
              View your allowance rules and use your wallet within set limits.
            </p>

            <ul className="space-y-3">
              {[
                'Transact within parent-set rules',
                'Stay within spending limits',
                'View your wallet balance',
                'Use wallet safely',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <span className="inline-flex items-center text-sm font-medium text-primary-600 group-hover:text-primary-700">
                Sign in as child
                <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
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
