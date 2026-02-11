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
 * Para Environment - Beta or Production
 */
export type ParaEnvironment = 'beta' | 'production';

/**
 * Policy Template ID - predefined permission policies
 */
export type PolicyTemplateId = 'base-only' | 'safe-spend';

/**
 * Policy Template Definition
 *
 * Predefined permission templates that compile into Para Policy JSON.
 */
export interface PolicyTemplate {
  /** Unique template ID */
  id: PolicyTemplateId;
  /** Display name */
  name: string;
  /** Description of the policy */
  description: string;
  /** Whether this template has a USD spending limit */
  hasUsdLimit: boolean;
  /** USD spending limit (if hasUsdLimit is true) */
  usdLimit?: number;
  /** Allowed chain IDs */
  allowedChains: string[];
  /** Features list for UI display */
  features: string[];
}

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
  /** Selected policy template ID */
  templateId: PolicyTemplateId;
  /** Selected Para environment */
  environment: ParaEnvironment;
  /** List of approved merchants/addresses */
  allowlist: ApprovedMerchant[];
  /** List of blocked actions */
  blockedActions: BlockedAction[];
  /** Maximum daily spending limit in wei */
  dailySpendingLimit?: string;
  /** Maximum single transaction limit in wei */
  maxTransactionAmount?: string;
  /** USD spending limit (from template) */
  usdLimit?: number;
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

/**
 * Predefined Policy Templates
 *
 * These templates define the base permission configurations.
 * Parents select one of these, then optionally add merchants.
 *
 * @see https://docs.getpara.com/v2/concepts/permissions
 */
export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'base-only',
    name: 'Base Only',
    description: 'Restricted to Base chain only. No spending limits.',
    hasUsdLimit: false,
    allowedChains: [BASE_CHAIN_ID],
    features: [
      'Restricted to Base network',
      'No contract deployments',
      'Allowlist-only transfers',
      'No spending limit',
    ],
  },
  {
    id: 'safe-spend',
    name: 'Safe Spend',
    description: 'Restricted to Base chain with a $15 USD transaction limit.',
    hasUsdLimit: true,
    usdLimit: 15,
    allowedChains: [BASE_CHAIN_ID],
    features: [
      'Restricted to Base network',
      'No contract deployments',
      'Allowlist-only transfers',
      'Max $15 USD per transaction',
    ],
  },
];

/**
 * Get policy template by ID
 */
export function getPolicyTemplate(id: PolicyTemplateId): PolicyTemplate | undefined {
  return POLICY_TEMPLATES.find(t => t.id === id);
}
