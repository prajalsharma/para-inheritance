/**
 * Parent Onboarding Component
 *
 * Multi-step wizard for parent setup:
 * 1. Welcome
 * 2. Authenticate with Para
 * 3. Configure permissions (parent explicitly selects)
 * 4. Review & confirm policy creation
 *
 * IMPORTANT: Parent must explicitly configure all permissions.
 * No hardcoded defaults - only suggested presets.
 *
 * Design: Modern SaaS onboarding wizard with step indicators
 */

import { useState, useEffect, useRef } from 'react';
import { useParaAuth } from '../hooks/useParaAuth';
import { usePermissions, createInitialPolicyStructure } from '../contexts/PermissionContext';
import {
  SUGGESTED_USD_LIMIT,
  BASE_CHAIN_ID,
  ALL_ALLOWED_CHAINS,
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

  // Permission configuration state - parent must explicitly set these
  const [restrictToBase, setRestrictToBase] = useState(false);
  const [usdLimit, setUsdLimit] = useState<string>(String(SUGGESTED_USD_LIMIT));
  const [enableUsdLimit, setEnableUsdLimit] = useState(true);

  const { isAuthenticated, wallets, openAuthModal, isParaReady, isModalOpen } = useParaAuth();
  const { createPolicy, userProfile } = usePermissions();
  const hasAutoOpened = useRef(false);

  const handleGetStarted = () => {
    setStep('auth');
    openAuthModal();
  };

  // Auto-open modal when arriving at the auth step
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

  const handleConfigComplete = () => {
    // Validate USD limit if enabled
    if (enableUsdLimit) {
      const limit = parseFloat(usdLimit);
      if (isNaN(limit) || limit <= 0) {
        alert('Please enter a valid positive number for the spending limit.');
        return;
      }
    }
    setStep('review');
  };

  const handleCreatePolicy = () => {
    if (!userProfile?.walletAddress) return;

    const policyStructure = createInitialPolicyStructure(userProfile.walletAddress);

    // Build policy with parent's explicit selections
    createPolicy({
      ...policyStructure,
      name: policyName,
      restrictToBase,
      allowedChains: restrictToBase ? [BASE_CHAIN_ID] : ALL_ALLOWED_CHAINS,
      usdLimit: enableUsdLimit ? parseFloat(usdLimit) : undefined,
      blockedActions: DEFAULT_BLOCKED_ACTIONS,
    });

    setStep('complete');
  };

  const getStepIndex = () => {
    const stepMap: Record<OnboardingStep, number> = {
      welcome: 0,
      auth: 1,
      config: 2,
      review: 3,
      complete: 4,
    };
    return stepMap[step];
  };

  // Format the USD limit for display
  const formattedUsdLimit = enableUsdLimit ? `$${usdLimit}` : 'No limit';
  const chainDisplay = restrictToBase ? 'Base only' : 'Any supported chain';

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
        {step === 'welcome' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              Welcome, Parent!
            </h1>
            <p className="text-lg text-slate-600 mb-10 max-w-md mx-auto">
              Set up a secure allowance wallet for your child with customizable permission controls.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[
                { icon: '🔒', title: 'MPC Security', desc: 'Para\'s MPC technology keeps keys safe' },
                { icon: '⚙️', title: 'Your Rules', desc: 'You control all permissions' },
                { icon: '💰', title: 'Spending Limits', desc: 'Set custom transaction limits' },
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

        {step === 'auth' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              Create Your Wallet
            </h1>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Sign in with Para to create your secure embedded wallet.
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
                Open Sign In
              </button>
              {!isParaReady && (
                <p className="mt-4 text-sm text-warning-600">
                  Para SDK is still initializing...
                </p>
              )}
            </div>

            {/* Beta environment notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-800 mb-1">Beta Environment</h4>
                  <p className="text-sm text-amber-700">
                    For testing, use email: <code className="bg-amber-100 px-1 rounded">yourname@test.getpara.com</code>
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Any OTP code works (e.g., <code className="bg-amber-100 px-1 rounded">123456</code>)
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => setStep('welcome')} className="btn-ghost">
              ← Back to welcome
            </button>
          </div>
        )}

        {step === 'config' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-100 text-success-700 text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-success-500 rounded-full"></span>
                Wallet Created
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Configure Permissions
              </h1>
              <p className="text-slate-600">
                Set the rules for your child's wallet. You control everything.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
              {/* Policy Name */}
              <div className="p-6">
                <label className="label">Policy Name</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="input"
                  placeholder="e.g., Weekly Allowance"
                />
              </div>

              {/* Chain Restriction Toggle */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">Restrict to Base Network</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {restrictToBase
                        ? 'Child can only transact on Base'
                        : 'Child can transact on any supported chain'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRestrictToBase(!restrictToBase)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      restrictToBase ? 'bg-primary-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        restrictToBase ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {restrictToBase && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-blue-700">
                      Transactions will only be allowed on Base (Chain ID: {BASE_CHAIN_ID})
                    </span>
                  </div>
                )}
              </div>

              {/* Spending Limit */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-slate-900">Set Spending Limit</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Maximum amount per transaction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableUsdLimit(!enableUsdLimit)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      enableUsdLimit ? 'bg-primary-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableUsdLimit ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
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
                        onChange={(e) => setUsdLimit(e.target.value)}
                        className="input pl-7"
                        placeholder="Enter amount"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">USD</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Suggested: ${SUGGESTED_USD_LIMIT} USD. You can set any amount.
                    </p>
                  </div>
                )}

                {!enableUsdLimit && (
                  <div className="p-3 bg-warning-50 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-warning-700">
                      No spending limit will be enforced
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep('auth')} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={handleConfigComplete} className="btn-primary flex-1">
                Review Configuration
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Review Your Policy
              </h1>
              <p className="text-slate-600">
                Confirm the permissions before creating the policy.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
              {/* Wallet Info */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Your Wallet</h3>
                <code className="text-sm bg-slate-100 px-3 py-2 rounded-lg block break-all">
                  {wallets[0]?.address}
                </code>
              </div>

              {/* Policy Summary */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">Policy: {policyName}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${restrictToBase ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <svg className={`w-5 h-5 ${restrictToBase ? 'text-blue-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Chain Restriction</p>
                        <p className="text-sm text-slate-500">{chainDisplay}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${restrictToBase ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {restrictToBase ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

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
                </div>
              </div>

              {/* Child View Preview */}
              <div className="p-6 bg-primary-50">
                <h3 className="text-sm font-medium text-primary-800 mb-3">Your child will see:</h3>
                <div className="bg-white rounded-lg p-4 border border-primary-200">
                  <p className="text-slate-700 font-medium mb-2">You can only:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Transact on {restrictToBase ? 'Base' : 'any supported chain'}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Send transactions up to {formattedUsdLimit} USD
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep('config')} className="btn-secondary flex-1">
                Back to Configure
              </button>
              <button onClick={handleCreatePolicy} className="btn-primary flex-1">
                Create Policy
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              Setup Complete!
            </h1>
            <p className="text-slate-600 mb-10 max-w-md mx-auto">
              Your wallet and policy are ready. Now you can link your child's wallet.
            </p>

            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h3 className="font-semibold text-slate-900 mb-4">Next Steps</h3>
              <div className="space-y-4 text-left">
                {[
                  { num: 1, text: 'Link your child\'s wallet account' },
                  { num: 2, text: 'Fund the child wallet' },
                  { num: 3, text: 'Your child can start using their allowance' },
                ].map((item) => (
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
