/**
 * Permission Context
 *
 * Provides global state management for permission policies and user profiles.
 * This context manages:
 * - Current user profile and role (parent/child)
 * - Permission policies
 * - Policy CRUD operations
 *
 * In a production app, this would persist to a backend database.
 * For this demo, we use localStorage for persistence.
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import type { ReactNode } from 'react';
import type {
  PermissionPolicy,
  UserProfile,
  UserRole,
  ApprovedMerchant,
  BlockedAction,
  PolicyTemplateId,
  ParaEnvironment,
  ParaPolicyJSON,
} from '../types/permissions';
import {
  DEFAULT_BLOCKED_ACTIONS,
  DEFAULT_ALLOWED_CHAINS,
  getPolicyTemplate,
} from '../types/permissions';
import { buildParaPolicy } from '../utils/paraPolicyBuilder';

/**
 * Storage keys for localStorage persistence
 */
const STORAGE_KEYS = {
  POLICIES: 'para_allowance_policies',
  USER_PROFILE: 'para_allowance_user_profile',
  LINKED_ACCOUNTS: 'para_allowance_linked_accounts',
} as const;

/**
 * Permission Context State
 */
interface PermissionContextState {
  /** Current user profile */
  userProfile: UserProfile | null;
  /** All permission policies (for parents) */
  policies: PermissionPolicy[];
  /** Current policy (for children) */
  currentPolicy: PermissionPolicy | null;
  /** Loading state */
  isLoading: boolean;
  /** Selected Para environment */
  selectedEnvironment: ParaEnvironment;
  /** Selected policy template */
  selectedTemplate: PolicyTemplateId | null;
}

/**
 * Permission Context Actions
 */
