/**
 * Parent Onboarding Component
 *
 * Multi-step wizard for parent setup:
 * 1. Welcome
 * 2. Configure policy template & environment
 * 3. Authenticate with Para
 * 4. Confirm policy creation
 *
 * Design: Modern SaaS onboarding wizard with step indicators
 */

import { useState, useEffect, useRef } from 'react';
import { useParaAuth } from '../hooks/useParaAuth';
import { usePermissions, createDefaultPolicy } from '../contexts/PermissionContext';
import { PolicySelector, EnvironmentSelector, PolicyPreviewPanel } from './PolicySelector';
import { getPolicyTemplate } from '../types/permissions';

type OnboardingStep = 'welcome' | 'config' | 'auth' | 'policy' | 'complete';

const STEPS = ['Welcome', 'Configure', 'Sign In', 'Review', 'Complete'];

interface ParentOnboardingProps {
  onComplete: () => void;
}

export function ParentOnboarding({ onComplete }: ParentOnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [policyName, setPolicyName] = useState('Allowance Policy');
  const { isAuthenticated, wallets, openAuthModal, isParaReady, isModalOpen } = useParaAuth();
  const {
    createPolicy,
    userProfile,
    selectedEnvironment,
    selectedTemplate,
    setSelectedEnvironment,
    setSelectedTemplate,
  } = usePermissions();
  const hasAutoOpened = useRef(false);

  // Update policy name when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const template = getPolicyTemplate(selectedTemplate);
      if (template) {
        setPolicyName(template.name);
      }
    }
  }, [selectedTemplate]);

  const handleGetStarted = () => {
    setStep('config');
  };

  const handleConfigComplete = () => {
    if (!selectedTemplate) {
      return;
    }
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
      setStep('policy');
    }
  }, [step, isAuthenticated, wallets.length]);

  const handleCreatePolicy = () => {
    if (!userProfile?.walletAddress || !selectedTemplate) return;

    const defaultPolicy = createDefaultPolicy(
      userProfile.walletAddress,
      selectedTemplate,
      selectedEnvironment
    );
    createPolicy({
      ...defaultPolicy,
      name: policyName,
    });

    setStep('complete');
  };

  const getStepIndex = () => {
    const stepMap: Record<OnboardingStep, number> = {
      welcome: 0,
      config: 1,
      auth: 2,
      policy: 3,
      complete: 4,
    };
    return stepMap[step];
  };

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
                  <div className={`w-12 md:w-24 h-1 mx-2 rounded ${idx < getStepIndex() ? 'bg-success-500' : 'bg-slate-200'}`} />
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
                { icon: '📋', title: 'Allowlists', desc: 'Control where funds can be sent' },
                { icon: '🚫', title: 'Block Risks', desc: 'Prevent risky transactions' },
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

        {step === 'config' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Configure Your Policy
              </h1>
              <p className="text-slate-600">
                Select your environment and permission policy template.
              </p>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <EnvironmentSelector
                  selectedEnvironment={selectedEnvironment}
                  onSelect={setSelectedEnvironment}
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <PolicySelector
                  selectedTemplate={selectedTemplate}
                  onSelect={setSelectedTemplate}
                />
              </div>

              {selectedTemplate && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                  <PolicyPreviewPanel
                    policy={{
                      templateName: getPolicyTemplate(selectedTemplate)?.name || '',
                      environment: selectedEnvironment,
                      chain: 'Base (8453)',
                      usdLimit: getPolicyTemplate(selectedTemplate)?.usdLimit || null,
                      merchantCount: 0,
                      blockedActions: ['deploy', 'transfer outside allowlist'],
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep('welcome')} className="btn-secondary flex-1">
                Back
              </button>
              <button
                onClick={handleConfigComplete}
                disabled={!selectedTemplate}
                className="btn-primary flex-1"
              >
                Continue to Sign In
              </button>
            </div>
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

            <button onClick={() => setStep('config')} className="btn-ghost">
              ← Back to configuration
            </button>
          </div>
        )}

        {step === 'policy' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-100 text-success-700 text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-success-500 rounded-full"></span>
                Wallet Created
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Review Your Policy
              </h1>
              <p className="text-slate-600">
                Confirm the policy settings before creation.
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

              {/* Policy Summary */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">Policy Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-slate-500">Environment</span>
                    <p className="font-medium text-slate-900 flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${selectedEnvironment === 'beta' ? 'bg-warning-500' : 'bg-success-500'}`}></span>
                      {selectedEnvironment.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Template</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {getPolicyTemplate(selectedTemplate || 'base-only')?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Network</span>
                    <p className="font-medium text-slate-900 mt-1">Base</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Spending Limit</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {getPolicyTemplate(selectedTemplate || 'base-only')?.usdLimit
                        ? `$${getPolicyTemplate(selectedTemplate || 'base-only')?.usdLimit}`
                        : 'No limit'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Rules */}
              <div className="p-6 bg-warning-50">
                <h3 className="text-sm font-medium text-warning-800 mb-3">Security Rules Enabled</h3>
                <ul className="space-y-2">
                  {[
                    'Block contract deployments',
                    'Block transfers outside allowlist',
                    'Block token spending approvals',
                    ...(selectedTemplate === 'safe-spend' ? ['Max $15 USD per transaction'] : []),
                  ].map((rule, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-warning-700">
                      <svg className="w-4 h-4 text-warning-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button onClick={handleCreatePolicy} className="btn-primary btn-lg w-full mt-8">
              Create Policy
            </button>
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
              Your wallet and policy are ready. Now you can configure your child's allowance.
            </p>

            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h3 className="font-semibold text-slate-900 mb-4">Next Steps</h3>
              <div className="space-y-4 text-left">
                {[
                  { num: 1, text: 'Add merchants to your allowlist' },
                  { num: 2, text: 'Configure blocked actions' },
                  { num: 3, text: 'Link your child\'s account' },
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
