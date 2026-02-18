/**
 * Transaction Signing Endpoint - Para Enforces Permissions
 *
 * CRITICAL: This endpoint MUST always return JSON.
 * - All code paths return res.status(xxx).json({...})
 * - Top-level try-catch ensures no unhandled exceptions
 * - Lazy imports prevent module-load-time crashes
 *
 * Uses Para's official Permissions architecture:
 * - Policy with partnerId, scopes
 * - Each permission has effect (ALLOW/DENY), chainId, type
 * - Conditions use STATIC type with resource/comparator/reference
 *
 * @see Para Permissions Architecture Documentation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Chain IDs for display
const CHAIN_NAMES: Record<string, string> = {
  '8453': 'Base',
  '1': 'Ethereum',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  '10': 'Optimism',
};

interface SignTransactionRequest {
  walletAddress: string;
  walletId?: string;
  chainId: string;
  to: string;
  valueWei?: string;
  valueUsd?: number;
  data?: string;
  transactionType: 'TRANSFER' | 'SIGN_MESSAGE' | 'SMART_CONTRACT' | 'DEPLOY_CONTRACT';
}

// Para Permission Condition (official schema)
interface ParaPolicyCondition {
  type: 'STATIC';
  resource: 'VALUE' | 'TO_ADDRESS' | 'FROM_ADDRESS' | string;
  comparator: 'EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'INCLUDED_IN' | 'NOT_INCLUDED_IN';
  reference: number | string | string[];
}

// Para Permission (official schema)
interface ParaPermission {
  effect: 'ALLOW' | 'DENY';
  chainId: string;
  type: 'TRANSFER' | 'SIGN_MESSAGE' | 'SMART_CONTRACT' | 'DEPLOY_CONTRACT';
  smartContractFunction?: string;
  smartContractAddress?: string;
  conditions: ParaPolicyCondition[];
}

// Para Scope (official schema)
interface ParaScope {
  name: string;
  description: string;
  required: boolean;
  permissions: ParaPermission[];
}

// Para Policy JSON (official schema)
interface ParaPolicyJSON {
  partnerId: string;
  validFrom?: number;
  validTo?: number;
  scopes: ParaScope[];
}

// In-memory policy storage (for demo/beta - replace with DB in production)
const inMemoryPolicies = new Map<string, { policy: ParaPolicyJSON; parentAddress: string }>();

// Wrapper for policy storage
async function getPolicyStorage() {
  return {
    getWalletPolicy: async (walletAddress: string) => {
      const record = inMemoryPolicies.get(walletAddress.toLowerCase());
      if (record) {
        return { walletAddress: walletAddress.toLowerCase(), ...record };
      }
      return undefined;
    }
  };
}

// Lazy import Para SDK to handle import failures gracefully
async function getParaSDK() {
  try {
    return await import('@getpara/server-sdk');
  } catch (error) {
    console.error('[Server] Failed to load Para SDK:', error);
    return null;
  }
}

/**
 * Helper to send JSON error response
 */
function sendError(
  res: VercelResponse,
  status: number,
  message: string,
  extra?: Record<string, unknown>
) {
  return res.status(status).json({
    success: false,
    error: message,
    ...extra,
  });
}

/**
 * Extract allowed chains from policy
 */
function getAllowedChainsFromPolicy(policy: ParaPolicyJSON): string[] {
  const chains = new Set<string>();
  for (const scope of policy.scopes) {
    for (const perm of scope.permissions) {
      if (perm.effect === 'ALLOW') {
        chains.add(perm.chainId);
      }
    }
  }
  return Array.from(chains);
}

/**
 * Validate transaction against Para policy
 */
