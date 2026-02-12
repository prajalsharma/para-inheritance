/**
 * Permission Types for Para Allowance Wallet
 *
 * These types define the permission policies for parent-child wallet relationships.
 * Following Para's official Permissions framework terminology:
 * - Policy: App-specific permissions contract
 * - Scope: User-facing consent grouping of actions
 * - Permission: Specific executable action
 * - Condition: Constraints on when permissions activate
 *
 * @see https://docs.getpara.com/v2/concepts/permissions
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */

/**
 * Para Policy Condition - constraints on permissions
 * @see https://docs.getpara.com/v2/concepts/permissions
 */
export interface ParaPolicyCondition {
  /** Condition type */
  type: 'chain' | 'value' | 'address' | 'action';
  /** Operator for comparison */
  operator: 'equals' | 'in' | 'lessThanOrEqual' | 'notEquals';
  /** Value to compare against */
  value: string | string[] | number;
}

/**
 * Para Permission - specific executable action
 * @see https://docs.getpara.com/v2/concepts/permissions
 */
export interface ParaPermission {
  /** Permission type */
  type: 'transfer' | 'sign' | 'contractCall' | 'deploy';
  /** Conditions that must be met */
  conditions: ParaPolicyCondition[];
}

/**
 * Para Scope - user-facing consent grouping
 * @see https://docs.getpara.com/v2/concepts/permissions
 */
export interface ParaScope {
  /** Scope name for display */
  name: string;
  /** Description shown to user */
  description: string;
  /** Whether this scope is required */
  required: boolean;
  /** Permissions in this scope */
  permissions: ParaPermission[];
}

/**
 * Para Policy JSON structure
 * This is the compiled policy format for Para SDK
 * @see https://docs.getpara.com/v2/concepts/permissions
 */
export interface ParaPolicyJSON {
  /** Policy version */
  version: '1.0';
  /** Policy name */
  name: string;
  /** Policy description */
  description: string;
  /** Allowed blockchain networks */
  allowedChains: string[];
  /** Permission scopes */
  scopes: ParaScope[];
  /** Global conditions applied to all permissions */
  globalConditions: ParaPolicyCondition[];
}

/**
 * Actions that can be blocked for child accounts
 */
export type BlockedAction =
  | 'CONTRACT_DEPLOY'
  | 'CONTRACT_INTERACTION'
  | 'SIGN_ARBITRARY_MESSAGE'
  | 'APPROVE_TOKEN_SPEND'
  | 'NFT_TRANSFER';

/**
 * Permission policy that defines what a child account can do
 *
 * Parent explicitly configures:
 * - Whether to restrict to Base only (optional toggle)
 * - Maximum USD spending limit (parent-defined value)
 *
 * @see https://docs.getpara.com/v2/concepts/permissions
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
  /** List of blocked actions */
  blockedActions: BlockedAction[];
  /** USD spending limit (parent-defined, optional) */
  usdLimit?: number;
  /** Whether to restrict to Base chain only */
  restrictToBase: boolean;
  /** Chains the child can interact with */
  allowedChains: string[];
  /** Whether the policy is currently active */
  isActive: boolean;
  /** Compiled Para Policy JSON */
  paraPolicyJSON?: ParaPolicyJSON;
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
  'APPROVE_TOKEN_SPEND',
];

/**
 * Base chain ID - fixed for this allowance wallet
 * All transactions are restricted to Base network
 */
export const BASE_CHAIN_ID = '8453';

/**
 * All allowed chains when not restricted to Base
 * @see https://docs.getpara.com/v2/react/guides/permissions
 */
export const ALL_ALLOWED_CHAINS = [
  '8453',   // Base
  '1',      // Ethereum
  '137',    // Polygon
  '42161',  // Arbitrum
  '10',     // Optimism
];

/**
 * Base-only chain restriction
 */
export const BASE_ONLY_CHAINS = [BASE_CHAIN_ID];

/**
 * Suggested USD limit for child transactions (parent can change)
 */
export const SUGGESTED_USD_LIMIT = 15;

/**
 * All supported chains
 */
export const SUPPORTED_CHAINS: { id: string; name: string }[] = [
  { id: '8453', name: 'Base' },
  { id: '1', name: 'Ethereum Mainnet' },
  { id: '137', name: 'Polygon' },
  { id: '42161', name: 'Arbitrum One' },
  { id: '10', name: 'Optimism' },
];
