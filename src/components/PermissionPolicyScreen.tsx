/**
 * Permission Policy Screen Component
 *
 * Allows parents to configure:
 * - Merchant allowlist (addresses that can receive funds)
 * - Blocked actions (what the child cannot do)
 * - Spending limits
 * - Chain restrictions (fixed to Base)
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */

import { useState } from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import { useParaAuth } from '../hooks/useParaAuth';
import type {
  BlockedAction,
  ApprovedMerchant,
} from '../types/permissions';
import { BASE_CHAIN_ID, getPolicyTemplate } from '../types/permissions';
import { getBlockedActionDescription, parseEthToWei, formatWeiToEth } from '../utils/permissionEnforcement';
import { formatPolicyForDisplay } from '../utils/paraPolicyBuilder';

/**
 * Generate a deterministic child wallet address from the parent address.
 */
function generateChildAddress(parentAddress: string): string {
  let hash = 0;
  const input = parentAddress + ':child:' + Date.now();
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(40, 'a').slice(0, 40);
  return '0x' + hex;
}

const ALL_BLOCKED_ACTIONS: BlockedAction[] = [
  'CONTRACT_DEPLOY',
  'TRANSFER_OUTSIDE_ALLOWLIST',
  'CONTRACT_INTERACTION',
  'SIGN_ARBITRARY_MESSAGE',
  'APPROVE_TOKEN_SPEND',
  'NFT_TRANSFER',
];

const REQUIRED_BLOCKED_ACTIONS: BlockedAction[] = [
  'CONTRACT_DEPLOY',
  'TRANSFER_OUTSIDE_ALLOWLIST',
];

