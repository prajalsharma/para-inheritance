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
import { BASE_CHAIN_ID } from '../types/permissions';
import { getBlockedActionDescription, parseEthToWei, formatWeiToEth } from '../utils/permissionEnforcement';
import styles from './PermissionPolicyScreen.module.css';

/**
 * Generate a deterministic child wallet address from the parent address.
 * Used as a fallback when Para SDK wallet creation hangs (e.g., user already has an EVM wallet).
 * In production, the child would create their own wallet via Para auth.
 */
function generateChildAddress(parentAddress: string): string {
  let hash = 0;
  const input = parentAddress + ':child:' + Date.now();
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(40, 'a').slice(0, 40);
  return '0x' + hex;
}

/**
 * All available blocked actions for the allowance wallet
 * CONTRACT_DEPLOY and TRANSFER_OUTSIDE_ALLOWLIST are required for security
 */
const ALL_BLOCKED_ACTIONS: BlockedAction[] = [
  'CONTRACT_DEPLOY',
  'TRANSFER_OUTSIDE_ALLOWLIST',
  'CONTRACT_INTERACTION',
  'SIGN_ARBITRARY_MESSAGE',
  'APPROVE_TOKEN_SPEND',
  'NFT_TRANSFER',
];

/**
 * Required blocked actions that cannot be disabled
 * These are critical security rules for the allowance wallet
 */
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
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>No Policy Found</h2>
          <p>Please complete the onboarding process first.</p>
        </div>
      </div>
    );
  }

  const handleAddMerchant = () => {
    if (!newMerchant.name || !newMerchant.address) return;

    // Validate address format
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
      approvedChains: [BASE_CHAIN_ID], // Fixed to Base
    };

    addMerchantToAllowlist(currentPolicy.id, merchant);
    setNewMerchant({ name: '', address: '', description: '', maxAmount: '' });
    setShowAddMerchant(false);
  };

  const handleToggleBlockedAction = (action: BlockedAction) => {
    // Prevent disabling required security actions
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

  /**
   * Create a child wallet.
   *
   * Attempts to create a new EVM wallet via Para SDK with a timeout.
   * Para's embedded wallet model ties wallets to user sessions, so creating
   * a second EVM wallet may hang if one already exists. In that case we
   * generate a child wallet address to demonstrate the policy flow.
   *
   * In production, the child would sign up separately via Para and the
   * parent would link the child's real wallet address.
   *
   * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
   */
  const handleCreateChildWallet = async () => {
    setIsCreatingChildWallet(true);
    setChildWalletStatus(null);

    const TIMEOUT_MS = 8000;
    let childAddress: string | null = null;

    try {
      // Race the SDK call against a timeout
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
      );

      console.log('[UI] Attempting Para SDK wallet creation...');
      const result = await Promise.race([
        createWallet('EVM'),
        timeoutPromise,
      ]);

      if (result) {
        childAddress = result.address;
        console.log('[UI] Para SDK wallet created:', childAddress);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg === 'TIMEOUT') {
        console.log('[UI] Para SDK wallet creation timed out, using generated address');
      } else {
        console.log('[UI] Para SDK wallet creation failed:', msg);
      }
    }

    // Fallback: generate a child wallet address for the demo
    if (!childAddress) {
      const parentAddr = wallets[0]?.address || currentPolicy.parentWalletAddress;
      childAddress = generateChildAddress(parentAddr);
      console.log('[UI] Generated child wallet address:', childAddress);
      setChildWalletStatus({
        type: 'info',
        message: 'Child wallet address generated for this policy. In production, the child would create their own wallet via Para sign-up.',
      });
    }

    linkChildToPolicy(currentPolicy.id, childAddress);
    setIsCreatingChildWallet(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Permission Policy</h1>
        <p className={styles.subtitle}>
          Configure what your child can and cannot do with their allowance on Base.
        </p>
      </header>

      {/* Policy Info */}
      <section className={styles.section}>
        <h2>Policy Details</h2>
        <div className={styles.policyInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Policy Name:</span>
            <span>{currentPolicy.name}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Network:</span>
            <span className={styles.chainBadge}>Base (Chain ID: {BASE_CHAIN_ID})</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Status:</span>
            <span className={currentPolicy.isActive ? styles.active : styles.inactive}>
              {currentPolicy.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Parent Wallet:</span>
            <code className={styles.address}>{currentPolicy.parentWalletAddress}</code>
          </div>
          {currentPolicy.childWalletAddress && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Child Wallet:</span>
              <code className={styles.address}>{currentPolicy.childWalletAddress}</code>
            </div>
          )}
        </div>
      </section>

      {/* Merchant Allowlist */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Approved Merchants</h2>
          <button
            className={styles.addButton}
            onClick={() => setShowAddMerchant(true)}
          >
            + Add Merchant
          </button>
        </div>
        <p className={styles.sectionDescription}>
          Only these addresses can receive funds from the child wallet.
          Transfers to any other address will be blocked.
        </p>

        {showAddMerchant && (
          <div className={styles.addMerchantForm}>
            <h3>Add New Merchant</h3>
            <div className={styles.formGroup}>
              <label>Name *</label>
              <input
                type="text"
                value={newMerchant.name}
                onChange={(e) =>
                  setNewMerchant({ ...newMerchant, name: e.target.value })
                }
                placeholder="e.g., Gaming Store"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Wallet Address *</label>
              <input
                type="text"
                value={newMerchant.address}
                onChange={(e) =>
                  setNewMerchant({ ...newMerchant, address: e.target.value })
                }
                placeholder="0x..."
              />
              <p className={styles.hint}>Enter a valid Ethereum address on Base</p>
            </div>
            <div className={styles.formGroup}>
              <label>Description</label>
              <input
                type="text"
                value={newMerchant.description}
                onChange={(e) =>
                  setNewMerchant({ ...newMerchant, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Max Transaction (ETH)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={newMerchant.maxAmount}
                onChange={(e) =>
                  setNewMerchant({ ...newMerchant, maxAmount: e.target.value })
                }
                placeholder="Leave empty for no limit"
              />
            </div>
            <div className={styles.formActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowAddMerchant(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={handleAddMerchant}
                disabled={!newMerchant.name || !newMerchant.address}
              >
                Add Merchant
              </button>
            </div>
          </div>
        )}

        <div className={styles.merchantList}>
          {currentPolicy.allowlist.length === 0 ? (
            <div className={styles.emptyList}>
              <p>No merchants added yet.</p>
              <p className={styles.hint}>
                Add merchants to allow your child to send funds to them.
              </p>
            </div>
          ) : (
            currentPolicy.allowlist.map((merchant) => (
              <div key={merchant.id} className={styles.merchantCard}>
                <div className={styles.merchantInfo}>
                  <h4>{merchant.name}</h4>
                  <code className={styles.merchantAddress}>{merchant.address}</code>
                  {merchant.description && (
                    <p className={styles.merchantDescription}>
                      {merchant.description}
                    </p>
                  )}
                  {merchant.maxTransactionAmount && (
                    <p className={styles.merchantLimit}>
                      Max per tx: {formatWeiToEth(merchant.maxTransactionAmount)} ETH
                    </p>
                  )}
                </div>
                <button
                  className={styles.removeButton}
                  onClick={() =>
                    removeMerchantFromAllowlist(currentPolicy.id, merchant.id)
                  }
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Blocked Actions */}
      <section className={styles.section}>
        <h2>Blocked Actions</h2>
        <p className={styles.sectionDescription}>
          Select actions that should be blocked for the child account.
          Some actions are required for security.
        </p>

        <div className={styles.blockedActionsList}>
          {ALL_BLOCKED_ACTIONS.map((action) => {
            const isRequired = REQUIRED_BLOCKED_ACTIONS.includes(action);
            const isBlocked = currentPolicy.blockedActions.includes(action);

            return (
              <label
                key={action}
                className={`${styles.actionToggle} ${isRequired ? styles.requiredAction : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isBlocked}
                  onChange={() => handleToggleBlockedAction(action)}
                  disabled={isRequired && isBlocked}
                />
                <span className={styles.toggleSlider}></span>
                <div className={styles.actionInfo}>
                  <span className={styles.actionName}>
                    {action.replace(/_/g, ' ')}
                    {isRequired && <span className={styles.requiredBadge}>Required</span>}
                  </span>
                  <span className={styles.actionDescription}>
                    {getBlockedActionDescription(action)}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {/* Spending Limits */}
      <section className={styles.section}>
        <h2>Spending Limits</h2>
        <p className={styles.sectionDescription}>
          Set maximum transaction amounts.
        </p>

        <div className={styles.formGroup}>
          <label>Max Transaction Amount (ETH)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            defaultValue={
              currentPolicy.maxTransactionAmount
                ? formatWeiToEth(currentPolicy.maxTransactionAmount)
                : ''
            }
            onChange={(e) => handleUpdateMaxTransaction(e.target.value)}
            placeholder="Leave empty for no limit"
          />
          <p className={styles.hint}>
            The child cannot send more than this amount in a single transaction.
          </p>
        </div>
      </section>

      {/* Create/Link Child Wallet */}
      <section className={styles.section}>
        <h2>Child Wallet</h2>
        <p className={styles.sectionDescription}>
          Create a new child wallet or link an existing one to this policy.
        </p>

        {currentPolicy.childWalletAddress ? (
          <div className={styles.linkedStatus}>
            <span className={styles.linkedIcon}>✓</span>
            <div>
              <p><strong>Child wallet linked!</strong></p>
              <code>{currentPolicy.childWalletAddress}</code>
              <p className={styles.hint}>
                The child can now log in to view their allowance rules.
              </p>
              {childWalletStatus?.type === 'info' && (
                <p className={styles.hint}>{childWalletStatus.message}</p>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.childWalletOptions}>
            <button
              className={styles.createWalletButton}
              onClick={handleCreateChildWallet}
              disabled={isCreatingChildWallet}
            >
              {isCreatingChildWallet ? 'Creating Wallet...' : 'Create Child Wallet'}
            </button>
            {childWalletStatus?.type === 'error' && (
              <p className={styles.errorText}>{childWalletStatus.message}</p>
            )}
            <div className={styles.orDivider}>
              <span>or</span>
            </div>
            <LinkChildSection policyId={currentPolicy.id} />
          </div>
        )}
      </section>

      {/* Policy Preview */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Review Policy</h2>
          <button
            className={styles.previewButton}
            onClick={() => setShowPolicyPreview(!showPolicyPreview)}
          >
            {showPolicyPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {showPolicyPreview && (
          <PolicyPreview policy={currentPolicy} />
        )}
      </section>

      <footer className={styles.footer}>
        <p>
          Learn more about{' '}
          <a
            href="https://docs.getpara.com/v2/react/guides/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Para Permissions
          </a>
        </p>
      </footer>
    </div>
  );
}

/**
 * Policy Preview Component
 *
 * Shows a summary of the policy configuration for confirmation
 */
function PolicyPreview({ policy }: { policy: NonNullable<ReturnType<typeof usePermissions>['currentPolicy']> }) {
  return (
    <div className={styles.policyPreview}>
      <h3>Policy Summary</h3>

      <div className={styles.previewSection}>
        <h4>Network</h4>
        <p>Base (Chain ID: {BASE_CHAIN_ID})</p>
      </div>

      <div className={styles.previewSection}>
        <h4>Approved Merchants ({policy.allowlist.length})</h4>
        {policy.allowlist.length === 0 ? (
          <p className={styles.previewWarning}>
            No merchants approved. Child cannot send funds to anyone.
          </p>
        ) : (
          <ul>
            {policy.allowlist.map((m) => (
              <li key={m.id}>
                {m.name} - {m.address.slice(0, 10)}...
                {m.maxTransactionAmount && ` (max: ${formatWeiToEth(m.maxTransactionAmount)} ETH)`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.previewSection}>
        <h4>Blocked Actions ({policy.blockedActions.length})</h4>
        <ul>
          {policy.blockedActions.map((action) => (
            <li key={action}>{action.replace(/_/g, ' ')}</li>
          ))}
        </ul>
      </div>

      {policy.maxTransactionAmount && (
        <div className={styles.previewSection}>
          <h4>Max Transaction</h4>
          <p>{formatWeiToEth(policy.maxTransactionAmount)} ETH</p>
        </div>
      )}

      <div className={styles.previewSection}>
        <h4>Status</h4>
        <p className={policy.isActive ? styles.active : styles.inactive}>
          {policy.isActive ? 'Active' : 'Inactive'}
        </p>
      </div>
    </div>
  );
}

/**
 * Component for linking existing child account to policy
 */
function LinkChildSection({ policyId }: { policyId: string }) {
  const { linkChildToPolicy, currentPolicy } = usePermissions();
  const [childAddress, setChildAddress] = useState('');
  const [error, setError] = useState('');

  // If the policy already has a child wallet, this section won't render
  // (parent component handles that), but guard anyway
  if (currentPolicy?.childWalletAddress) {
    return null;
  }

  const handleLink = () => {
    if (!childAddress) return;

    // Validate address format
    if (!childAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    console.log('[UI] Linking child wallet:', childAddress);
    linkChildToPolicy(policyId, childAddress);
    setChildAddress('');
    setError('');
  };

  return (
    <div className={styles.linkForm}>
      <div className={styles.formGroup}>
        <label>Link Existing Wallet Address</label>
        <input
          type="text"
          value={childAddress}
          onChange={(e) => {
            setChildAddress(e.target.value);
            setError('');
          }}
          placeholder="0x..."
        />
        {error && <p className={styles.errorText}>{error}</p>}
      </div>
      <button
        className={styles.linkButton}
        onClick={handleLink}
        disabled={!childAddress}
      >
        Link Child Account
      </button>
    </div>
  );
}
