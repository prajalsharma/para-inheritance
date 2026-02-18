/**
 * Para Policy Builder
 *
 * Compiles permission policies into Para Policy JSON following the
 * official Para Permissions Architecture:
 *
 *   Policy → Scopes → Permissions → Conditions
 *
 * Required rules (per spec):
 *   - Chain: Base (8453) only
 *   - No transactions above $15 USD (LESS_THAN condition on VALUE)
 *   - Transfers only (DENY DEPLOY_CONTRACT, DENY SMART_CONTRACT)
 *   - Optional allowlist for recipient addresses (TO_ADDRESS INCLUDED_IN)
 *
 * @see Para Permissions Architecture Documentation
 */

import type {
  ParaPolicyJSON,
  ParaScope,
  ParaPermission,
  ParaPolicyCondition,
} from '../types/permissions';
import {
  BASE_CHAIN_ID,
} from '../types/permissions';

// Partner ID for this app
const PARTNER_ID = import.meta.env.VITE_PARA_PARTNER_ID || 'para-allowance-wallet';

/**
 * Build options for policy compilation
 */
export interface PolicyBuildOptions {
  /** Policy name (for display only) */
  name: string;
  /** USD limit per transaction (required per spec: max $15) */
  usdLimit?: number;
  /** Whether to restrict to Base only (spec requires Base chain) */
  restrictToBase?: boolean;
  /** Optional allowlist of recipient addresses */
  allowedAddresses?: string[];
  /** Partner ID override */
  partnerId?: string;
  /** Valid from timestamp */
  validFrom?: number;
  /** Valid to timestamp */
  validTo?: number;
}

/**
 * Build the ALLOW TRANSFER permission for Base chain
 * Conditions:
 *   - VALUE < usdLimit (if provided)
 *   - TO_ADDRESS INCLUDED_IN allowlist (if provided)
 */
function buildTransferPermission(
  chainId: string,
  usdLimit?: number,
  allowedAddresses?: string[]
): ParaPermission {
  const conditions: ParaPolicyCondition[] = [];

  // Condition: max transaction value (STATIC, VALUE, LESS_THAN)
  if (usdLimit !== undefined && usdLimit > 0) {
    conditions.push({
      type: 'STATIC',
      resource: 'VALUE',
      comparator: 'LESS_THAN',
      reference: usdLimit,
    });
  }

  // Condition: recipient address allowlist (STATIC, TO_ADDRESS, INCLUDED_IN)
  if (allowedAddresses && allowedAddresses.length > 0) {
    conditions.push({
      type: 'STATIC',
      resource: 'TO_ADDRESS',
      comparator: 'INCLUDED_IN',
      reference: allowedAddresses.map(a => a.toLowerCase()),
    });
  }

  return {
    effect: 'ALLOW',
    chainId,
    type: 'TRANSFER',
    conditions,
  };
}

/**
 * Build a DENY DEPLOY_CONTRACT permission
 * Blocks all contract deployments on this chain
 */
function buildDenyDeployPermission(chainId: string): ParaPermission {
  return {
    effect: 'DENY',
    chainId,
    type: 'DEPLOY_CONTRACT',
    conditions: [],
  };
}

/**
 * Build a DENY SMART_CONTRACT permission
 * Blocks all smart contract calls (no arbitrary contract interactions)
 */
function buildDenySmartContractPermission(chainId: string): ParaPermission {
  return {
    effect: 'DENY',
    chainId,
    type: 'SMART_CONTRACT',
    conditions: [],
  };
}

/**
 * Compile the Para Policy JSON following the official schema:
 *
 *   Policy → Scopes → Permissions → Conditions
 *
 * Scope 1: "allowance_transfer" (required)
 *   - ALLOW TRANSFER on Base with VALUE < $15 and optional TO_ADDRESS INCLUDED_IN
 *
 * Scope 2: "block_deploys" (required)
 *   - DENY DEPLOY_CONTRACT on Base
 *
 * Scope 3: "block_smart_contracts" (required)
 *   - DENY SMART_CONTRACT on Base
 *
 * @see Para Permissions Architecture Documentation
 */
export function buildParaPolicy(options: PolicyBuildOptions): ParaPolicyJSON {
  // Per spec: Base chain is required
  const chainId = BASE_CHAIN_ID;

  // Build descriptions
  const valueDesc = options.usdLimit
    ? `up to $${options.usdLimit} USD per transaction`
    : 'with no value limit';
  const addressDesc = options.allowedAddresses && options.allowedAddresses.length > 0
    ? ` to ${options.allowedAddresses.length} allowed recipient(s)`
    : '';

  // Scope 1: Allowance transfer — only TRANSFER is allowed, with conditions
  const transferScope: ParaScope = {
    name: 'allowance_transfer',
    description: `Allow sending funds on Base ${valueDesc}${addressDesc}`,
    required: true,
    permissions: [
      buildTransferPermission(chainId, options.usdLimit, options.allowedAddresses),
    ],
  };

  // Scope 2: Block contract deployments
  const blockDeployScope: ParaScope = {
    name: 'block_deploys',
    description: 'Block all contract deployments for security',
    required: true,
    permissions: [
      buildDenyDeployPermission(chainId),
    ],
  };

  // Scope 3: Block smart contract interactions
  const blockSmartContractScope: ParaScope = {
    name: 'block_smart_contracts',
    description: 'Block all smart contract calls (transfers only)',
    required: true,
    permissions: [
      buildDenySmartContractPermission(chainId),
    ],
  };

  return {
    partnerId: options.partnerId || PARTNER_ID,
    validFrom: options.validFrom,
    validTo: options.validTo,
    scopes: [
      transferScope,
      blockDeployScope,
      blockSmartContractScope,
    ],
  };
}

