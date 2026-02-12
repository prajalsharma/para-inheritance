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
 * @see https://docs.getpara.com/v2/concepts/permissions
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
}

/**
 * Compile a policy into Para Policy JSON
 *
 * This creates the structured JSON that Para uses to enforce permissions.
 * The structure follows Para's Permissions framework:
 * - Global conditions apply to all permissions
 * - Scopes group related permissions for user consent
 * - Permissions define specific allowed actions
 * - Conditions constrain when permissions activate
 *
 * IMPORTANT: Conditions are built dynamically based on parent selections
 * - Chain restriction only added if restrictToBase is true
 * - USD limit only added if usdLimit is provided
 *
 * @see https://docs.getpara.com/v2/concepts/permissions
 */
export function buildParaPolicy(options: PolicyBuildOptions): ParaPolicyJSON {
  const globalConditions: ParaPolicyCondition[] = [];

  // Determine allowed chains based on parent selection
  let allowedChains: string[];
  if (options.restrictToBase) {
    allowedChains = [BASE_CHAIN_ID];
    // Add chain restriction condition
    globalConditions.push({
      type: 'chain',
      operator: 'in',
      value: [BASE_CHAIN_ID],
    });
  } else {
    allowedChains = options.allowedChains?.length ? options.allowedChains : ALL_ALLOWED_CHAINS;
    // Add chain restriction for allowed chains
    globalConditions.push({
      type: 'chain',
      operator: 'in',
      value: allowedChains,
    });
  }

  // Add USD limit condition only if parent specified a limit
  if (options.usdLimit !== undefined && options.usdLimit > 0) {
    globalConditions.push({
      type: 'value',
      operator: 'lessThanOrEqual',
      value: options.usdLimit,
    });
  }

  // Always block contract deployments for security
  globalConditions.push({
    type: 'action',
    operator: 'notEquals',
    value: 'deploy',
  });

  // Build transfer permission
  const transferPermissions: ParaPermission[] = [
    {
      type: 'transfer',
      conditions: [],
    },
  ];

  // Build description based on parent configuration
  const descriptionParts: string[] = [];
  if (options.restrictToBase) {
    descriptionParts.push('Base only');
  } else {
    descriptionParts.push('Multiple chains');
  }
  if (options.usdLimit !== undefined && options.usdLimit > 0) {
    descriptionParts.push(`max $${options.usdLimit} USD per transaction`);
  }

  // Build scopes
  const scopes: ParaScope[] = [
    {
      name: 'Send Funds',
      description: `Allow sending ETH${options.usdLimit ? ` up to $${options.usdLimit} USD` : ''}${options.restrictToBase ? ' on Base' : ''}`,
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
    description: `Child wallet policy: ${descriptionParts.join(', ')}`,
    allowedChains,
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
        const chainName = transaction.chainId === BASE_CHAIN_ID ? 'Base' : `chain ${transaction.chainId}`;
        return {
          allowed: false,
          reason: `Chain ${chainName} is not allowed by this policy.`,
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
          reason: `Transaction value $${transaction.valueUsd.toFixed(2)} exceeds the $${maxUsd} USD limit`,
        };
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
  blockedActions: string[];
} {
  let usdLimit: number | null = null;
  const blockedActions: string[] = [];

  // Parse global conditions
  for (const condition of policy.globalConditions) {
    if (condition.type === 'value' && condition.operator === 'lessThanOrEqual') {
      usdLimit = condition.value as number;
    }
    if (condition.type === 'action' && condition.operator === 'notEquals') {
      blockedActions.push(condition.value as string);
    }
  }

  // Determine chain description
  let chain: string;
  if (policy.allowedChains.length === 1 && policy.allowedChains[0] === BASE_CHAIN_ID) {
    chain = 'Base only';
  } else {
    chain = `${policy.allowedChains.length} chains`;
  }

  return {
    chain,
    usdLimit,
    blockedActions,
  };
}
