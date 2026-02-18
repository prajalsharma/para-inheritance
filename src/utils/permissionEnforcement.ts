/**
 * Permission Enforcement Utilities
 *
 * TODO: TEMPORARY CLIENT-SIDE ENFORCEMENT
 * ========================================
 * This client-side enforcement is a TEMPORARY measure while Para backend
 * validation issues are being resolved.
 *
 * In production, Para enforces permissions SERVER-SIDE at signing time.
 * Client-side checks are for UX only - they cannot be bypassed because
 * the server (Para) will reject invalid transactions regardless.
 *
 * Uses Para's official Permissions architecture:
 * - Policy with partnerId, scopes
 * - Each permission has effect (ALLOW/DENY), chainId, type
 * - Conditions use STATIC type with resource/comparator/reference
 *
 * @see Para Permissions Architecture Documentation
 */

import type {
  PermissionPolicy,
  TransactionValidation,
  BlockedAction,
} from '../types/permissions';

/**
 * Transaction request structure for validation
 */
export interface TransactionRequest {
  /** Recipient address */
  to: string;
  /** Value in wei */
  value?: string;
  /** Transaction data (for contract calls) */
  data?: string;
  /** Chain ID */
  chainId: string;
  /** Transaction type (maps to Para permission types) */
  type?: 'TRANSFER' | 'SIGN_MESSAGE' | 'SMART_CONTRACT' | 'DEPLOY_CONTRACT';
  /** Value in USD (for USD limit checks) */
  valueUsd?: number;
}

/**
 * Validates a transaction against a permission policy
 *
 * TODO: TEMPORARY - This is the main client-side enforcement function.
 * Call this BEFORE any transaction attempt to block invalid actions in the UI.
 * Once Para backend is working, this becomes UX-only (Para is the true enforcer).
 *
 * @param transaction - The transaction to validate
 * @param policy - The permission policy to check against
 * @returns Validation result with allowed status and rejection reason
 */
export function validateTransaction(
  transaction: TransactionRequest,
  policy: PermissionPolicy
): TransactionValidation {
  // Check if policy is active
  if (!policy.isActive) {
    return {
      isAllowed: false,
      rejectionReason: 'Permission policy is not active',
      blockedByRule: 'POLICY_INACTIVE',
    };
  }

  // Check if chain is allowed
  if (!policy.allowedChains.includes(transaction.chainId)) {
    const allowedChainList = policy.allowedChains.join(', ');
    return {
      isAllowed: false,
      rejectionReason: `Chain ${transaction.chainId} is not in the allowed chains list. Allowed chains: ${allowedChainList}`,
      blockedByRule: 'CHAIN_NOT_ALLOWED',
    };
  }

  // Detect transaction type (using Para permission type names)
  const txType = detectTransactionType(transaction);

  // Check blocked actions
  const blockedActionCheck = checkBlockedActions(txType, policy.blockedActions);
  if (!blockedActionCheck.isAllowed) {
    return blockedActionCheck;
  }

  // Check USD spending limit (only if parent set a limit)
  if (policy.usdLimit !== undefined && policy.usdLimit > 0 && transaction.valueUsd !== undefined) {
    const usdCheck = checkUsdLimit(transaction.valueUsd, policy.usdLimit);
    if (!usdCheck.isAllowed) {
      return usdCheck;
    }
  }

  return { isAllowed: true };
}

/**
 * Detects the type of transaction from its data
 * Returns Para permission type names
 */
function detectTransactionType(
  transaction: TransactionRequest
): 'TRANSFER' | 'SIGN_MESSAGE' | 'SMART_CONTRACT' | 'DEPLOY_CONTRACT' {
  // Explicit type provided
  if (transaction.type) {
    return transaction.type;
  }

  // Contract deployment (no 'to' address)
  if (!transaction.to || transaction.to === '0x' || transaction.to === '') {
    return 'DEPLOY_CONTRACT';
  }

  // Has data = contract call, no data = simple transfer
  if (transaction.data && transaction.data !== '0x' && transaction.data.length > 2) {
    return 'SMART_CONTRACT';
  }

  return 'TRANSFER';
}

/**
 * Checks if the transaction type is blocked
 */
function checkBlockedActions(
  txType: 'TRANSFER' | 'SIGN_MESSAGE' | 'SMART_CONTRACT' | 'DEPLOY_CONTRACT',
  blockedActions: BlockedAction[]
): TransactionValidation {
  // Map transaction types to blocked action names
  const typeToAction: Record<string, BlockedAction> = {
    DEPLOY_CONTRACT: 'DEPLOY_CONTRACT',
    SMART_CONTRACT: 'SMART_CONTRACT',
    SIGN_MESSAGE: 'SIGN_MESSAGE',
  };

  const action = typeToAction[txType];
  if (action && blockedActions.includes(action)) {
    return {
      isAllowed: false,
      rejectionReason: `${txType} transactions are blocked by policy`,
      blockedByRule: action,
    };
  }

  return { isAllowed: true };
}

/**
 * Checks USD spending limit
 */
function checkUsdLimit(
  valueUsd: number,
  usdLimit: number
): TransactionValidation {
  if (valueUsd >= usdLimit) {
    return {
      isAllowed: false,
      rejectionReason: `Transaction value $${valueUsd.toFixed(2)} exceeds USD limit of $${usdLimit}`,
      blockedByRule: 'USD_LIMIT_EXCEEDED',
    };
  }

  return { isAllowed: true };
}

/**
 * Convert ETH value to USD using a price
 *
 * In production, this would fetch the current ETH/USD price from an oracle.
 * For demo purposes, we use a mock price.
 *
 * @param weiValue - Value in wei
 * @param ethPriceUsd - ETH price in USD (default: mock price of $2000)
 */
export function weiToUsd(weiValue: string, ethPriceUsd: number = 2000): number {
  const ethValue = Number(BigInt(weiValue)) / 1e18;
  return ethValue * ethPriceUsd;
}

/**
 * Convert USD to wei using a price
 *
 * @param usdValue - Value in USD
 * @param ethPriceUsd - ETH price in USD (default: mock price of $2000)
 */
export function usdToWei(usdValue: number, ethPriceUsd: number = 2000): string {
  const ethValue = usdValue / ethPriceUsd;
  const weiValue = BigInt(Math.floor(ethValue * 1e18));
  return weiValue.toString();
}

/**
 * Format wei to ETH for display
 */
export function formatWeiToEth(wei: string): string {
  const value = BigInt(wei);
  const eth = Number(value) / 1e18;
  return eth.toFixed(6);
}

/**
 * Parse ETH to wei
 */
export function parseEthToWei(eth: string): string {
  const value = parseFloat(eth);
  const wei = BigInt(Math.floor(value * 1e18));
  return wei.toString();
}

/**
 * Get human-readable description of a blocked action
 */
export function getBlockedActionDescription(action: BlockedAction): string {
  const descriptions: Record<BlockedAction, string> = {
    DEPLOY_CONTRACT: 'Deploying new smart contracts',
    SMART_CONTRACT: 'Interacting with smart contracts',
    SIGN_MESSAGE: 'Signing arbitrary messages',
  };

  return descriptions[action] || action;
}