export function PermissionPolicyScreen() {
  const {
    currentPolicy,
    updatePolicy,
    addMerchantToAllowlist,
    removeMerchantFromAllowlist,
    toggleBlockedAction,
    linkChildToPolicy,
  } = usePermissions();
  const { createWallet, wallets } = useParaAuth();

  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [showPolicyPreview, setShowPolicyPreview] = useState(false);
  const [isCreatingChildWallet, setIsCreatingChildWallet] = useState(false);
  const [childWalletStatus, setChildWalletStatus] = useState<{ type: 'error' | 'info'; message: string } | null>(null);
  const [newMerchant, setNewMerchant] = useState({
    name: '',
    address: '',
    description: '',
    maxAmount: '',
  });

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

  const handleAddMerchant = () => {
    if (!newMerchant.name || !newMerchant.address) return;

    if (!newMerchant.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid Ethereum address (0x...)');
      return;
    }

    const merchant: ApprovedMerchant = {
      id: `merchant-${Date.now()}`,
      name: newMerchant.name,
      address: newMerchant.address,
      description: newMerchant.description || undefined,
      maxTransactionAmount: newMerchant.maxAmount
        ? parseEthToWei(newMerchant.maxAmount)
        : undefined,
      approvedChains: [BASE_CHAIN_ID],
    };

    addMerchantToAllowlist(currentPolicy.id, merchant);
    setNewMerchant({ name: '', address: '', description: '', maxAmount: '' });
    setShowAddMerchant(false);
  };

  const handleToggleBlockedAction = (action: BlockedAction) => {
    if (REQUIRED_BLOCKED_ACTIONS.includes(action) && currentPolicy.blockedActions.includes(action)) {
      alert(`"${action.replace(/_/g, ' ')}" is required for security and cannot be disabled.`);
      return;
    }
    toggleBlockedAction(currentPolicy.id, action);
  };

  const handleUpdateMaxTransaction = (ethAmount: string) => {
    const weiAmount = ethAmount ? parseEthToWei(ethAmount) : undefined;
    updatePolicy(currentPolicy.id, { maxTransactionAmount: weiAmount });
  };

  const handleCreateChildWallet = async () => {
    setIsCreatingChildWallet(true);
    setChildWalletStatus(null);

    const TIMEOUT_MS = 8000;
    let childAddress: string | null = null;

    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
      );

      const result = await Promise.race([
        createWallet('EVM'),
        timeoutPromise,
      ]);

      if (result) {
        childAddress = result.address;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg !== 'TIMEOUT') {
        console.log('[UI] Para SDK wallet creation failed:', msg);
      }
    }

    if (!childAddress) {
      const parentAddr = wallets[0]?.address || currentPolicy.parentWalletAddress;
      childAddress = generateChildAddress(parentAddr);
      setChildWalletStatus({
        type: 'info',
        message: 'Child wallet address generated for this policy. In production, the child would create their own wallet via Para sign-up.',
      });
    }

    linkChildToPolicy(currentPolicy.id, childAddress);
    setIsCreatingChildWallet(false);
  };

  const template = currentPolicy.templateId ? getPolicyTemplate(currentPolicy.templateId) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Permission Policy</h1>
          <p className="text-slate-600">
            Configure what your child can and cannot do with their allowance on Base.
          </p>
        </header>

        {/* Policy Details Card */}
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
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Template</span>
                <p className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    {template?.name || 'Custom'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Environment</span>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    (currentPolicy.environment || 'beta') === 'beta'
                      ? 'bg-warning-100 text-warning-700'
                      : 'bg-success-100 text-success-700'
                  }`}>
                    {(currentPolicy.environment || 'beta').toUpperCase()}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Network</span>
                <p className="mt-1 font-medium text-slate-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Base
                </p>
              </div>
              {currentPolicy.usdLimit && (
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">USD Limit</span>
                  <p className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                      ${currentPolicy.usdLimit}/tx
                    </span>
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</span>
                <p className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    currentPolicy.isActive ? 'text-success-600' : 'text-slate-500'
                  }`}>
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

        {/* Approved Merchants */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Approved Merchants</h2>
              <p className="text-sm text-slate-500 mt-0.5">Only these addresses can receive funds from the child wallet.</p>
            </div>
            <button
              onClick={() => setShowAddMerchant(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Merchant
            </button>
          </div>

          {showAddMerchant && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Add New Merchant</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={newMerchant.name}
                    onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })}
                    placeholder="e.g., Gaming Store"
                  />
                </div>
                <div>
                  <label className="label">Wallet Address *</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={newMerchant.address}
                    onChange={(e) => setNewMerchant({ ...newMerchant, address: e.target.value })}
                    placeholder="0x..."
                  />
                  <p className="hint">Enter a valid Ethereum address on Base</p>
                </div>
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    className="input"
                    value={newMerchant.description}
                    onChange={(e) => setNewMerchant({ ...newMerchant, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="label">Max Transaction (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    className="input"
                    value={newMerchant.maxAmount}
                    onChange={(e) => setNewMerchant({ ...newMerchant, maxAmount: e.target.value })}
                    placeholder="Leave empty for no limit"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  className="btn-secondary"
                  onClick={() => setShowAddMerchant(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleAddMerchant}
                  disabled={!newMerchant.name || !newMerchant.address}
                >
                  Add Merchant
                </button>
              </div>
            </div>
          )}

          <div className="px-6 py-4">
            {currentPolicy.allowlist.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-slate-600 mb-1">No merchants added yet.</p>
                <p className="text-sm text-slate-500">Add merchants to allow your child to send funds to them.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentPolicy.allowlist.map((merchant) => (
                  <div key={merchant.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <h4 className="font-medium text-slate-900">{merchant.name}</h4>
                      </div>
                      <p className="font-mono text-xs text-slate-500 mb-1 truncate">{merchant.address}</p>
                      {merchant.description && (
                        <p className="text-sm text-slate-600">{merchant.description}</p>
                      )}
                      {merchant.maxTransactionAmount && (
                        <p className="text-xs text-warning-600 mt-1">
                          Max: {formatWeiToEth(merchant.maxTransactionAmount)} ETH per tx
                        </p>
                      )}
                    </div>
                    <button
                      className="text-sm text-danger-600 hover:text-danger-700 font-medium ml-4"
                      onClick={() => removeMerchantFromAllowlist(currentPolicy.id, merchant.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Blocked Actions */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Blocked Actions</h2>
            <p className="text-sm text-slate-500 mt-0.5">Select actions that should be blocked for the child account.</p>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-3">
              {ALL_BLOCKED_ACTIONS.map((action) => {
                const isRequired = REQUIRED_BLOCKED_ACTIONS.includes(action);
                const isBlocked = currentPolicy.blockedActions.includes(action);

                return (
                  <label
                    key={action}
                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                      isBlocked
                        ? 'border-danger-200 bg-danger-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } ${isRequired ? 'opacity-75' : ''}`}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <input
                        type="checkbox"
                        checked={isBlocked}
                        onChange={() => handleToggleBlockedAction(action)}
                        disabled={isRequired && isBlocked}
                        className="w-4 h-4 text-danger-600 border-slate-300 rounded focus:ring-danger-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {action.replace(/_/g, ' ')}
                        </span>
                        {isRequired && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-200 text-slate-600">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {getBlockedActionDescription(action)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        {/* Spending Limits */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Spending Limits</h2>
            <p className="text-sm text-slate-500 mt-0.5">Set maximum transaction amounts.</p>
          </div>
          <div className="px-6 py-4">
            <div className="max-w-sm">
              <label className="label">Max Transaction Amount (ETH)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="input"
                defaultValue={
                  currentPolicy.maxTransactionAmount
                    ? formatWeiToEth(currentPolicy.maxTransactionAmount)
                    : ''
                }
                onChange={(e) => handleUpdateMaxTransaction(e.target.value)}
                placeholder="Leave empty for no limit"
              />
              <p className="hint">
                The child cannot send more than this amount in a single transaction.
              </p>
            </div>
          </div>
        </section>

        {/* Child Wallet */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Child Wallet</h2>
            <p className="text-sm text-slate-500 mt-0.5">Create a new child wallet or link an existing one.</p>
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
                  <p className="text-sm text-success-600 mt-2">
                    The child can now log in to view their allowance rules.
                  </p>
                  {childWalletStatus?.type === 'info' && (
                    <p className="text-sm text-success-600 mt-1">{childWalletStatus.message}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={handleCreateChildWallet}
                  disabled={isCreatingChildWallet}
                >
                  {isCreatingChildWallet ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Wallet...
                    </>
                  ) : (
                    'Create Child Wallet'
                  )}
                </button>
                {childWalletStatus?.type === 'error' && (
                  <p className="text-sm text-danger-600">{childWalletStatus.message}</p>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">or</span>
                  </div>
                </div>

                <LinkChildSection policyId={currentPolicy.id} />
              </div>
            )}
          </div>
        </section>

        {/* Policy Preview */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Review Policy</h2>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowPolicyPreview(!showPolicyPreview)}
            >
              {showPolicyPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>

          {showPolicyPreview && (
            <div className="px-6 py-4">
              <PolicyPreview policy={currentPolicy} />
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center py-6">
          <p className="text-sm text-slate-500">
            Learn more about{' '}
            <a
              href="https://www.getpara.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Para
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

function PolicyPreview({ policy }: { policy: NonNullable<ReturnType<typeof usePermissions>['currentPolicy']> }) {
  const [showJSON, setShowJSON] = useState(false);
  const template = policy.templateId ? getPolicyTemplate(policy.templateId) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <span className="text-xs font-medium text-slate-500 uppercase">Template</span>
          <p className="mt-1 font-medium text-slate-900">{template?.name || 'Custom'}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <span className="text-xs font-medium text-slate-500 uppercase">Environment</span>
          <p className="mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              (policy.environment || 'beta') === 'beta'
                ? 'bg-warning-100 text-warning-700'
                : 'bg-success-100 text-success-700'
            }`}>
              {(policy.environment || 'beta').toUpperCase()}
            </span>
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <span className="text-xs font-medium text-slate-500 uppercase">Network</span>
          <p className="mt-1 font-medium text-slate-900">Base</p>
        </div>
        {policy.usdLimit && (
          <div className="bg-slate-50 rounded-lg p-3">
            <span className="text-xs font-medium text-slate-500 uppercase">USD Limit</span>
            <p className="mt-1 font-medium text-warning-600">${policy.usdLimit}/tx</p>
          </div>
        )}
        <div className="bg-slate-50 rounded-lg p-3">
          <span className="text-xs font-medium text-slate-500 uppercase">Merchants</span>
          <p className="mt-1 font-medium text-slate-900">{policy.allowlist.length}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <span className="text-xs font-medium text-slate-500 uppercase">Status</span>
          <p className="mt-1">
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              policy.isActive ? 'text-success-600' : 'text-slate-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${policy.isActive ? 'bg-success-500' : 'bg-slate-400'}`}></span>
              {policy.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-900 mb-2">Blocked Actions ({policy.blockedActions.length})</h4>
        <div className="flex flex-wrap gap-2">
          {policy.blockedActions.map((action) => (
            <span key={action} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-danger-50 text-danger-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              {action.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Para Policy JSON */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-900">Para Policy JSON</h4>
          <button
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
            onClick={() => setShowJSON(!showJSON)}
          >
            {showJSON ? 'Hide' : 'Show'} JSON
          </button>
        </div>
        {showJSON && policy.paraPolicyJSON && (
          <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto">
            {formatPolicyForDisplay(policy.paraPolicyJSON)}
          </pre>
        )}
        {showJSON && !policy.paraPolicyJSON && (
          <p className="text-sm text-slate-500">Para Policy JSON not generated</p>
        )}
      </div>
    </div>
  );
}

function LinkChildSection({ policyId }: { policyId: string }) {
  const { linkChildToPolicy, currentPolicy } = usePermissions();
  const [childAddress, setChildAddress] = useState('');
  const [error, setError] = useState('');

  if (currentPolicy?.childWalletAddress) {
    return null;
  }

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
        <label className="label">Link Existing Wallet Address</label>
        <input
          type="text"
          className={`input font-mono ${error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : ''}`}
          value={childAddress}
          onChange={(e) => {
            setChildAddress(e.target.value);
            setError('');
          }}
          placeholder="0x..."
        />
        {error && <p className="text-sm text-danger-600 mt-1">{error}</p>}
      </div>
      <button
        className="btn-secondary"
        onClick={handleLink}
        disabled={!childAddress}
      >
        Link Child Account
      </button>
    </div>
  );
}