/**
 * Format Para Policy JSON for display
 */
export function formatPolicyForDisplay(policy: ParaPolicyJSON): string {
  return JSON.stringify(policy, null, 2);
}

/**
 * Extract allowed chains from a Para Policy (from ALLOW permissions)
 */
export function getAllowedChainsFromPolicy(policy: ParaPolicyJSON): string[] {
  const chains = new Set<string>();
  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      if (permission.effect === 'ALLOW') {
        chains.add(permission.chainId);
      }
    }
  }
  return Array.from(chains);
}

/**
 * Extract USD limit from a Para Policy (returns the minimum if multiple exist)
 */
export function getUsdLimitFromPolicy(policy: ParaPolicyJSON): number | null {
  let minLimit: number | null = null;

  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      if (permission.type === 'TRANSFER' && permission.effect === 'ALLOW') {
        for (const condition of permission.conditions) {
          if (
            condition.resource === 'VALUE' &&
            (condition.comparator === 'LESS_THAN' || condition.comparator === 'EQUALS')
          ) {
            const value =
              typeof condition.reference === 'number'
                ? condition.reference
                : parseFloat(String(condition.reference));

            if (!isNaN(value) && (minLimit === null || value < minLimit)) {
              minLimit = value;
            }
          }
        }
      }
    }
  }

  return minLimit;
}

/**
 * Extract allowed recipient addresses from a Para Policy
 */
export function getAllowedAddressesFromPolicy(policy: ParaPolicyJSON): string[] | null {
  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      if (permission.type === 'TRANSFER' && permission.effect === 'ALLOW') {
        for (const condition of permission.conditions) {
          if (
            condition.resource === 'TO_ADDRESS' &&
            condition.comparator === 'INCLUDED_IN' &&
            Array.isArray(condition.reference)
          ) {
            return condition.reference as string[];
          }
        }
      }
    }
  }
  return null;
}

/**
 * Extract denied action types from a Para Policy
 */
export function getDeniedActionsFromPolicy(policy: ParaPolicyJSON): string[] {
  const denied = new Set<string>();
  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      if (permission.effect === 'DENY') {
        denied.add(permission.type);
      }
    }
  }
  return Array.from(denied);
}

/**
 * Validate that a transaction would be allowed by the Para Policy
 *
 * This is client-side pre-validation before sending to Para.
 * Para's servers will also enforce these rules.
 */
export function validateAgainstParaPolicy(
  policy: ParaPolicyJSON,
  transaction: {
    to?: string;
    chainId: string;
    valueUsd?: number;
    type: 'TRANSFER' | 'SIGN_MESSAGE' | 'SMART_CONTRACT' | 'DEPLOY_CONTRACT';
  }
): { allowed: boolean; reason?: string } {
  // Check DENY permissions first (they take precedence)
  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      if (
        permission.chainId === transaction.chainId &&
        permission.type === transaction.type &&
        permission.effect === 'DENY'
      ) {
        return {
          allowed: false,
          reason: `Action "${transaction.type}" is denied by policy`,
        };
      }
    }
  }

  // Find ALLOW permissions
  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      if (
        permission.chainId === transaction.chainId &&
        permission.type === transaction.type &&
        permission.effect === 'ALLOW'
      ) {
        // Check all conditions
        for (const condition of permission.conditions) {
          if (condition.resource === 'VALUE' && transaction.valueUsd !== undefined) {
            const limit =
              typeof condition.reference === 'number'
                ? condition.reference
                : parseFloat(String(condition.reference));

            if (condition.comparator === 'LESS_THAN' && transaction.valueUsd >= limit) {
              return {
                allowed: false,
                reason: `Transaction value $${transaction.valueUsd.toFixed(2)} exceeds the $${limit} USD limit`,
              };
            }
          }

          if (condition.resource === 'TO_ADDRESS' && transaction.to) {
            const allowedAddresses = Array.isArray(condition.reference)
              ? (condition.reference as string[])
              : [String(condition.reference)];

            if (
              condition.comparator === 'INCLUDED_IN' &&
              !allowedAddresses.includes(transaction.to.toLowerCase())
            ) {
              return {
                allowed: false,
                reason: 'Recipient address is not in the allowed list',
              };
            }
          }
        }

        // All conditions passed
        return { allowed: true };
      }
    }
  }

  // No matching ALLOW permission found
  const allowedChains = getAllowedChainsFromPolicy(policy);
  if (!allowedChains.includes(transaction.chainId)) {
    return {
      allowed: false,
      reason: `Chain ${transaction.chainId} is not allowed by this policy`,
    };
  }

  return {
    allowed: false,
    reason: `No permission found for action "${transaction.type}" on chain ${transaction.chainId}`,
  };
}

/**
 * Get a human-readable summary of policy rules
 */
export function getPolicySummary(policy: ParaPolicyJSON): {
  chain: string;
  usdLimit: number | null;
  deniedActions: string[];
  allowedAddresses: string[] | null;
} {
  const allowedChains = getAllowedChainsFromPolicy(policy);
  const usdLimit = getUsdLimitFromPolicy(policy);
  const deniedActions = getDeniedActionsFromPolicy(policy);
  const allowedAddresses = getAllowedAddressesFromPolicy(policy);

  let chain: string;
  if (allowedChains.length === 1 && allowedChains[0] === BASE_CHAIN_ID) {
    chain = 'Base only';
  } else if (allowedChains.length === 0) {
    chain = 'No chains allowed';
  } else {
    chain = `${allowedChains.length} chains`;
  }

  return {
    chain,
    usdLimit,
    deniedActions: [...new Set(deniedActions)],
    allowedAddresses,
  };
}
