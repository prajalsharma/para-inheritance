/**
 * Permission Types for Para Allowance Wallet
 *
 * These types define the permission policies for parent-child wallet relationships.
 * Following Para's official Permissions framework from the backend docs:
 * - Policy: Defines all allowed actions needed from the Para wallet
 * - Scope: User-facing consent checkbox grouping
 * - Permission: Specific action with effect (ALLOW/DENY)
 * - Condition: Constraints on when permissions apply
 *
 * @see Para Permissions Architecture Documentation
 */

/**
 * Para Policy Condition - constraints on permissions
 *
 * Conditions use STATIC type for now, with future support for
 * variable conditions based on past actions.
 */
export interface ParaPolicyCondition {
  /** Condition type - STATIC for now, future: variable conditions */
  type: 'STATIC';
  /** Resource to check: VALUE, TO_ADDRESS, ARGUMENTS[n], etc. */
  resource: 'VALUE' | 'TO_ADDRESS' | 'FROM_ADDRESS' | 'ARGUMENTS[0]' | 'ARGUMENTS[1]' | string;
  /** Comparator for the condition */
  comparator: 'EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'INCLUDED_IN' | 'NOT_INCLUDED_IN';
  /** Reference value to compare against */
  reference: number | string | string[];
}

/**
 * Para Permission - specific action with effect
 *
 * Each permission defines whether an action is ALLOWED or DENIED,
 * along with the chain and type of operation.
 */
export interface ParaPermission {
  /** Whether this permission ALLOWs or DENYs the action */
  effect: 'ALLOW' | 'DENY';
  /** Chain ID for this permission */
  chainId: string;
  /** Type of operation */
  type: 'TRANSFER' | 'SIGN_MESSAGE' | 'SMART_CONTRACT' | 'DEPLOY_CONTRACT';
  /** Smart contract function (only for SMART_CONTRACT type) */
  smartContractFunction?: string;
  /** Smart contract address (only for SMART_CONTRACT type) */
  smartContractAddress?: string;
  /** Conditions that must be met for this permission */
  conditions: ParaPolicyCondition[];
}

/**
 * Para Scope - user-facing consent grouping
 *
 * Each scope represents a checkbox the user sees when consenting.
 * Example: "Allow dapp to sign messages and transfer eth for this account."
 */
export interface ParaScope {
  /** Scope name for internal reference */
  name: string;
  /** Description shown to user in consent UI */
  description: string;
  /** Whether this scope is required (user must accept) */
  required: boolean;
  /** Permissions included in this scope */
  permissions: ParaPermission[];
}

/**
 * Para Policy JSON structure - the complete policy definition
 *
 * This is the schema partners pass to Para to set up their policy.
 * Policies are immutable - new versions create entirely new policies.
 */
export interface ParaPolicyJSON {
  /** Partner ID (the app's identifier with Para) */
  partnerId: string;
  /** When the policy becomes valid (timestamp, optional) */
  validFrom?: number;
  /** When the policy expires (timestamp, optional) */
  validTo?: number;
  /** Permission scopes that users consent to */
  scopes: ParaScope[];
}

/**
 * Actions that can be blocked for child accounts
 */
export type BlockedAction =
  | 'DEPLOY_CONTRACT'
  | 'SMART_CONTRACT'
  | 'SIGN_MESSAGE';

/**
 * Permission policy that defines what a child account can do
 *
 * Per spec:
 * - Chain is always Base (restrictToBase is always true)
 * - Max USD limit (default $15, parent-configurable)
 * - Blocked: DEPLOY_CONTRACT, SMART_CONTRACT
 * - Optional allowlist for recipient addresses
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
  /** USD spending limit per transaction */
  usdLimit?: number;
  /** Whether to restrict to Base chain only (always true per spec) */
  restrictToBase: boolean;
  /** Chains the child can interact with */
  allowedChains: string[];
  /** Optional allowlist of recipient wallet addresses */
  allowedAddresses?: string[];
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
  'DEPLOY_CONTRACT',
];

/**
 * Base chain ID - fixed for this allowance wallet
 */
export const BASE_CHAIN_ID = '8453';

/**
 * All allowed chains when not restricted to Base
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
