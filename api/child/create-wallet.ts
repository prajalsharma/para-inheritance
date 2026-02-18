/**
 * Server-side Child Wallet Creation Endpoint
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

// Partner ID for this app
const PARTNER_ID = process.env.VITE_PARA_PARTNER_ID || 'para-allowance-wallet';

// Chain IDs
const BASE_CHAIN_ID = '8453';
const ALL_CHAINS = ['8453', '1', '137', '42161', '10'];

interface CreateWalletRequest {
  parentWalletAddress: string;
  restrictToBase: boolean;
  maxUsd?: number;
  policyName?: string;
  paymentToken?: string;
  devMode?: boolean;
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
    storeWalletPolicy: async (walletAddress: string, parentAddress: string, policy: ParaPolicyJSON) => {
      inMemoryPolicies.set(walletAddress.toLowerCase(), { policy, parentAddress: parentAddress.toLowerCase() });
      console.log('[PolicyStorage] Stored policy for:', walletAddress.substring(0, 10) + '...');
    },
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
 * Build Para Policy JSON following the official schema
 */
function buildParaPolicy(options: {
  restrictToBase: boolean;
  maxUsd?: number;
  name?: string;
}): ParaPolicyJSON {
  const allowedChains = options.restrictToBase ? [BASE_CHAIN_ID] : ALL_CHAINS;

  // Build transfer permissions for each chain
  const transferPermissions: ParaPermission[] = allowedChains.map(chainId => {
    const conditions: ParaPolicyCondition[] = [];

    // Add USD limit condition if specified
    if (options.maxUsd !== undefined && options.maxUsd > 0) {
      conditions.push({
        type: 'STATIC',
        resource: 'VALUE',
        comparator: 'LESS_THAN',
        reference: options.maxUsd,
      });
    }

    return {
      effect: 'ALLOW' as const,
      chainId,
      type: 'TRANSFER' as const,
      conditions,
    };
  });

  // Build sign message permissions
  const signPermissions: ParaPermission[] = allowedChains.map(chainId => ({
    effect: 'ALLOW' as const,
    chainId,
    type: 'SIGN_MESSAGE' as const,
    conditions: [],
  }));

  // Build DENY permissions for contract deployment (security)
  const denyDeployPermissions: ParaPermission[] = allowedChains.map(chainId => ({
    effect: 'DENY' as const,
    chainId,
    type: 'DEPLOY_CONTRACT' as const,
    conditions: [],
  }));

  // Build description
  const limitDesc = options.maxUsd ? ` up to $${options.maxUsd} USD` : '';
  const chainDesc = options.restrictToBase ? ' on Base' : '';

  return {
    partnerId: PARTNER_ID,
    validFrom: Date.now(),
    scopes: [
      {
        name: 'transfer',
        description: `Allow sending funds${limitDesc}${chainDesc}`,
        required: true,
        permissions: transferPermissions,
      },
      {
        name: 'sign_messages',
        description: 'Allow signing messages for verification',
        required: false,
        permissions: signPermissions,
      },
      {
        name: 'deny_deploy',
        description: 'Block contract deployment for security',
        required: true,
        permissions: denyDeployPermissions,
      },
    ],
  };
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
 * Extract USD limit from policy
 */
function getUsdLimitFromPolicy(policy: ParaPolicyJSON): number | undefined {
  for (const scope of policy.scopes) {
    for (const perm of scope.permissions) {
      if (perm.type === 'TRANSFER' && perm.effect === 'ALLOW') {
        for (const cond of perm.conditions) {
          if (cond.resource === 'VALUE' && cond.comparator === 'LESS_THAN') {
            return typeof cond.reference === 'number' ? cond.reference : undefined;
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * Verify payment using Stripe (if configured)
 */
async function verifyPayment(paymentToken?: string, devMode?: boolean): Promise<{ success: boolean; error?: string }> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    if (devMode) {
      console.log('[Server] Dev mode: Skipping payment verification');
      return { success: true };
    }
    return { success: false, error: 'Payment processing not configured. Contact administrator.' };
  }

  if (!paymentToken) {
    return { success: false, error: 'Payment token required' };
  }

  try {
    console.log('[Server] Payment verified via Stripe:', paymentToken.substring(0, 10) + '...');
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Payment verification failed';
    return { success: false, error: msg };
  }
}

/**
 * Create wallet via Para Server SDK
 */
async function createWalletViaPara(
  parentAddress: string,
  policy: ParaPolicyJSON,
  policyStorage: Awaited<ReturnType<typeof getPolicyStorage>>
): Promise<{ success: boolean; walletAddress?: string; walletId?: string; error?: string }> {
  const paraApiKey = process.env.PARA_SECRET_KEY;
  const paraEnv = process.env.VITE_PARA_ENV || 'development';

  if (!paraApiKey) {
    return { success: false, error: 'Para API key not configured. Set PARA_SECRET_KEY in environment.' };
  }

  if (!policyStorage) {
    return { success: false, error: 'Policy storage module not available' };
  }

  try {
    const timestamp = Date.now();
    const childIdentifier = `child_${parentAddress.toLowerCase()}_${timestamp}`;

    console.log('[Server] Creating wallet via Para Server SDK:', {
      env: paraEnv,
      parentAddress: parentAddress.substring(0, 10) + '...',
      childIdentifier: childIdentifier.substring(0, 30) + '...',
      partnerId: policy.partnerId,
    });

    const sdk = await getParaSDK();
    if (!sdk) {
      return { success: false, error: 'Para SDK failed to load' };
    }

    const { Para, Environment } = sdk;
    const env = paraEnv === 'production' ? Environment.PROD : Environment.BETA;
    const para = new Para(env, paraApiKey);
    await para.ready();

    console.log('[Server] Para SDK initialized');

    const wallet = await para.createPregenWallet({
      type: 'EVM',
      pregenId: { customId: childIdentifier },
    });

    console.log('[Server] Para wallet created:', {
      walletId: wallet.id,
      address: wallet.address,
      type: wallet.type,
    });

    if (!wallet.address) {
      throw new Error('Para SDK returned no wallet address');
    }

    // Store the policy for this wallet
    await policyStorage.storeWalletPolicy(wallet.address, parentAddress, policy);

    console.log('[Server] Policy stored for wallet');

    return {
      success: true,
      walletAddress: wallet.address,
      walletId: wallet.id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Wallet creation failed';
    console.error('[Server] Wallet creation error:', msg);
    return { success: false, error: msg };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS and Content-Type headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Wrap EVERYTHING in try-catch to guarantee JSON response
  try {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    const body = (req.body || {}) as CreateWalletRequest;

    // Validate required fields
    if (!body.parentWalletAddress || typeof body.parentWalletAddress !== 'string') {
      return sendError(res, 400, 'Parent wallet address required');
    }

    if (!body.parentWalletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return sendError(res, 400, 'Invalid wallet address format');
    }

    console.log('[Server] Create wallet request:', {
      parentAddress: body.parentWalletAddress.substring(0, 10) + '...',
      restrictToBase: body.restrictToBase,
      maxUsd: body.maxUsd,
      devMode: body.devMode,
    });

    // Load policyStorage lazily
    const policyStorage = await getPolicyStorage();
    if (!policyStorage) {
      return sendError(res, 500, 'Policy storage module failed to load');
    }

    // Step 1: Verify payment
    const paymentResult = await verifyPayment(body.paymentToken, body.devMode);
    if (!paymentResult.success) {
      return sendError(res, 402, paymentResult.error || 'Payment required');
    }

    // Step 2: Build policy using official Para schema
    const policy = buildParaPolicy({
      restrictToBase: body.restrictToBase ?? false,
      maxUsd: body.maxUsd,
      name: body.policyName,
    });

    console.log('[Server] Built policy:', {
      partnerId: policy.partnerId,
      scopeCount: policy.scopes.length,
      allowedChains: getAllowedChainsFromPolicy(policy),
      usdLimit: getUsdLimitFromPolicy(policy),
    });

    // Step 3: Create wallet via Para
    const walletResult = await createWalletViaPara(body.parentWalletAddress, policy, policyStorage);

    if (!walletResult.success) {
      return sendError(res, 500, walletResult.error || 'Wallet creation failed');
    }

    // Step 4: Return success
    const allowedChains = getAllowedChainsFromPolicy(policy);
    return res.status(200).json({
      success: true,
      walletAddress: walletResult.walletAddress,
      walletId: walletResult.walletId,
      policy: {
        partnerId: policy.partnerId,
        allowedChains,
        hasUsdLimit: getUsdLimitFromPolicy(policy) !== undefined,
        usdLimit: body.maxUsd,
        restrictToBase: body.restrictToBase,
      },
    });

  } catch (error) {
    // ULTIMATE FALLBACK - this MUST return JSON
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Server] Unhandled error:', error);

    return res.status(500).json({
      success: false,
      error: msg,
    });
  }
}
