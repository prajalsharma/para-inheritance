/**
 * Permission Policy Screen Component
 *
 * Parent dashboard that shows:
 * - Child wallet rules (summary of the Para policy)
 * - Editable permission settings (USD limit, allowlist)
 * - Para Policy JSON preview (full hierarchy)
 * - Child wallet linking
 *
 * The Para Policy follows the official Permissions Architecture:
 *   Policy → Scopes → Permissions → Conditions
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */

import { useState } from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { useParaAuth } from '../hooks/useParaAuth';
import type { PermissionPolicy } from '../types/permissions';
import { BASE_CHAIN_ID, SUGGESTED_USD_LIMIT, DEFAULT_BLOCKED_ACTIONS } from '../types/permissions';
import {
  formatPolicyForDisplay,
  getUsdLimitFromPolicy,
  getDeniedActionsFromPolicy,
  getAllowedAddressesFromPolicy,
} from '../utils/paraPolicyBuilder';
import {
  createChildWalletViaServer,
  isPaymentRequired,
  getWalletCreationFee,
} from '../services/walletService';

export function PermissionPolicyScreen() {
  const { currentPolicy, toggleBlockedAction, linkChildToPolicy } = usePermissions();
  const { wallets } = useParaAuth();

  const [showPolicyPreview, setShowPolicyPreview] = useState(false);
  const [isCreatingChildWallet, setIsCreatingChildWallet] = useState(false);
  const [childWalletStatus, setChildWalletStatus] = useState<{ type: 'error' | 'info'; message: string } | null>(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);

  const paymentRequired = isPaymentRequired();
  const walletFee = getWalletCreationFee();

  if (!currentPolicy) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Policy Found</h2>
          <p className="text-slate-600">Please complete the onboarding process first.</p>
        </div>
      </div>
    );
  }

  // Derive display values from Para policy JSON (most authoritative)
  const policyUsdLimit = currentPolicy.paraPolicyJSON
    ? getUsdLimitFromPolicy(currentPolicy.paraPolicyJSON)
    : currentPolicy.usdLimit ?? null;

  const deniedActions = currentPolicy.paraPolicyJSON
    ? getDeniedActionsFromPolicy(currentPolicy.paraPolicyJSON)
    : DEFAULT_BLOCKED_ACTIONS;

  const allowedAddresses = currentPolicy.paraPolicyJSON
    ? getAllowedAddressesFromPolicy(currentPolicy.paraPolicyJSON)
    : (currentPolicy.allowedAddresses || null);

  const hasUsdLimit = policyUsdLimit !== null && policyUsdLimit > 0;
  const usdLimitDisplay = hasUsdLimit ? `$${policyUsdLimit}` : 'No limit';

  const handleToggleBlockedAction = (action: (typeof DEFAULT_BLOCKED_ACTIONS)[number]) => {
    // DEPLOY_CONTRACT and SMART_CONTRACT are required per spec
    if (['DEPLOY_CONTRACT', 'SMART_CONTRACT'].includes(action) && currentPolicy.blockedActions.includes(action)) {
      alert(`"${action.replace(/_/g, ' ')}" is required for security and cannot be disabled.`);
      return;
    }
    toggleBlockedAction(currentPolicy.id, action);
  };

  const handleCreateChildWallet = async () => {
    setIsCreatingChildWallet(true);
    setChildWalletStatus(null);
    setShowPaymentConfirm(false);

    const parentAddress = wallets[0]?.address || currentPolicy.parentWalletAddress;
    if (!parentAddress) {
      setChildWalletStatus({ type: 'error', message: 'Parent wallet address not found. Please reconnect.' });
      setIsCreatingChildWallet(false);
      return;
    }

    try {
      const result = await createChildWalletViaServer({
        parentWalletAddress: parentAddress,
        restrictToBase: true,
        maxUsd: currentPolicy.usdLimit,
        policyName: currentPolicy.name,
        devMode: !paymentRequired,
      });

      if (result.success && result.walletAddress) {
        linkChildToPolicy(currentPolicy.id, result.walletAddress);
        setChildWalletStatus({ type: 'info', message: 'Child wallet created successfully and linked to your policy.' });
      } else {
        throw new Error(result.error || 'Server returned no wallet address');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setChildWalletStatus({
        type: 'error',
        message: `Failed to create wallet: ${msg}. You can also link an existing wallet address below.`,
      });
    } finally {
      setIsCreatingChildWallet(false);
    }
  };

  const handlePayAndCreate = () => {
    if (paymentRequired) {
      setShowPaymentConfirm(true);
    } else {
      handleCreateChildWallet();
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Permission Policy</h1>
          <p className="text-slate-600">Configure what your child can and cannot do with their allowance.</p>
        </header>

        {/* ── Child Wallet Rules — Prominent Display ── */}
        <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 rounded-2xl border-2 border-primary-200 shadow-sm mb-6 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-5">Child Wallet Rules</h2>

          <div className="mb-5">
            <p className="text-sm font-semibold text-success-700 uppercase tracking-wide mb-3">Allowed</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-primary-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Transfers on Base only</p>
                  <p className="text-xs text-slate-500">Chain ID: {BASE_CHAIN_ID}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-primary-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Max {usdLimitDisplay} per tx</p>
                  <p className="text-xs text-slate-500">{hasUsdLimit ? 'USD spending limit' : 'No limit set'}</p>
                </div>
              </div>
            </div>
            {allowedAddresses && allowedAddresses.length > 0 && (
              <div className="mt-3 bg-white rounded-xl border border-primary-200 p-4">
                <p className="font-semibold text-slate-900 text-sm mb-2">
                  Recipient Allowlist ({allowedAddresses.length} addresses)
                </p>
                <div className="space-y-1">
                  {allowedAddresses.map(addr => (
                    <code key={addr} className="block text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded">
                      {addr}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-danger-700 uppercase tracking-wide mb-3">Blocked</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {deniedActions.map(action => (
                <div key={action} className="bg-white rounded-xl border border-danger-200 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{humanDeniedLabels[action] || action}</p>
                    <p className="text-xs text-slate-500">DENY {action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Policy Settings — Editable ── */}
        <PolicySettingsSection policy={currentPolicy} />

        {/* ── Policy Details ── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Policy Details</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Policy Name</span>
                <p className="mt-1 font-medium text-slate-900">{currentPolicy.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</span>
                <p className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${currentPolicy.isActive ? 'text-success-600' : 'text-slate-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${currentPolicy.isActive ? 'bg-success-500' : 'bg-slate-400'}`}></span>
                    {currentPolicy.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Parent Wallet</span>
              <p className="mt-1 font-mono text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg break-all">
                {currentPolicy.parentWalletAddress}
              </p>
            </div>
            {currentPolicy.childWalletAddress && (
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Child Wallet</span>
                <p className="mt-1 font-mono text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg break-all">
                  {currentPolicy.childWalletAddress}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Child Wallet Creation / Linking ── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Child Wallet</h2>
            <p className="text-sm text-slate-500 mt-0.5">Create a child wallet via Para or link an existing one.</p>
          </div>
          <div className="px-6 py-4">
            {currentPolicy.childWalletAddress ? (
              <div className="flex items-start gap-4 p-4 bg-success-50 rounded-lg border border-success-200">
                <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-success-800">Child wallet linked!</p>
                  <p className="font-mono text-sm text-success-700 mt-1 break-all">{currentPolicy.childWalletAddress}</p>
                  <p className="text-sm text-success-600 mt-2">The child can log in with Para to view their allowance rules.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {showPaymentConfirm && (
                  <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                    <p className="font-semibold text-primary-800 mb-1">Confirm Wallet Creation</p>
                    <p className="text-sm text-primary-600 mb-3">A fee of ${walletFee} will be charged.</p>
                    <div className="flex gap-2">
                      <button className="btn-primary btn-sm" onClick={handleCreateChildWallet} disabled={isCreatingChildWallet}>
                        {isCreatingChildWallet ? 'Processing...' : 'Confirm & Pay'}
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setShowPaymentConfirm(false)} disabled={isCreatingChildWallet}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!showPaymentConfirm && (
                  <button
                    className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
                    onClick={handlePayAndCreate}
                    disabled={isCreatingChildWallet}
                  >
                    {isCreatingChildWallet ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {paymentRequired ? `Pay $${walletFee} & Create Wallet` : 'Create Child Wallet via Para'}
                      </>
                    )}
                  </button>
                )}

                {childWalletStatus?.type === 'error' && (
                  <p className="text-sm text-danger-600">{childWalletStatus.message}</p>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">or link existing wallet</span>
                  </div>
                </div>

                <LinkChildSection policyId={currentPolicy.id} />
              </div>
            )}
          </div>
        </section>

        {/* ── Para Policy JSON Preview ── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Para Policy JSON</h2>
              <p className="text-sm text-slate-500 mt-0.5">Full policy hierarchy: Policy → Scopes → Permissions → Conditions</p>
            </div>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowPolicyPreview(!showPolicyPreview)}
            >
              {showPolicyPreview ? 'Hide' : 'Show'} JSON
            </button>
          </div>
          {showPolicyPreview && (
            <div className="px-6 py-4">
              {currentPolicy.paraPolicyJSON ? (
                <>
                  <div className="mb-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 font-mono space-y-1">
                    <p>// Scopes: {currentPolicy.paraPolicyJSON.scopes.length} (allowance_transfer, block_deploys, block_smart_contracts)</p>
                    <p>// Chain: Base ({BASE_CHAIN_ID})</p>
                    <p>// Condition type: STATIC</p>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto leading-relaxed">
                    {formatPolicyForDisplay(currentPolicy.paraPolicyJSON)}
                  </pre>
                </>
              ) : (
                <p className="text-sm text-slate-500 italic">Para Policy JSON not generated. Re-save policy settings to regenerate.</p>
              )}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center py-6">
          <p className="text-sm text-slate-500">
            Learn more about{' '}
            <a href="https://www.getpara.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium">
              Para
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

/**
 * Policy Settings Section — allows parent to edit USD limit and allowlist
 */
function PolicySettingsSection({ policy }: { policy: PermissionPolicy }) {
  const { updatePolicy } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [enableUsdLimit, setEnableUsdLimit] = useState(policy.usdLimit !== undefined && policy.usdLimit > 0);
  const [usdLimit, setUsdLimit] = useState(policy.usdLimit?.toString() || String(SUGGESTED_USD_LIMIT));
  const [enableAllowlist, setEnableAllowlist] = useState((policy.allowedAddresses?.length ?? 0) > 0);
  const [allowlistInput, setAllowlistInput] = useState('');
  const [allowedAddresses, setAllowedAddresses] = useState<string[]>(policy.allowedAddresses || []);
  const [allowlistError, setAllowlistError] = useState('');

  const hasUsdLimit = policy.usdLimit !== undefined && policy.usdLimit > 0;

  const handleAddAddress = () => {
    const addr = allowlistInput.trim();
    if (!addr) return;
    if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      setAllowlistError('Enter a valid Ethereum address (0x...)');
      return;
    }
    if (allowedAddresses.includes(addr.toLowerCase())) {
      setAllowlistError('Address already in list');
      return;
    }
    setAllowedAddresses(prev => [...prev, addr.toLowerCase()]);
    setAllowlistInput('');
    setAllowlistError('');
  };

  const handleSave = () => {
    const parsed = parseFloat(usdLimit);
    const newUsdLimit = enableUsdLimit && !isNaN(parsed) && parsed > 0 ? parsed : undefined;
    const newAllowedAddresses = enableAllowlist && allowedAddresses.length > 0
      ? allowedAddresses
      : undefined;

    updatePolicy(policy.id, {
      usdLimit: newUsdLimit,
      allowedAddresses: newAllowedAddresses,
      allowedChains: [BASE_CHAIN_ID],
      restrictToBase: true,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEnableUsdLimit(policy.usdLimit !== undefined && policy.usdLimit > 0);
    setUsdLimit(policy.usdLimit?.toString() || String(SUGGESTED_USD_LIMIT));
    setEnableAllowlist((policy.allowedAddresses?.length ?? 0) > 0);
    setAllowedAddresses(policy.allowedAddresses || []);
    setAllowlistInput('');
    setAllowlistError('');
    setIsEditing(false);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Permission Settings</h2>
        {!isEditing ? (
          <button className="btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
            Edit Settings
          </button>
        ) : (
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={handleCancel}>Cancel</button>
            <button className="btn-primary btn-sm" onClick={handleSave}>Save Changes</button>
          </div>
        )}
      </div>
      <div className="px-6 py-4 space-y-4">
        {isEditing ? (
          <>
            {/* Chain — fixed, non-editable */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg opacity-75">
              <div>
                <p className="font-medium text-slate-900">Blockchain</p>
                <p className="text-sm text-slate-500">Base network (required by policy spec)</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                Base (locked)
              </span>
            </div>

            {/* USD Limit */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Spending Limit</p>
                  <p className="text-sm text-slate-500">Max USD per transaction (STATIC VALUE condition)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableUsdLimit(!enableUsdLimit)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${enableUsdLimit ? 'bg-primary-600' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableUsdLimit ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {enableUsdLimit && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={usdLimit}
                    onChange={e => setUsdLimit(e.target.value)}
                    className="input w-32"
                    placeholder="15"
                  />
                  <span className="text-slate-500">USD per transaction</span>
                </div>
              )}
            </div>

            {/* Allowlist */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Recipient Allowlist</p>
                  <p className="text-sm text-slate-500">Restrict to specific addresses (TO_ADDRESS INCLUDED_IN)</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEnableAllowlist(!enableAllowlist); if (enableAllowlist) { setAllowedAddresses([]); setAllowlistInput(''); } }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${enableAllowlist ? 'bg-primary-600' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableAllowlist ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {enableAllowlist && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={allowlistInput}
                      onChange={e => { setAllowlistInput(e.target.value); setAllowlistError(''); }}
                      placeholder="0x..."
                      className={`input flex-1 font-mono text-sm ${allowlistError ? 'border-danger-500' : ''}`}
                      onKeyDown={e => e.key === 'Enter' && handleAddAddress()}
                    />
                    <button type="button" onClick={handleAddAddress} className="btn-secondary whitespace-nowrap">Add</button>
                  </div>
                  {allowlistError && <p className="text-sm text-danger-600">{allowlistError}</p>}
                  {allowedAddresses.map(addr => (
                    <div key={addr} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                      <code className="text-xs font-mono text-slate-700">{addr}</code>
                      <button type="button" onClick={() => setAllowedAddresses(prev => prev.filter(a => a !== addr))} className="text-danger-500 hover:text-danger-700 ml-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {allowedAddresses.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No addresses added. Add at least one to enable the condition.</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Chain</span>
              <p className="mt-1 font-medium text-slate-900">Base only</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Spending Limit</span>
              <p className="mt-1 font-medium text-slate-900">
                {hasUsdLimit ? `$${policy.usdLimit}/tx` : 'No limit'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Allowlist</span>
              <p className="mt-1 font-medium text-slate-900">
                {(policy.allowedAddresses?.length ?? 0) > 0
                  ? `${policy.allowedAddresses!.length} address${policy.allowedAddresses!.length !== 1 ? 'es' : ''}`
                  : 'Any recipient'}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LinkChildSection({ policyId }: { policyId: string }) {
  const { linkChildToPolicy, currentPolicy } = usePermissions();
  const [childAddress, setChildAddress] = useState('');
  const [error, setError] = useState('');

  if (currentPolicy?.childWalletAddress) return null;

  const handleLink = () => {
    if (!childAddress) return;
    if (!childAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }
    linkChildToPolicy(policyId, childAddress);
    setChildAddress('');
    setError('');
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Child's Wallet Address</label>
        <input
          type="text"
          className={`input font-mono ${error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : ''}`}
          value={childAddress}
          onChange={e => { setChildAddress(e.target.value); setError(''); }}
          placeholder="0x..."
        />
        {error && <p className="text-sm text-danger-600 mt-1">{error}</p>}
      </div>
      <button className="btn-secondary" onClick={handleLink} disabled={!childAddress}>
        Link Child Account
      </button>
    </div>
  );
}
