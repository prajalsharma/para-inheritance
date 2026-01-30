/**
 * Child View Component
 *
 * Shows the child their:
 * - Wallet information
 * - Permission rules (read-only)
 * - Approved merchants they can send to
 * - Blocked actions they cannot perform
 *
 * Children CANNOT modify their policy - they can only view it.
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */

import { usePermissions } from '../contexts/PermissionContext';
import { useParaAuth } from '../hooks/useParaAuth';
import { getBlockedActionDescription } from '../utils/permissionEnforcement';
import styles from './ChildView.module.css';

/**
 * Chain name lookup
 */
const CHAIN_NAMES: Record<string, string> = {
  '1': 'Ethereum Mainnet',
  '11155111': 'Sepolia Testnet',
  '137': 'Polygon',
  '42161': 'Arbitrum One',
  '8453': 'Base',
  '10': 'Optimism',
};

export function ChildView() {
  const { currentPolicy } = usePermissions();
  const { wallets, email } = useParaAuth();

  if (!currentPolicy) {
    return (
      <div className={styles.container}>
        <div className={styles.notLinked}>
          <h2>Account Not Linked</h2>
          <p>
            Your wallet is not linked to a parent account yet.
            Ask your parent to add your wallet address to their policy.
          </p>
          {wallets[0] && (
            <div className={styles.walletBox}>
              <p>Share this address with your parent:</p>
              <code>{wallets[0].address}</code>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>My Allowance Wallet</h1>
        <p className={styles.subtitle}>
          View your wallet rules set by your parent.
        </p>
      </header>

      {/* Wallet Info */}
      <section className={styles.section}>
        <h2>My Wallet</h2>
        <div className={styles.walletInfo}>
          {email && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Email:</span>
              <span>{email}</span>
            </div>
          )}
          {wallets[0] && (
            <div className={styles.infoRow}>
              <span className={styles.label}>Wallet Address:</span>
              <code className={styles.address}>{wallets[0].address}</code>
            </div>
          )}
          <div className={styles.infoRow}>
            <span className={styles.label}>Policy Status:</span>
            <span className={currentPolicy.isActive ? styles.active : styles.inactive}>
              {currentPolicy.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </section>

      {/* Approved Merchants */}
      <section className={styles.section}>
        <h2>Where I Can Send</h2>
        <p className={styles.sectionDescription}>
          You can only send funds to these approved addresses.
        </p>

        {currentPolicy.allowlist.length === 0 ? (
          <div className={styles.emptyList}>
            <p>No merchants approved yet.</p>
            <p className={styles.hint}>
              Ask your parent to add merchants to your allowlist.
            </p>
          </div>
        ) : (
          <div className={styles.merchantList}>
            {currentPolicy.allowlist.map((merchant) => (
              <div key={merchant.id} className={styles.merchantCard}>
                <div className={styles.merchantIcon}>✓</div>
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
                      Max per transaction:{' '}
                      {(Number(merchant.maxTransactionAmount) / 1e18).toFixed(6)} ETH
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* What I Cannot Do */}
      <section className={styles.section}>
        <h2>What I Cannot Do</h2>
        <p className={styles.sectionDescription}>
          These actions are blocked by your parent.
        </p>

        {currentPolicy.blockedActions.length === 0 ? (
          <div className={styles.emptyList}>
            <p>No actions are blocked.</p>
          </div>
        ) : (
          <div className={styles.blockedList}>
            {currentPolicy.blockedActions.map((action) => (
              <div key={action} className={styles.blockedItem}>
                <span className={styles.blockedIcon}>🚫</span>
                <div>
                  <span className={styles.blockedName}>
                    {action.replace(/_/g, ' ')}
                  </span>
                  <span className={styles.blockedDescription}>
                    {getBlockedActionDescription(action)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/*
          When a child tries to perform a blocked action:

          1. Client-side: validateTransaction() rejects before signing
          2. UI shows clear error message explaining why
          3. Even if bypassed, Para's server-side checks would reject

          Example enforcement:
          ```tsx
          const validation = validateTransaction(tx, policy);
          if (!validation.isAllowed) {
            setError(`Blocked: ${validation.rejectionReason}`);
            return;
          }
          // Proceed with Para signing if allowed
          ```

          @see https://docs.getpara.com/v2/react/guides/permissions
        */}
      </section>

      {/* Allowed Chains */}
      <section className={styles.section}>
        <h2>Allowed Networks</h2>
        <p className={styles.sectionDescription}>
          You can only use these blockchain networks.
        </p>

        <div className={styles.chainList}>
          {currentPolicy.allowedChains.map((chainId) => (
            <div key={chainId} className={styles.chainBadge}>
              <span className={styles.chainIcon}>⛓️</span>
              {CHAIN_NAMES[chainId] || `Chain ${chainId}`}
            </div>
          ))}
        </div>
      </section>

      {/* Spending Limits */}
      {currentPolicy.maxTransactionAmount && (
        <section className={styles.section}>
          <h2>Spending Limits</h2>
          <div className={styles.limitBox}>
            <div className={styles.limitLabel}>Max per transaction</div>
            <div className={styles.limitValue}>
              {(Number(currentPolicy.maxTransactionAmount) / 1e18).toFixed(6)} ETH
            </div>
          </div>
        </section>
      )}

      {/* Parent Info */}
      <section className={styles.section}>
        <h2>Parent Account</h2>
        <div className={styles.parentInfo}>
          <p>Your rules are managed by:</p>
          <code>{currentPolicy.parentWalletAddress}</code>
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.note}>
          These rules are enforced by{' '}
          <a
            href="https://docs.getpara.com/v2/react/guides/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Para Permissions
          </a>
          . You cannot change them.
        </p>
      </footer>
    </div>
  );
}

/**
 * How Permission Enforcement Works for Child Transactions
 *
 * When a child attempts to send a transaction:
 *
 * 1. **Client-Side Validation** (First Line of Defense)
 *    ```tsx
 *    import { validateTransaction } from '../utils/permissionEnforcement';
 *
 *    const validation = validateTransaction(txRequest, currentPolicy);
 *
 *    if (!validation.isAllowed) {
 *      // Show user-friendly error
 *      toast.error(`Transaction blocked: ${validation.rejectionReason}`);
 *      return;
 *    }
 *    ```
 *
 * 2. **Para Permission Prompts** (User Confirmation)
 *    - Para shows a modal for transaction approval
 *    - Shows transaction details (to, amount, chain)
 *    - User must approve within timeout (default 30s)
 *
 *    ```tsx
 *    import { useSignTransaction, TransactionReviewDenied } from '@getpara/react-sdk';
 *
 *    const { mutate: signTx } = useSignTransaction();
 *
 *    try {
 *      await signTx({
 *        walletId,
 *        rlpEncodedTxBase64,
 *        chainId,
 *        timeoutMs: 30000,
 *      });
 *    } catch (error) {
 *      if (error instanceof TransactionReviewDenied) {
 *        toast.error('Transaction was denied');
 *      }
 *    }
 *    ```
 *
 * 3. **Server-Side Enforcement** (Final Check)
 *    - Para's servers verify the transaction against the policy
 *    - Even if client-side is bypassed, server rejects invalid transactions
 *    - This ensures security even with a compromised client
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */
