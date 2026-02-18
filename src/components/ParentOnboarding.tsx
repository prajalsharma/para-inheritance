/**
 * Parent Onboarding Component
 *
 * Multi-step wizard for parent setup:
 * 1. Welcome
 * 2. Authenticate with Para (real Para modal)
 * 3. Configure allowance policy:
 *    - Chain: Base (fixed per spec)
 *    - Max USD per transaction (default $15)
 *    - Optional recipient allowlist
 * 4. Review & confirm policy creation
 * 5. Complete
 *
 * Para Policy constructed follows the Permissions Architecture:
 *   Policy → Scopes → Permissions → Conditions
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */

import { useState, useEffect, useRef } from 'react';
import { useParaAuth } from '../hooks/useParaAuth';
import { usePermissions, createInitialPolicyStructure } from '../contexts/PermissionContext';
import {
  SUGGESTED_USD_LIMIT,
  BASE_CHAIN_ID,
  DEFAULT_BLOCKED_ACTIONS,
} from '../types/permissions';

type OnboardingStep = 'welcome' | 'auth' | 'config' | 'review' | 'complete';

const STEPS = ['Welcome', 'Sign In', 'Configure', 'Review', 'Complete'];

interface ParentOnboardingProps {
  onComplete: () => void;
}

export function ParentOnboarding({ onComplete }: ParentOnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [policyName, setPolicyName] = useState('Child Allowance Policy');

  // Per spec: Base is required; $15 is the required default
  const [usdLimit, setUsdLimit] = useState<string>(String(SUGGESTED_USD_LIMIT));
  const [enableUsdLimit, setEnableUsdLimit] = useState(true);

  // Allowlist — optional per spec
  const [enableAllowlist, setEnableAllowlist] = useState(false);
  const [allowlistInput, setAllowlistInput] = useState('');
  const [allowedAddresses, setAllowedAddresses] = useState<string[]>([]);
  const [allowlistError, setAllowlistError] = useState('');

  const { isAuthenticated, wallets, openAuthModal, isParaReady, isModalOpen } = useParaAuth();
  const { createPolicy, userProfile } = usePermissions();
  const hasAutoOpened = useRef(false);

  const handleGetStarted = () => {
    setStep('auth');
    openAuthModal();
  };

  // Auto-open modal when arriving at auth step
  useEffect(() => {
    if (step === 'auth' && isParaReady && !isModalOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const timer = setTimeout(() => openAuthModal(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, isParaReady, isModalOpen, openAuthModal]);

  // Watch for auth completion
  useEffect(() => {
    if (step === 'auth' && isAuthenticated && wallets.length > 0) {
      setStep('config');
    }
  }, [step, isAuthenticated, wallets.length]);

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

  const handleRemoveAddress = (addr: string) => {
    setAllowedAddresses(prev => prev.filter(a => a !== addr));
  };

  const handleConfigComplete = () => {
    if (enableUsdLimit) {
      const limit = parseFloat(usdLimit);
      if (isNaN(limit) || limit <= 0) {
        alert('Please enter a valid positive number for the spending limit.');
        return;
      }
    }
    if (enableAllowlist && allowlistInput.trim()) {
      // Remind parent to add the typed address
      alert('You have an address typed but not added. Click "Add" first or clear the field.');
      return;
    }
    setStep('review');
  };

  const handleCreatePolicy = () => {
    if (!userProfile?.walletAddress) return;

    const policyStructure = createInitialPolicyStructure(userProfile.walletAddress);

    createPolicy({
      ...policyStructure,
      name: policyName,
      restrictToBase: true,                            // Always Base per spec
      allowedChains: [BASE_CHAIN_ID],                  // Base only
      usdLimit: enableUsdLimit ? parseFloat(usdLimit) : undefined,
      allowedAddresses: enableAllowlist && allowedAddresses.length > 0
        ? allowedAddresses
        : undefined,
      blockedActions: DEFAULT_BLOCKED_ACTIONS,         // DEPLOY_CONTRACT + SMART_CONTRACT
    });

    setStep('complete');
  };

  const getStepIndex = () => {
    const map: Record<OnboardingStep, number> = {
      welcome: 0, auth: 1, config: 2, review: 3, complete: 4,
    };
    return map[step];
  };

  const formattedUsdLimit = enableUsdLimit ? `$${usdLimit}` : 'No limit';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50">
      {/* Progress Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {STEPS.map((label, idx) => (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      idx < getStepIndex()
                        ? 'bg-success-500 text-white'
                        : idx === getStepIndex()
                        ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {idx < getStepIndex() ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${idx <= getStepIndex() ? 'text-slate-900' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 md:w-16 h-1 mx-2 rounded ${idx < getStepIndex() ? 'bg-success-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* ── Welcome ── */}
        {step === 'welcome' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Welcome, Parent!</h1>
            <p className="text-lg text-slate-600 mb-10 max-w-md mx-auto">
              Set up a secure allowance wallet for your child using Para's scoped permissions on Base.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[
                { icon: '🔒', title: 'Para MPC Security', desc: 'Para\'s MPC keeps keys secure' },
                { icon: '⛓️', title: 'Base Chain Only', desc: 'Locked to Base network' },
                { icon: '💰', title: 'Spending Limits', desc: 'Max $15 per transaction' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 text-left">
                  <span className="text-2xl mb-3 block">{item.icon}</span>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={handleGetStarted} className="btn-primary btn-lg w-full md:w-auto md:px-12">
              Get Started
            </button>
            <p className="mt-6 text-sm text-slate-500">
              Powered by{' '}
              <a href="https://www.getpara.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                Para
              </a>
            </p>
          </div>
        )}

        {/* ── Auth ── */}
        {step === 'auth' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Create Your Wallet</h1>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Sign in with Para to create your secure embedded wallet. Para is the sole authority for your account and wallet.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-8 mb-8">
              <p className="text-slate-600 mb-6">
                Use the Para modal to sign in with email, phone, or social login.
              </p>
              <button
                onClick={() => {
                  hasAutoOpened.current = false;
                  openAuthModal();
                }}
                className="btn-primary btn-lg"
              >
                Open Sign In with Para
              </button>
              {!isParaReady && (
                <p className="mt-4 text-sm text-warning-600">Para SDK initializing...</p>
              )}
            </div>

            {/* Beta notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
            <button onClick={() => setStep('welcome')} className="btn-ghost">← Back to welcome</button>
          </div>
        )}

        {/* ── Config ── */}
        {step === 'config' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-100 text-success-700 text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-success-500 rounded-full"></span>
                Wallet Created via Para
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Configure Permissions</h1>
              <p className="text-slate-600">Set the rules for your child's allowance wallet.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
              {/* Policy Name */}
              <div className="p-6">
                <label className="label">Policy Name</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={e => setPolicyName(e.target.value)}
                  className="input"
                  placeholder="e.g., Weekly Allowance"
                />
              </div>

              {/* Chain — fixed to Base (non-editable per spec) */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">Blockchain Network</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Required by policy: Base network only
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold border border-blue-200">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Base (Chain 8453)
                  </span>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-blue-700">
                    Transactions restricted to Base (Chain ID: {BASE_CHAIN_ID}). Deploy &amp; smart contract calls are blocked.
                  </span>
                </div>
              </div>

              {/* Spending Limit */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-slate-900">Spending Limit</h3>
                    <p className="text-sm text-slate-500 mt-1">Maximum USD per transaction</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableUsdLimit(!enableUsdLimit)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      enableUsdLimit ? 'bg-primary-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableUsdLimit ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {enableUsdLimit && (
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">$</span>
                      </div>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={usdLimit}
                        onChange={e => setUsdLimit(e.target.value)}
                        className="input pl-7"
                        placeholder="15"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">USD</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Spec default: ${SUGGESTED_USD_LIMIT} USD. Policy condition: VALUE &lt; limit.
                    </p>
                  </div>
                )}
                {!enableUsdLimit && (
                  <div className="p-3 bg-warning-50 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-warning-700">No per-transaction spending limit will be enforced</span>
                  </div>
                )}
              </div>

              {/* Recipient Allowlist (optional) */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-slate-900">Recipient Allowlist</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Optional: restrict transfers to specific addresses only
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEnableAllowlist(!enableAllowlist);
                      if (enableAllowlist) {
                        setAllowedAddresses([]);
                        setAllowlistInput('');
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      enableAllowlist ? 'bg-primary-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableAllowlist ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {enableAllowlist && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={allowlistInput}
                        onChange={e => { setAllowlistInput(e.target.value); setAllowlistError(''); }}
                        placeholder="0x..."
                        className={`input flex-1 font-mono text-sm ${allowlistError ? 'border-danger-500' : ''}`}
                        onKeyDown={e => e.key === 'Enter' && handleAddAddress()}
                      />
                      <button
                        type="button"
                        onClick={handleAddAddress}
                        className="btn-secondary whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                    {allowlistError && (
                      <p className="text-sm text-danger-600">{allowlistError}</p>
                    )}
                    {allowedAddresses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Allowed recipients ({allowedAddresses.length})
                        </p>
                        {allowedAddresses.map(addr => (
                          <div
                            key={addr}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <code className="text-xs text-slate-700 font-mono">{addr}</code>
                            <button
                              type="button"
                              onClick={() => handleRemoveAddress(addr)}
                              className="text-danger-500 hover:text-danger-700 ml-2"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {allowedAddresses.length === 0 && (
                      <p className="text-sm text-slate-500 italic">No addresses added yet. Add at least one to enable the allowlist condition.</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Policy condition: TO_ADDRESS INCLUDED_IN [addresses]
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep('auth')} className="btn-secondary flex-1">Back</button>
              <button onClick={handleConfigComplete} className="btn-primary flex-1">Review Configuration</button>
            </div>
          </div>
        )}

        {/* ── Review ── */}
        {step === 'review' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Review Your Policy</h1>
              <p className="text-slate-600">Confirm the Para permissions before creating the policy.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
              {/* Wallet */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Your Para Wallet</h3>
                <code className="text-sm bg-slate-100 px-3 py-2 rounded-lg block break-all">
                  {wallets[0]?.address}
                </code>
              </div>

              {/* Policy summary */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">Policy: {policyName}</h3>
                <div className="space-y-3">
                  {/* Chain */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Chain</p>
                        <p className="text-sm text-slate-500">Base only (Chain ID: {BASE_CHAIN_ID})</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Required</span>
                  </div>

                  {/* Spending limit */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enableUsdLimit ? 'bg-warning-100' : 'bg-slate-100'}`}>
                        <svg className={`w-5 h-5 ${enableUsdLimit ? 'text-warning-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Spending Limit</p>
                        <p className="text-sm text-slate-500">{formattedUsdLimit} per transaction</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${enableUsdLimit ? 'bg-warning-100 text-warning-700' : 'bg-slate-100 text-slate-600'}`}>
                      {enableUsdLimit ? formattedUsdLimit : 'No limit'}
                    </span>
                  </div>

                  {/* Blocked actions */}
                  <div className="p-4 bg-danger-50 rounded-lg border border-danger-100">
                    <p className="font-medium text-slate-900 mb-2">Blocked Actions</p>
                    <div className="space-y-1">
                      {DEFAULT_BLOCKED_ACTIONS.map(action => (
                        <div key={action} className="flex items-center gap-2 text-sm text-danger-700">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                          </svg>
                          {action === 'DEPLOY_CONTRACT' ? 'No contract deployments' : 'No smart contract calls'}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allowlist */}
                  {enableAllowlist && allowedAddresses.length > 0 && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-900 mb-2">Recipient Allowlist ({allowedAddresses.length} addresses)</p>
                      <div className="space-y-1">
                        {allowedAddresses.map(addr => (
                          <code key={addr} className="block text-xs text-slate-600 font-mono">{addr}</code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Para Policy JSON preview */}
              <div className="p-6 bg-slate-50">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Para Policy Architecture</h3>
                <div className="text-xs text-slate-500 space-y-1 font-mono">
                  <p>Policy → partnerId: "para-allowance-wallet"</p>
                  <p className="pl-4">Scope: "allowance_transfer" (required)</p>
                  <p className="pl-8">Permission: ALLOW TRANSFER on Base</p>
                  {enableUsdLimit && <p className="pl-12">Condition: VALUE &lt; ${usdLimit} (STATIC)</p>}
                  {enableAllowlist && allowedAddresses.length > 0 && <p className="pl-12">Condition: TO_ADDRESS INCLUDED_IN [...] (STATIC)</p>}
                  <p className="pl-4">Scope: "block_deploys" (required)</p>
                  <p className="pl-8">Permission: DENY DEPLOY_CONTRACT on Base</p>
                  <p className="pl-4">Scope: "block_smart_contracts" (required)</p>
                  <p className="pl-8">Permission: DENY SMART_CONTRACT on Base</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep('config')} className="btn-secondary flex-1">Back to Configure</button>
              <button onClick={handleCreatePolicy} className="btn-primary flex-1">Create Policy</button>
            </div>
          </div>
        )}

        {/* ── Complete ── */}
        {step === 'complete' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Setup Complete!</h1>
            <p className="text-slate-600 mb-10 max-w-md mx-auto">
              Your Para wallet and permission policy are ready. Now link your child's wallet.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h3 className="font-semibold text-slate-900 mb-4">Next Steps</h3>
              <div className="space-y-4 text-left">
                {[
                  { num: 1, text: "Create or link your child's wallet in the dashboard" },
                  { num: 2, text: 'Share the child wallet address so they can log in' },
                  { num: 3, text: 'Child logs in with Para and sees their allowance rules' },
                ].map(item => (
                  <div key={item.num} className="flex items-center gap-4">
                    <span className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {item.num}
                    </span>
                    <span className="text-slate-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onComplete} className="btn-primary btn-lg w-full md:w-auto md:px-12">
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