interface PermissionContextActions {
  /** Set up user profile after Para authentication */
  setupUserProfile: (walletAddress: string, email?: string) => void;
  /** Set user role (parent or child) */
  setUserRole: (role: UserRole) => void;
  /** Set selected Para environment */
  setSelectedEnvironment: (env: ParaEnvironment) => void;
  /** Set selected policy template */
  setSelectedTemplate: (template: PolicyTemplateId | null) => void;
  /** Create a new permission policy (parent only) */
  createPolicy: (policy: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'>) => PermissionPolicy;
  /** Update an existing policy (parent only) */
  updatePolicy: (policyId: string, updates: Partial<PermissionPolicy>) => void;
  /** Delete a policy (parent only) */
  deletePolicy: (policyId: string) => void;
  /** Add merchant to allowlist */
  addMerchantToAllowlist: (policyId: string, merchant: ApprovedMerchant) => void;
  /** Remove merchant from allowlist */
  removeMerchantFromAllowlist: (policyId: string, merchantId: string) => void;
  /** Toggle blocked action */
  toggleBlockedAction: (policyId: string, action: BlockedAction) => void;
  /** Link child to policy */
  linkChildToPolicy: (policyId: string, childWalletAddress: string) => void;
  /** Load policy for child view */
  loadChildPolicy: (parentWalletAddress: string) => void;
  /** Clear all data (logout) */
  clearUserData: () => void;
  /** Rebuild Para Policy JSON for a policy */
  rebuildParaPolicyJSON: (policyId: string) => void;
}

type PermissionContextType = PermissionContextState & PermissionContextActions;

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Permission Provider Component
 */
export function PermissionProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [policies, setPolicies] = useState<PermissionPolicy[]>([]);
  const [currentPolicy, setCurrentPolicy] = useState<PermissionPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnvironment, setSelectedEnvironment] = useState<ParaEnvironment>('beta');
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplateId | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      const savedPolicies = localStorage.getItem(STORAGE_KEYS.POLICIES);

      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }
      if (savedPolicies) {
        setPolicies(JSON.parse(savedPolicies));
      }
    } catch (error) {
      console.error('Error loading persisted data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist user profile changes
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
    }
  }, [userProfile]);

  // Persist policy changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies));
  }, [policies]);

  /**
   * Set up user profile after Para authentication
   */
  const setupUserProfile = useCallback((walletAddress: string, email?: string) => {
    setUserProfile({
      walletAddress,
      email,
      role: 'parent', // Default to parent role
    });
  }, []);

  /**
   * Set user role
   */
  const setUserRole = useCallback((role: UserRole) => {
    setUserProfile((prev) =>
      prev ? { ...prev, role } : null
    );
  }, []);

  /**
   * Create a new permission policy
   */
  const createPolicy = useCallback(
    (policyData: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'>): PermissionPolicy => {
      const now = Date.now();

      // Build Para Policy JSON from template
      let paraPolicyJSON: ParaPolicyJSON | undefined;
      try {
        paraPolicyJSON = buildParaPolicy({
          templateId: policyData.templateId,
          name: policyData.name,
          allowlist: policyData.allowlist,
          customUsdLimit: policyData.usdLimit,
        });
      } catch (e) {
        console.error('[Policy] Failed to build Para Policy JSON:', e);
      }

      const newPolicy: PermissionPolicy = {
        ...policyData,
        id: generateId(),
        paraPolicyJSON,
        createdAt: now,
        updatedAt: now,
      };

      setPolicies((prev) => [...prev, newPolicy]);

      // Update user profile with new policy
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          policyId: newPolicy.id,
        });
      }

      return newPolicy;
    },
    [userProfile]
  );

  /**
   * Rebuild Para Policy JSON for a policy
   */
  const rebuildParaPolicyJSON = useCallback(
    (policyId: string) => {
      setPolicies((prev) =>
        prev.map((policy) => {
          if (policy.id !== policyId) return policy;

          let paraPolicyJSON: ParaPolicyJSON | undefined;
          try {
            paraPolicyJSON = buildParaPolicy({
              templateId: policy.templateId,
              name: policy.name,
              allowlist: policy.allowlist,
              customUsdLimit: policy.usdLimit,
            });
          } catch (e) {
            console.error('[Policy] Failed to rebuild Para Policy JSON:', e);
          }

          return {
            ...policy,
            paraPolicyJSON,
            updatedAt: Date.now(),
          };
        })
      );
    },
    []
  );

  /**
   * Update an existing policy
   */
  const updatePolicy = useCallback((policyId: string, updates: Partial<PermissionPolicy>) => {
    setPolicies((prev) =>
      prev.map((policy) =>
        policy.id === policyId
          ? { ...policy, ...updates, updatedAt: Date.now() }
          : policy
      )
    );
  }, []);

  /**
   * Delete a policy
   */
  const deletePolicy = useCallback((policyId: string) => {
    setPolicies((prev) => prev.filter((policy) => policy.id !== policyId));
  }, []);

  /**
   * Add merchant to allowlist
   */
  const addMerchantToAllowlist = useCallback(
    (policyId: string, merchant: ApprovedMerchant) => {
      setPolicies((prev) =>
        prev.map((policy) => {
          if (policy.id !== policyId) return policy;

          const updatedPolicy = {
            ...policy,
            allowlist: [...policy.allowlist, merchant],
            updatedAt: Date.now(),
          };

          // Rebuild Para Policy JSON with new allowlist
          try {
            updatedPolicy.paraPolicyJSON = buildParaPolicy({
              templateId: updatedPolicy.templateId,
              name: updatedPolicy.name,
              allowlist: updatedPolicy.allowlist,
              customUsdLimit: updatedPolicy.usdLimit,
            });
          } catch (e) {
            console.error('[Policy] Failed to rebuild Para Policy JSON:', e);
          }

          return updatedPolicy;
        })
      );
    },
    []
  );

  /**
   * Remove merchant from allowlist
   */
  const removeMerchantFromAllowlist = useCallback(
    (policyId: string, merchantId: string) => {
      setPolicies((prev) =>
        prev.map((policy) => {
          if (policy.id !== policyId) return policy;

          const updatedPolicy = {
            ...policy,
            allowlist: policy.allowlist.filter((m) => m.id !== merchantId),
            updatedAt: Date.now(),
          };

          // Rebuild Para Policy JSON with updated allowlist
          try {
            updatedPolicy.paraPolicyJSON = buildParaPolicy({
              templateId: updatedPolicy.templateId,
              name: updatedPolicy.name,
              allowlist: updatedPolicy.allowlist,
              customUsdLimit: updatedPolicy.usdLimit,
            });
          } catch (e) {
            console.error('[Policy] Failed to rebuild Para Policy JSON:', e);
          }

          return updatedPolicy;
        })
      );
    },
    []
  );

  /**
   * Toggle blocked action
   */
  const toggleBlockedAction = useCallback(
    (policyId: string, action: BlockedAction) => {
      setPolicies((prev) =>
        prev.map((policy) => {
          if (policy.id !== policyId) return policy;

          const hasAction = policy.blockedActions.includes(action);
          return {
            ...policy,
            blockedActions: hasAction
              ? policy.blockedActions.filter((a) => a !== action)
              : [...policy.blockedActions, action],
            updatedAt: Date.now(),
          };
        })
      );
    },
    []
  );

  /**
   * Link child wallet to policy
   */
  const linkChildToPolicy = useCallback(
    (policyId: string, childWalletAddress: string) => {
      console.log('[Policy] linkChildToPolicy:', { policyId, childWalletAddress });

      // Update the policy with child address
      updatePolicy(policyId, { childWalletAddress });

      // Save the link for child to find their policy
      const linkedAccounts = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.LINKED_ACCOUNTS) || '{}'
      );
      linkedAccounts[childWalletAddress.toLowerCase()] = {
        policyId,
        parentWalletAddress: userProfile?.walletAddress,
      };
      localStorage.setItem(STORAGE_KEYS.LINKED_ACCOUNTS, JSON.stringify(linkedAccounts));

      // Update parent's profile with child - use updater to avoid stale closure
      setUserProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          childWalletAddresses: [
            ...(prev.childWalletAddresses || []),
            childWalletAddress,
          ],
        };
      });
    },
    [updatePolicy, userProfile?.walletAddress]
  );

  /**
   * Load policy for child view
   */
  const loadChildPolicy = useCallback(
    (childWalletAddress: string) => {
      const linkedAccounts = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.LINKED_ACCOUNTS) || '{}'
      );
      const link = linkedAccounts[childWalletAddress.toLowerCase()];

      if (link) {
        // Find the policy from all stored policies
        const allPolicies = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.POLICIES) || '[]'
        );
        const policy = allPolicies.find((p: PermissionPolicy) => p.id === link.policyId);

        if (policy) {
          setCurrentPolicy(policy);
          setUserProfile({
            walletAddress: childWalletAddress,
            role: 'child',
            policyId: policy.id,
            parentWalletAddress: link.parentWalletAddress,
          });
        }
      }
    },
    []
  );

  /**
   * Clear all user data (logout)
   */
  const clearUserData = useCallback(() => {
    setUserProfile(null);
    setCurrentPolicy(null);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  }, []);

  // Find current policy for parent view
  const parentCurrentPolicy = userProfile?.policyId
    ? policies.find((p) => p.id === userProfile.policyId) || null
    : policies[0] || null;

  const value: PermissionContextType = {
    userProfile,
    policies,
    currentPolicy: userProfile?.role === 'child' ? currentPolicy : parentCurrentPolicy,
    isLoading,
    selectedEnvironment,
    selectedTemplate,
    setupUserProfile,
    setUserRole,
    setSelectedEnvironment,
    setSelectedTemplate,
    createPolicy,
    updatePolicy,
    deletePolicy,
    addMerchantToAllowlist,
    removeMerchantFromAllowlist,
    toggleBlockedAction,
    linkChildToPolicy,
    loadChildPolicy,
    clearUserData,
    rebuildParaPolicyJSON,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to access permission context
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Create a default policy for new parents
 *
 * This creates a policy with sensible security defaults:
 * - Block contract deployments
 * - Block transfers outside allowlist
 * - Block token approvals
 *
 * @param parentWalletAddress - Parent's wallet address
 * @param templateId - Selected policy template
 * @param environment - Selected Para environment
 */
export function createDefaultPolicy(
  parentWalletAddress: string,
  templateId: PolicyTemplateId = 'base-only',
  environment: ParaEnvironment = 'beta'
): Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'> {
  const template = getPolicyTemplate(templateId);

  return {
    name: template?.name || 'Allowance Policy',
    parentWalletAddress,
    templateId,
    environment,
    allowlist: [],
    blockedActions: DEFAULT_BLOCKED_ACTIONS,
    allowedChains: template?.allowedChains || DEFAULT_ALLOWED_CHAINS,
    usdLimit: template?.usdLimit,
    isActive: true,
  };
}
