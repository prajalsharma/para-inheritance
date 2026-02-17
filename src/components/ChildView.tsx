/**
 * Child View Component
 *
 * Shows the child their:
 * - Wallet information
 * - Permission rules (read-only)
 *
 * Displays the ACTUAL configured values set by parent:
 * - Chain restriction (Base only or any chain)
 * - Spending limit (parent-defined amount)
 *
 * Children CANNOT modify their policy - they can only view it.
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */

import { usePermissions } from '../contexts/PermissionContext';
import { useParaAuth } from '../hooks/useParaAuth';
import { BASE_CHAIN_ID } from '../types/permissions';
import { TransactionTester } from './TransactionTester';

export function ChildView() {
  const { currentPolicy } = usePermissions();
  const { wallets, email } = useParaAuth();

  if (!currentPolicy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-warning-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Account Not Linked</h2>
          <p className="text-slate-600 mb-6">
            Your wallet is not linked to a parent account yet.
            Ask your parent to add your wallet address to their policy.
          </p>
          {wallets[0] && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-sm text-slate-500 mb-2">Share this address with your parent:</p>
              <code className="block bg-slate-50 px-4 py-3 rounded-lg text-sm font-mono text-slate-700 break-all">
                {wallets[0].address}
              </code>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Determine chain display
  const isBaseOnly = currentPolicy.restrictToBase ||
    (currentPolicy.allowedChains.length === 1 && currentPolicy.allowedChains[0] === BASE_CHAIN_ID);
  const chainDisplay = isBaseOnly ? 'Base' : 'Any supported chain';

  // Determine spending limit display
  const hasSpendingLimit = currentPolicy.usdLimit !== undefined && currentPolicy.usdLimit > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">My Allowance Wallet</h1>
          <p className="text-slate-600">
            View your wallet rules set by your parent.
          </p>
        </header>

        {/* My Rules - Simple Display (EXACT as required) */}
        <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 rounded-2xl border-2 border-primary-200 shadow-sm mb-6 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">You can:</h2>
          <ul className="space-y-2 text-slate-900">
            <li className="flex items-center gap-2">
              <span className="text-primary-600">•</span>
              <span>{isBaseOnly ? 'Transact only on Base' : `Transact on ${chainDisplay}`}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary-600">•</span>
              <span>{hasSpendingLimit ? `Send transactions up to $${currentPolicy.usdLimit} USDC` : 'Send transactions (no limit set)'}</span>
            </li>
          </ul>
        </section>

        {/* My Wallet */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">My Wallet</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            {email && (
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</span>
                <p className="mt-1 font-medium text-slate-900">{email}</p>
              </div>
            )}
            {wallets[0] && (
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Wallet Address</span>
                <p className="mt-1 font-mono text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg break-all">
                  {wallets[0].address}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Parent Info */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Parent Account</h2>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-slate-500 mb-2">Your rules are managed by:</p>
            <p className="font-mono text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg break-all">
              {currentPolicy.parentWalletAddress}
            </p>
          </div>
        </section>

        {/* Transaction Tester - Demonstrates Para Policy Enforcement */}
        {currentPolicy.childWalletAddress && (
          <section className="mb-6">
            <TransactionTester
              walletAddress={currentPolicy.childWalletAddress}
              allowedChains={currentPolicy.allowedChains}
              usdLimit={currentPolicy.usdLimit}
            />
          </section>
        )}

        {/* Footer */}
        <footer className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm text-slate-600">
              Rules enforced by{' '}
              <a
                href="https://www.getpara.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Para
              </a>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
