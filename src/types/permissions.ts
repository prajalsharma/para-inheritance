/**
 * Permission Types for Para Allowance Wallet
 *
 * These types define the permission policies for parent-child wallet relationships.
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */

/**
 * Represents a merchant/address that is approved for transactions
 */
export interface ApprovedMerchant {
  /** Unique identifier for the merchant */
  id: string;
  /** Human-readable name of the merchant */
  name: string;
  /** Wallet address of the merchant */
  address: string;
  /** Optional description of the merchant */
  description?: string;
  /** Maximum single transaction amount in wei (optional) */
  maxTransactionAmount?: string;
  /** Chains this merchant is approved on */
  approvedChains?: string[];
}

/**
 * Actions that can be blocked for child accounts
 */
export type BlockedAction =
  | 'CONTRACT_DEPLOY'
  | 'CONTRACT_INTERACTION'
  | 'TRANSFER_OUTSIDE_ALLOWLIST'
  | 'SIGN_ARBITRARY_MESSAGE'
  | 'APPROVE_TOKEN_SPEND'
  | 'NFT_TRANSFER';

/**
 * Permission policy that defines what a child account can do
 * Based on Para's permission framework:
 * - Policies define the full set of actions
 * - Scopes group related actions for user consent
 * - Permissions specify exact actions
 * - Conditions constrain permissions
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */
export interface PermissionPolicy {
  /** Unique identifier for the policy */
  id: string;
  /** Name of the policy */
  name: string;
  /** Parent wallet address that owns this policy */
  parentWalletAddress: string;
  /** Child wallet address this policy applies to */
  childWalletAddress?: string;
  /** List of approved merchants/addresses */
  allowlist: ApprovedMerchant[];
  /** List of blocked actions */
  blockedActions: BlockedAction[];
  /** Maximum daily spending limit in wei */
  dailySpendingLimit?: string;
  /** Maximum single transaction limit in wei */
  maxTransactionAmount?: string;
  /** Chains the child can interact with */
  allowedChains: string[];
  /** Whether the policy is currently active */
  isActive: boolean;
  /** Timestamp when policy was created */
  createdAt: number;
  /** Timestamp when policy was last updated */
  updatedAt: number;
}

/**
 * User role in the allowance system
 */
export type UserRole = 'parent' | 'child';

/**
 * User profile with role information
 */
export interface UserProfile {
  /** User's wallet address */
  walletAddress: string;
  /** User's email (from Para auth) */
  email?: string;
  /** User's role (parent or child) */
  role: UserRole;
  /** Associated policy ID */
  policyId?: string;
  /** Parent's wallet address (for child accounts) */
  parentWalletAddress?: string;
  /** Child wallet addresses (for parent accounts) */
  childWalletAddresses?: string[];
}

/**
 * Transaction validation result
 */
export interface TransactionValidation {
  /** Whether the transaction is allowed */
  isAllowed: boolean;
  /** Reason for rejection (if not allowed) */
  rejectionReason?: string;
  /** Specific rule that blocked the transaction */
  blockedByRule?: string;
}

/**
 * Default blocked actions for child accounts
 * These are security defaults that prevent risky operations
 */
export const DEFAULT_BLOCKED_ACTIONS: BlockedAction[] = [
  'CONTRACT_DEPLOY',
  'TRANSFER_OUTSIDE_ALLOWLIST',
  'APPROVE_TOKEN_SPEND',
];

/**
 * Base chain ID - fixed for this allowance wallet
 * All transactions are restricted to Base network
 */
export const BASE_CHAIN_ID = '8453';

/**
 * Default allowed chains - fixed to Base only for allowance wallet
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */
export const DEFAULT_ALLOWED_CHAINS = [
  BASE_CHAIN_ID,   // Base mainnet only
];
