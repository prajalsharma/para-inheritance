/**
 * Child View Component
 *
 * Shows the child their allowance wallet information on first login:
 * - Human-readable allowance rules (what they can/cannot do)
 * - Raw Para Policy JSON (optional view)
 *
 * Rules come from the Para Policy constructed by the parent:
 *   - Chain: Base only
 *   - Max transaction value (USD)
 *   - Blocked: DEPLOY_CONTRACT, SMART_CONTRACT
 *   - Optional: recipient address allowlist
 *
 * Children CANNOT modify their policy — view only.
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */

import { useState } from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { useParaAuth } from '../hooks/useParaAuth';
import { BASE_CHAIN_ID } from '../types/permissions';
import {
  formatPolicyForDisplay,
  getUsdLimitFromPolicy,
  getDeniedActionsFromPolicy,
  getAllowedAddressesFromPolicy,
} from '../utils/paraPolicyBuilder';

export function ChildView() {
  const { currentPolicy } = usePermissions();
  const { wallets, email } = useParaAuth();
  const [showPolicyJSON, setShowPolicyJSON] = useState(false);

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

  // Derive display values
  const isBaseOnly =
    currentPolicy.restrictToBase ||
    (currentPolicy.allowedChains.length === 1 && currentPolicy.allowedChains[0] === BASE_CHAIN_ID);

  const hasSpendingLimit =
    currentPolicy.usdLimit !== undefined && currentPolicy.usdLimit > 0;

  // Derive denied actions from Para policy JSON (most authoritative)
  const deniedActions = currentPolicy.paraPolicyJSON
    ? getDeniedActionsFromPolicy(currentPolicy.paraPolicyJSON)
    : currentPolicy.blockedActions;

  // Derive allowlist from Para policy JSON
  const allowedAddresses = currentPolicy.paraPolicyJSON
    ? getAllowedAddressesFromPolicy(currentPolicy.paraPolicyJSON)
    : (currentPolicy.allowedAddresses || null);

  // Derive USD limit from Para policy JSON (most authoritative)
  const policyUsdLimit = currentPolicy.paraPolicyJSON
    ? getUsdLimitFromPolicy(currentPolicy.paraPolicyJSON)
    : currentPolicy.usdLimit ?? null;

  const humanDeniedLabels: Record<string, string> = {
    DEPLOY_CONTRACT: 'No contract deployments',
    SMART_CONTRACT: 'No smart contract calls',
    SIGN_MESSAGE: 'No arbitrary message signing',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">My Allowance Wallet</h1>
          <p className="text-slate-600">Your wallet rules set by your parent — enforced by Para.</p>
        </header>

        {/* ── Human-Readable Rules (prominent) ── */}
        <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 rounded-2xl border-2 border-primary-200 shadow-sm mb-6 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-5">Your Allowance Rules</h2>

          {/* What you CAN do */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-success-700 uppercase tracking-wide mb-3">Allowed</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-slate-800">
                  Transfers on <strong>Base</strong> network only{isBaseOnly ? ' (Chain 8453)' : ''}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-slate-800">
                  {hasSpendingLimit || policyUsdLimit
                    ? <>Send up to <strong>${policyUsdLimit ?? currentPolicy.usdLimit} USD</strong> per transaction</>
                    : 'Send transactions (no spending limit set)'}
                </span>
              </li>
              {allowedAddresses && allowedAddresses.length > 0 && (
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-slate-800">
                      Send to <strong>{allowedAddresses.length} approved address{allowedAddresses.length !== 1 ? 'es' : ''}</strong> only
                    </span>
                    <div className="mt-2 space-y-1">
                      {allowedAddresses.map(addr => (
                        <code key={addr} className="block text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-600">
                          {addr}
                        </code>
                      ))}
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>

          {/* What you CANNOT do */}
          <div>
            <p className="text-sm font-semibold text-danger-700 uppercase tracking-wide mb-3">Blocked</p>
            <ul className="space-y-3">
              {deniedActions.map(action => (
                <li key={action} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-danger-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-800">{humanDeniedLabels[action] || action}</span>
                </li>
              ))}
              {!isBaseOnly && (
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-danger-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-800">No transactions outside allowed chains</span>
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* ── Para Policy JSON (raw, optional view) ── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Para Policy JSON</h2>
              <p className="text-sm text-slate-500 mt-0.5">Raw policy submitted to Para for enforcement</p>
            </div>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowPolicyJSON(!showPolicyJSON)}
            >
              {showPolicyJSON ? 'Hide' : 'View'} Policy JSON
            </button>
          </div>
          {showPolicyJSON && (
            <div className="px-6 py-4">
              {currentPolicy.paraPolicyJSON ? (
                <>
                  <div className="mb-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 font-mono space-y-1">
                    <p><span className="text-slate-400">// Structure: Policy → Scopes → Permissions → Conditions</span></p>
                    <p><span className="text-slate-400">// Enforcement: Para Backend (not client-side)</span></p>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto leading-relaxed">
                    {formatPolicyForDisplay(currentPolicy.paraPolicyJSON)}
                  </pre>
                </>
              ) : (
                <p className="text-sm text-slate-500 italic">Para Policy JSON not generated for this policy.</p>
              )}
            </div>
          )}
        </section>

        {/* ── My Wallet ── */}
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
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Wallet Address (Para)</span>
                <p className="mt-1 font-mono text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg break-all">
                  {wallets[0].address}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Parent Info ── */}
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
