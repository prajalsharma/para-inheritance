/**
 * Para Policy Builder
 *
 * Compiles permission policies into Para Policy JSON.
 * Follows the official Para Permissions framework structure.
 *
 * Policies are built DYNAMICALLY based on parent selections:
 * - Chain restriction (if enabled by parent)
 * - USD limit (parent-defined value)
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
  ALL_ALLOWED_CHAINS,
} from '../types/permissions';

// Partner ID for this app (would come from Para dashboard in production)
const PARTNER_ID = process.env.VITE_PARA_PARTNER_ID || 'para-allowance-wallet';

/**
 * Build options for policy compilation
 */
export interface PolicyBuildOptions {
  /** Policy name */
  name: string;
  /** USD limit (parent-defined, optional) */
  usdLimit?: number;
  /** Allowed chains */
  allowedChains?: string[];
  /** Whether to restrict to Base only */
  restrictToBase?: boolean;
  /** Partner ID override */
  partnerId?: string;
  /** Valid from timestamp */
  validFrom?: number;
  /** Valid to timestamp */
  validTo?: number;
}

/**
 * Build a TRANSFER permission for a specific chain with optional value limit
 */
function buildTransferPermission(
  chainId: string,
  usdLimit?: number
): ParaPermission {
  const conditions: ParaPolicyCondition[] = [];

  // Add USD value limit condition if specified
  if (usdLimit !== undefined && usdLimit > 0) {
    conditions.push({
      type: 'STATIC',
      resource: 'VALUE',
      comparator: 'LESS_THAN',
      reference: usdLimit,
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
 * Build a SIGN_MESSAGE permission for a specific chain
 */
function buildSignMessagePermission(chainId: string): ParaPermission {
  return {
    effect: 'ALLOW',
    chainId,
    type: 'SIGN_MESSAGE',
    conditions: [],
  };
}

/**
 * Build a DENY permission for contract deployment
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
 * Compile a policy into Para Policy JSON
 *
 * This creates the structured JSON that Para uses to enforce permissions.
 * The structure follows Para's Permissions framework:
 * - partnerId identifies the app
 * - scopes group related permissions for user consent
 * - permissions define specific allowed/denied actions
 * - conditions constrain when permissions apply
 *
 * @see Para Permissions Architecture Documentation
 */
export function buildParaPolicy(options: PolicyBuildOptions): ParaPolicyJSON {
  // Determine allowed chains based on parent selection
  const allowedChains = options.restrictToBase
    ? [BASE_CHAIN_ID]
    : (options.allowedChains?.length ? options.allowedChains : ALL_ALLOWED_CHAINS);

  // Build transfer permissions for each allowed chain
  const transferPermissions: ParaPermission[] = allowedChains.map(chainId =>
    buildTransferPermission(chainId, options.usdLimit)
  );

  // Build sign message permissions for each allowed chain
  const signMessagePermissions: ParaPermission[] = allowedChains.map(chainId =>
    buildSignMessagePermission(chainId)
  );

  // Build DENY permissions for contract deployment (security)
  const denyDeployPermissions: ParaPermission[] = allowedChains.map(chainId =>
    buildDenyDeployPermission(chainId)
  );

  // Build description based on parent configuration
  const transferDescription = options.usdLimit
    ? `Allow sending funds up to $${options.usdLimit} USD per transaction`
    : 'Allow sending funds';

  const chainDescription = options.restrictToBase
    ? ' on Base'
    : ` on ${allowedChains.length} chain${allowedChains.length > 1 ? 's' : ''}`;

  // Build scopes
  const scopes: ParaScope[] = [
    {
      name: 'transfer',
      description: transferDescription + chainDescription,
      required: true,
      permissions: transferPermissions,
    },
    {
      name: 'sign_messages',
      description: 'Allow signing messages for verification' + chainDescription,
      required: false,
      permissions: signMessagePermissions,
    },
    {
      name: 'deny_deploy',
      description: 'Block contract deployment for security',
      required: true,
      permissions: denyDeployPermissions,
    },
  ];

  return {
    partnerId: options.partnerId || PARTNER_ID,
    validFrom: options.validFrom,
    validTo: options.validTo,
    scopes,
  };
}

/**
 * Format Para Policy JSON for display
 */
export function formatPolicyForDisplay(policy: ParaPolicyJSON): string {
  return JSON.stringify(policy, null, 2);
}

/**
 * Extract allowed chains from a Para Policy
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
          if (condition.resource === 'VALUE' &&
              (condition.comparator === 'LESS_THAN' || condition.comparator === 'EQUALS')) {
            const value = typeof condition.reference === 'number'
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
  // Find matching permissions for this transaction type
  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      // Check if permission matches chain and type
      if (permission.chainId === transaction.chainId &&
          permission.type === transaction.type) {

        // If it's a DENY permission, reject
        if (permission.effect === 'DENY') {
          return {
            allowed: false,
            reason: `Action "${transaction.type}" is denied by policy`,
          };
        }

        // If it's an ALLOW permission, check conditions
        if (permission.effect === 'ALLOW') {
          for (const condition of permission.conditions) {
            // Check VALUE condition
            if (condition.resource === 'VALUE' && transaction.valueUsd !== undefined) {
              const limit = typeof condition.reference === 'number'
                ? condition.reference
                : parseFloat(String(condition.reference));

              if (condition.comparator === 'LESS_THAN' && transaction.valueUsd >= limit) {
                return {
                  allowed: false,
                  reason: `Transaction value $${transaction.valueUsd.toFixed(2)} exceeds the $${limit} USD limit`,
                };
              }
              if (condition.comparator === 'EQUALS' && transaction.valueUsd !== limit) {
                return {
                  allowed: false,
                  reason: `Transaction value must equal $${limit} USD`,
                };
              }
            }

            // Check TO_ADDRESS condition
            if (condition.resource === 'TO_ADDRESS' && transaction.to) {
              const allowedAddresses = Array.isArray(condition.reference)
                ? condition.reference
                : [condition.reference];

              if (condition.comparator === 'INCLUDED_IN' &&
                  !allowedAddresses.includes(transaction.to.toLowerCase())) {
                return {
                  allowed: false,
                  reason: 'Recipient address is not in the allowed list',
                };
              }
              if (condition.comparator === 'NOT_INCLUDED_IN' &&
                  allowedAddresses.includes(transaction.to.toLowerCase())) {
                return {
                  allowed: false,
                  reason: 'Recipient address is blocked',
                };
              }
            }
          }

          // All conditions passed
          return { allowed: true };
        }
      }
    }
  }

  // No matching permission found - check if chain is allowed at all
  const allowedChains = getAllowedChainsFromPolicy(policy);
  if (!allowedChains.includes(transaction.chainId)) {
    const chainName = transaction.chainId === BASE_CHAIN_ID ? 'Base' : `chain ${transaction.chainId}`;
    return {
      allowed: false,
      reason: `Chain ${chainName} is not allowed by this policy`,
    };
  }

  // No explicit permission for this action
  return {
    allowed: false,
    reason: `No permission found for action "${transaction.type}" on chain ${transaction.chainId}`,
  };
}

/**
 * Get a summary of policy rules for display
 */
export function getPolicySummary(policy: ParaPolicyJSON): {
  chain: string;
  usdLimit: number | null;
  blockedActions: string[];
} {
  const allowedChains = getAllowedChainsFromPolicy(policy);
  const usdLimit = getUsdLimitFromPolicy(policy);
  const blockedActions: string[] = [];

  // Find denied actions
  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      if (permission.effect === 'DENY') {
        blockedActions.push(permission.type);
      }
    }
  }

  // Determine chain description
  let chain: string;
  if (allowedChains.length === 1 && allowedChains[0] === BASE_CHAIN_ID) {
    chain = 'Base only';
  } else {
    chain = `${allowedChains.length} chains`;
  }

  return {
    chain,
    usdLimit,
    blockedActions: [...new Set(blockedActions)], // Remove duplicates
  };
}
