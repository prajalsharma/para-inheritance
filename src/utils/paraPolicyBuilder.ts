/**
 * Para Policy Builder
 *
 * Compiles policy templates and user customizations into Para Policy JSON.
 * Follows the official Para Permissions framework structure.
 *
 * @see https://docs.getpara.com/v2/concepts/permissions
 */

import type {
  PolicyTemplateId,
  ParaPolicyJSON,
  ParaScope,
  ParaPermission,
  ParaPolicyCondition,
  ApprovedMerchant,
} from '../types/permissions';
import {
  BASE_CHAIN_ID,
  getPolicyTemplate,
} from '../types/permissions';

/**
 * Build options for policy compilation
 */
export interface PolicyBuildOptions {
  /** Selected template ID */
  templateId: PolicyTemplateId;
  /** Policy name */
  name: string;
  /** Optional allowlist of merchants */
  allowlist?: ApprovedMerchant[];
  /** Custom USD limit override */
  customUsdLimit?: number;
}

/**
 * Compile a policy template into Para Policy JSON
 *
 * This creates the structured JSON that Para uses to enforce permissions.
 * The structure follows Para's Permissions framework:
 * - Global conditions apply to all permissions
 * - Scopes group related permissions for user consent
 * - Permissions define specific allowed actions
 * - Conditions constrain when permissions activate
 *
 * @see https://docs.getpara.com/v2/concepts/permissions
 */
export function buildParaPolicy(options: PolicyBuildOptions): ParaPolicyJSON {
  const template = getPolicyTemplate(options.templateId);
  if (!template) {
    throw new Error(`Unknown policy template: ${options.templateId}`);
  }

  const allowlist = options.allowlist || [];
  const usdLimit = options.customUsdLimit ?? template.usdLimit;

  // Global conditions that apply to ALL permissions
  const globalConditions: ParaPolicyCondition[] = [
    // Chain restriction - Base only
    {
      type: 'chain',
      operator: 'in',
      value: template.allowedChains,
    },
    // Block contract deployments
    {
      type: 'action',
      operator: 'notEquals',
      value: 'deploy',
    },
  ];

  // Add USD value limit if template has one
  if (template.hasUsdLimit && usdLimit) {
    globalConditions.push({
      type: 'value',
      operator: 'lessThanOrEqual',
      value: usdLimit, // USD value
    });
  }

  // Build transfer scope with allowlist condition
  const transferPermissions: ParaPermission[] = [];

  // If we have an allowlist, create address conditions
  if (allowlist.length > 0) {
    const allowedAddresses = allowlist.map(m => m.address.toLowerCase());

    transferPermissions.push({
      type: 'transfer',
      conditions: [
        {
          type: 'address',
          operator: 'in',
          value: allowedAddresses,
        },
      ],
    });
  } else {
    // No allowlist - but TRANSFER_OUTSIDE_ALLOWLIST is blocked by default
    // This means no transfers are allowed until merchants are added
    transferPermissions.push({
      type: 'transfer',
      conditions: [
        {
          type: 'address',
          operator: 'in',
          value: [], // Empty allowlist - all transfers blocked
        },
      ],
    });
  }

  // Build scopes
  const scopes: ParaScope[] = [
    {
      name: 'Send Funds',
      description: 'Allow sending ETH to approved addresses',
      required: true,
      permissions: transferPermissions,
    },
    {
      name: 'Sign Messages',
      description: 'Allow signing messages for verification',
      required: false,
      permissions: [
        {
          type: 'sign',
          conditions: [],
        },
      ],
    },
  ];

  return {
    version: '1.0',
    name: options.name,
    description: template.description,
    allowedChains: template.allowedChains,
    scopes,
    globalConditions,
  };
}

/**
 * Format Para Policy JSON for display
 */
export function formatPolicyForDisplay(policy: ParaPolicyJSON): string {
  return JSON.stringify(policy, null, 2);
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
    type: 'transfer' | 'sign' | 'contractCall' | 'deploy';
  }
): { allowed: boolean; reason?: string } {
  // Check global conditions
  for (const condition of policy.globalConditions) {
    // Chain check
    if (condition.type === 'chain' && condition.operator === 'in') {
      const allowedChains = condition.value as string[];
      if (!allowedChains.includes(transaction.chainId)) {
        return {
          allowed: false,
          reason: `Chain ${transaction.chainId} is not allowed. Allowed: ${allowedChains.join(', ')}`,
        };
      }
    }

    // Action type check (block deploys)
    if (condition.type === 'action' && condition.operator === 'notEquals') {
      if (transaction.type === condition.value) {
        return {
          allowed: false,
          reason: `Action type "${transaction.type}" is not allowed`,
        };
      }
    }

    // USD value check
    if (condition.type === 'value' && condition.operator === 'lessThanOrEqual') {
      const maxUsd = condition.value as number;
      if (transaction.valueUsd !== undefined && transaction.valueUsd > maxUsd) {
        return {
          allowed: false,
          reason: `Transaction value $${transaction.valueUsd.toFixed(2)} exceeds limit of $${maxUsd}`,
        };
      }
    }
  }

  // Check scope permissions for transfers
  if (transaction.type === 'transfer' && transaction.to) {
    const transferScope = policy.scopes.find(s => s.name === 'Send Funds');
    if (transferScope) {
      for (const permission of transferScope.permissions) {
        if (permission.type === 'transfer') {
          for (const condition of permission.conditions) {
            if (condition.type === 'address' && condition.operator === 'in') {
              const allowedAddresses = (condition.value as string[]).map(a => a.toLowerCase());
              if (allowedAddresses.length > 0 && !allowedAddresses.includes(transaction.to.toLowerCase())) {
                return {
                  allowed: false,
                  reason: `Recipient ${transaction.to} is not in the allowed addresses list`,
                };
              }
              if (allowedAddresses.length === 0) {
                return {
                  allowed: false,
                  reason: 'No merchants approved yet. Add merchants to enable transfers.',
                };
              }
            }
          }
        }
      }
    }
  }

  return { allowed: true };
}

/**
 * Get a summary of policy rules for display
 */
export function getPolicySummary(policy: ParaPolicyJSON): {
  chain: string;
  usdLimit: number | null;
  allowedAddresses: string[];
  blockedActions: string[];
} {
  let usdLimit: number | null = null;
  const blockedActions: string[] = [];
  let allowedAddresses: string[] = [];

  // Parse global conditions
  for (const condition of policy.globalConditions) {
    if (condition.type === 'value' && condition.operator === 'lessThanOrEqual') {
      usdLimit = condition.value as number;
    }
    if (condition.type === 'action' && condition.operator === 'notEquals') {
      blockedActions.push(condition.value as string);
    }
  }

  // Parse transfer scope for allowlist
  const transferScope = policy.scopes.find(s => s.name === 'Send Funds');
  if (transferScope) {
    for (const permission of transferScope.permissions) {
      if (permission.type === 'transfer') {
        for (const condition of permission.conditions) {
          if (condition.type === 'address' && condition.operator === 'in') {
            allowedAddresses = condition.value as string[];
          }
        }
      }
    }
  }

  return {
    chain: policy.allowedChains[0] === BASE_CHAIN_ID ? 'Base' : policy.allowedChains.join(', '),
    usdLimit,
    allowedAddresses,
    blockedActions,
  };
}