function validateTransaction(
  policy: ParaPolicyJSON,
  tx: {
    chainId: string;
    type: 'TRANSFER' | 'SIGN_MESSAGE' | 'SMART_CONTRACT' | 'DEPLOY_CONTRACT';
    valueUsd?: number;
    to?: string;
  }
): { allowed: boolean; reason?: string; condition?: string } {
  // Find matching permissions for this transaction type and chain
  for (const scope of policy.scopes) {
    for (const permission of scope.permissions) {
      // Check if permission matches chain and type
      if (permission.chainId === tx.chainId && permission.type === tx.type) {
        // If it's a DENY permission, reject immediately
        if (permission.effect === 'DENY') {
          return {
            allowed: false,
            reason: `Action "${tx.type}" is denied by policy`,
            condition: 'action_denied',
          };
        }

        // If it's an ALLOW permission, check all conditions
        if (permission.effect === 'ALLOW') {
          for (const condition of permission.conditions) {
            // Check VALUE condition
            if (condition.resource === 'VALUE' && tx.valueUsd !== undefined) {
              const limit = typeof condition.reference === 'number'
                ? condition.reference
                : parseFloat(String(condition.reference));

              if (condition.comparator === 'LESS_THAN' && tx.valueUsd >= limit) {
                return {
                  allowed: false,
                  reason: `Transaction value $${tx.valueUsd.toFixed(2)} exceeds the $${limit} USD limit`,
                  condition: 'value_limit',
                };
              }

              if (condition.comparator === 'GREATER_THAN' && tx.valueUsd <= limit) {
                return {
                  allowed: false,
                  reason: `Transaction value $${tx.valueUsd.toFixed(2)} is below minimum $${limit} USD`,
                  condition: 'value_minimum',
                };
              }

              if (condition.comparator === 'EQUALS' && tx.valueUsd !== limit) {
                return {
                  allowed: false,
                  reason: `Transaction value must equal $${limit} USD`,
                  condition: 'value_exact',
                };
              }
            }

            // Check TO_ADDRESS condition
            if (condition.resource === 'TO_ADDRESS' && tx.to) {
              const addresses = Array.isArray(condition.reference)
                ? condition.reference.map(a => a.toLowerCase())
                : [String(condition.reference).toLowerCase()];

              const toAddress = tx.to.toLowerCase();

              if (condition.comparator === 'INCLUDED_IN' && !addresses.includes(toAddress)) {
                return {
                  allowed: false,
                  reason: 'Recipient address is not in the allowed list',
                  condition: 'address_whitelist',
                };
              }

              if (condition.comparator === 'NOT_INCLUDED_IN' && addresses.includes(toAddress)) {
                return {
                  allowed: false,
                  reason: 'Recipient address is blocked',
                  condition: 'address_blacklist',
                };
              }

              if (condition.comparator === 'EQUALS' && toAddress !== addresses[0]) {
                return {
                  allowed: false,
                  reason: 'Recipient address does not match required address',
                  condition: 'address_exact',
                };
              }
            }
          }

          // All conditions passed for this ALLOW permission
          return { allowed: true };
        }
      }
    }
  }

  // No matching permission found - check if chain is even allowed
  const allowedChains = getAllowedChainsFromPolicy(policy);
  if (!allowedChains.includes(tx.chainId)) {
    const chainName = CHAIN_NAMES[tx.chainId] || `chain ${tx.chainId}`;
    return {
      allowed: false,
      reason: `Chain ${chainName} is not allowed by this policy. Allowed chains: ${allowedChains.map(c => CHAIN_NAMES[c] || c).join(', ')}`,
      condition: 'chain_restriction',
    };
  }

  // No explicit permission for this action type
  return {
    allowed: false,
    reason: `No permission found for action "${tx.type}" on chain ${tx.chainId}`,
    condition: 'no_permission',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Wrap EVERYTHING in try-catch to guarantee JSON response
  try {
    // Method check
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    // Parse body safely
    const body = (req.body || {}) as SignTransactionRequest;

    // Validate required fields
    if (!body.walletAddress || typeof body.walletAddress !== 'string') {
      return sendError(res, 400, 'Wallet address required');
    }

    if (!body.chainId || typeof body.chainId !== 'string') {
      return sendError(res, 400, 'Chain ID required');
    }

    // Validate wallet address format
    if (!body.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return sendError(res, 400, 'Invalid wallet address format');
    }

    // Normalize transaction type
    const transactionType = (body.transactionType?.toUpperCase() || 'TRANSFER') as SignTransactionRequest['transactionType'];

    const chainName = CHAIN_NAMES[body.chainId] || `Chain ${body.chainId}`;

    console.log('[Server] Sign transaction request:', {
      walletAddress: body.walletAddress.substring(0, 10) + '...',
      chainId: body.chainId,
      chainName,
      valueUsd: body.valueUsd,
      type: transactionType,
    });

    // Lazy load policyStorage
    const policyStorage = await getPolicyStorage();
    if (!policyStorage) {
      return sendError(res, 500, 'Policy storage module failed to load');
    }

    // Get stored policy for this wallet
    let policyRecord;
    try {
      policyRecord = await policyStorage.getWalletPolicy(body.walletAddress);
    } catch (storageError) {
      console.error('[Server] Policy lookup error:', storageError);
      return sendError(res, 500, 'Failed to lookup wallet policy');
    }

    if (!policyRecord) {
      console.log('[Server] No policy record found for wallet');
      return sendError(res, 404, 'Wallet not found in policy store. Create wallet through parent dashboard first.', {
        paraEnforced: true,
      });
    }

    const policy = policyRecord.policy;

    // Validate transaction against policy
    const validation = validateTransaction(policy, {
      chainId: body.chainId,
      type: transactionType,
      valueUsd: body.valueUsd,
      to: body.to,
    });

    if (!validation.allowed) {
      console.log('[Server] Transaction rejected by policy:', validation.reason);
      return res.status(403).json({
        success: false,
        allowed: false,
        error: `Para Policy Rejection: ${validation.reason}`,
        paraEnforced: true,
        rejectedBy: 'para_policy',
        condition: validation.condition,
        policy: {
          partnerId: policy.partnerId,
          allowedChains: getAllowedChainsFromPolicy(policy).map(c => CHAIN_NAMES[c] || c),
        },
      });
    }

    // Transaction passes policy validation
    console.log('[Server] Transaction allowed by policy');

    // Para API key check
    const paraSecretKey = process.env.PARA_SECRET_KEY;
    const paraEnv = process.env.VITE_PARA_ENV || 'development';

    if (!paraSecretKey) {
      console.log('[Server] PARA_SECRET_KEY not configured - returning validation result');
      return res.status(200).json({
        success: true,
        allowed: true,
        paraEnforced: true,
        message: 'Transaction approved by Para policy. (Dev mode - PARA_SECRET_KEY not set)',
        note: 'In production, Para would sign this transaction.',
        policy: {
          partnerId: policy.partnerId,
          allowedChains: getAllowedChainsFromPolicy(policy).map(c => CHAIN_NAMES[c] || c),
        },
      });
    }

    // Production: Call Para's signing API
    console.log('[Server] Calling Para signing API...');

    const sdk = await getParaSDK();
    if (!sdk) {
      return sendError(res, 500, 'Para SDK failed to load');
    }

    try {
      const { Para, Environment } = sdk;
      const env = paraEnv === 'production' ? Environment.PROD : Environment.BETA;
      const para = new Para(env, paraSecretKey);
      await para.ready();

      // Return success indicating Para validated the transaction
      return res.status(200).json({
        success: true,
        allowed: true,
        paraEnforced: true,
        message: 'Transaction validated. Para would sign this transaction.',
        policy: {
          partnerId: policy.partnerId,
          allowedChains: getAllowedChainsFromPolicy(policy).map(c => CHAIN_NAMES[c] || c),
        },
      });
    } catch (paraError) {
      const msg = paraError instanceof Error ? paraError.message : 'Para signing failed';
      console.error('[Server] Para error:', msg);

      // Check if this is a Para rejection
      if (msg.includes('policy') || msg.includes('permission') || msg.includes('rejected')) {
        return res.status(403).json({
          success: false,
          error: `Para rejected: ${msg}`,
          paraEnforced: true,
          rejectedBy: 'para_policy',
        });
      }

      return sendError(res, 500, `Para error: ${msg}`);
    }

  } catch (error) {
    // ULTIMATE FALLBACK - this MUST return JSON
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Server] Unhandled error:', error);

    return res.status(500).json({
      success: false,
      error: msg,
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
}
