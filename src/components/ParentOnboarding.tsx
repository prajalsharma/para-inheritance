/**
 * Parent Onboarding Component
 *
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */

import { useState, useEffect, useRef } from 'react';
import { useParaAuth } from '../hooks/useParaAuth';
import { usePermissions, createDefaultPolicy } from '../contexts/PermissionContext';
import styles from './ParentOnboarding.module.css';

type OnboardingStep = 'welcome' | 'auth' | 'policy' | 'complete';

interface ParentOnboardingProps {
  onComplete: () => void;
}

export function ParentOnboarding({ onComplete }: ParentOnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [policyName, setPolicyName] = useState('Allowance Policy');
  const { isAuthenticated, wallets, openAuthModal, isParaReady, isModalOpen } = useParaAuth();
  const { createPolicy, userProfile } = usePermissions();
  const hasAutoOpened = useRef(false);

  const handleCreateWallet = () => {
    console.log('[Para] Get Started clicked, opening auth modal');
    setStep('auth');
    openAuthModal();
  };

  // Auto-open modal when arriving at the auth step
  useEffect(() => {
    if (step === 'auth' && isParaReady && !isModalOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      console.log('[Para] Auto-opening modal for parent auth step');
      // Small delay to ensure state is settled after step change
      const timer = setTimeout(() => openAuthModal(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, isParaReady, isModalOpen, openAuthModal]);

  // Watch for auth completion
  useEffect(() => {
    if (step === 'auth' && isAuthenticated && wallets.length > 0) {
      console.log('[Para] Auth complete, moving to policy step');
      setStep('policy');
    }
  }, [step, isAuthenticated, wallets.length]);

  const handleCreatePolicy = () => {
    if (!userProfile?.walletAddress) return;

    const defaultPolicy = createDefaultPolicy(userProfile.walletAddress);
    createPolicy({
      ...defaultPolicy,
      name: policyName,
    });

    setStep('complete');
  };

  return (
    <div className={styles.container}>
      {step === 'welcome' && (
        <div className={styles.step}>
          <h1>Welcome, Parent!</h1>
          <p className={styles.description}>
            Set up a secure allowance wallet for your child with customizable
            permission controls.
          </p>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>*</span>
              <div>
                <h3>Secure Wallets</h3>
                <p>Para's MPC technology keeps keys safe</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>+</span>
              <div>
                <h3>Merchant Allowlist</h3>
                <p>Control where funds can be sent</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>x</span>
              <div>
                <h3>Block Risky Actions</h3>
                <p>Prevent contract deploys and more</p>
              </div>
            </div>
          </div>

          <button className={styles.primaryButton} onClick={handleCreateWallet}>
            Get Started
          </button>

          <p className={styles.note}>
            Powered by{' '}
            <a
              href="https://docs.getpara.com/v2/concepts/universal-embedded-wallets"
              target="_blank"
              rel="noopener noreferrer"
            >
              Para Universal Embedded Wallets
            </a>
          </p>
        </div>
      )}

      {step === 'auth' && (
        <div className={styles.step}>
          <h1>Create Your Wallet</h1>
          <p className={styles.description}>
            Sign in with Para to create your secure wallet.
          </p>
          <div className={styles.authPrompt}>
            <p>Use the Para modal to sign in with email, phone, or social login.</p>
            <button className={styles.primaryButton} onClick={() => {
              console.log('[Para] Open Login button clicked');
              hasAutoOpened.current = false; // Allow re-open
              openAuthModal();
            }}>
              Open Login
            </button>
            {!isParaReady && (
              <p style={{ color: '#f59e0b', marginTop: '10px' }}>
                Para SDK is still initializing...
              </p>
            )}
          </div>
        </div>
      )}

      {step === 'policy' && (
        <div className={styles.step}>
          <h1>Set Up Policy</h1>
          <p className={styles.description}>
            Create a permission policy that defines what your child can do.
          </p>

          <div className={styles.walletInfo}>
            <p>
              <strong>Your Wallet:</strong>
            </p>
            <code>{wallets[0]?.address}</code>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="policyName">Policy Name</label>
            <input
              id="policyName"
              type="text"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="e.g., Weekly Allowance"
            />
          </div>

          <div className={styles.defaultRules}>
            <h3>Default Security Rules</h3>
            <p>These rules will be enabled by default:</p>
            <ul>
              <li>Block contract deployments</li>
              <li>Block transfers outside allowlist</li>
              <li>Block token spending approvals</li>
            </ul>
            <p className={styles.note}>
              You can customize these in the Policy Settings screen.
            </p>
          </div>

          <button className={styles.primaryButton} onClick={handleCreatePolicy}>
            Create Policy
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div className={styles.step}>
          <div className={styles.successIcon}>Done</div>
          <h1>Setup Complete!</h1>
          <p className={styles.description}>
            Your wallet and policy are ready. Now you can:
          </p>

          <div className={styles.nextSteps}>
            <div className={styles.nextStep}>
              <span>1</span>
              <p>Add merchants to your allowlist</p>
            </div>
            <div className={styles.nextStep}>
              <span>2</span>
              <p>Configure blocked actions</p>
            </div>
            <div className={styles.nextStep}>
              <span>3</span>
              <p>Link your child's account</p>
            </div>
          </div>

          <button className={styles.primaryButton} onClick={onComplete}>
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
