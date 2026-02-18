/**
 * Permission Context
 *
 * Provides global state management for permission policies and user profiles.
 * This context manages:
 * - Current user profile and role (parent/child)
 * - Permission policies
 * - Policy CRUD operations
 *
 * Parent explicitly configures all permissions - no hardcoded defaults.
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
  BlockedAction,
  ParaPolicyJSON,
} from '../types/permissions';
import {
  DEFAULT_BLOCKED_ACTIONS,
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
}

/**
 * Permission Context Actions
 */
interface PermissionContextActions {
  /** Set up user profile after Para authentication */
  setupUserProfile: (walletAddress: string, email?: string) => void;
  /** Set user role (parent or child) */
  setUserRole: (role: UserRole) => void;
  /** Create a new permission policy (parent only) */
  createPolicy: (policy: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'>) => PermissionPolicy;
  /** Update an existing policy (parent only) */
  updatePolicy: (policyId: string, updates: Partial<PermissionPolicy>) => void;
  /** Delete a policy (parent only) */
  deletePolicy: (policyId: string) => void;
  /** Toggle blocked action */
  toggleBlockedAction: (policyId: string, action: BlockedAction) => void;
  /** Link child to policy */
  linkChildToPolicy: (policyId: string, childWalletAddress: string) => void;
  /** Load policy for child view */
  loadChildPolicy: (parentWalletAddress: string) => void;
  /** Clear all data (logout) */
  clearUserData: () => void;
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
   * Parent must explicitly configure all permissions
   */
  const createPolicy = useCallback(
    (policyData: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'>): PermissionPolicy => {
      const now = Date.now();

      // Build Para Policy JSON dynamically based on parent selections
      let paraPolicyJSON: ParaPolicyJSON | undefined;
      try {
        paraPolicyJSON = buildParaPolicy({
          name: policyData.name,
          usdLimit: policyData.usdLimit,
          allowedChains: policyData.allowedChains,
          restrictToBase: policyData.restrictToBase,
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
   * Update an existing policy
   */
  const updatePolicy = useCallback((policyId: string, updates: Partial<PermissionPolicy>) => {
    setPolicies((prev) =>
      prev.map((policy) => {
        if (policy.id !== policyId) return policy;

        const updatedPolicy = { ...policy, ...updates, updatedAt: Date.now() };

        // Rebuild Para Policy JSON if relevant fields changed
        if (updates.usdLimit !== undefined || updates.restrictToBase !== undefined || updates.allowedChains) {
          try {
            updatedPolicy.paraPolicyJSON = buildParaPolicy({
              name: updatedPolicy.name,
              usdLimit: updatedPolicy.usdLimit,
              allowedChains: updatedPolicy.allowedChains,
              restrictToBase: updatedPolicy.restrictToBase,
            });
          } catch (e) {
            console.error('[Policy] Failed to rebuild Para Policy JSON:', e);
          }
        }

        return updatedPolicy;
      })
    );
  }, []);

  /**
   * Delete a policy
   */
  const deletePolicy = useCallback((policyId: string) => {
    setPolicies((prev) => prev.filter((policy) => policy.id !== policyId));
  }, []);

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

      // Update parent's profile with child
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
    setupUserProfile,
    setUserRole,
    createPolicy,
    updatePolicy,
    deletePolicy,
    toggleBlockedAction,
    linkChildToPolicy,
    loadChildPolicy,
    clearUserData,
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
 * Create initial policy structure for new parents
 * Note: This does NOT set hardcoded values - parent must configure all permissions
 *
 * @param parentWalletAddress - Parent's wallet address
 */
export function createInitialPolicyStructure(
  parentWalletAddress: string
): Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'> {
  return {
    name: 'Child Allowance Policy',
    parentWalletAddress,
    blockedActions: DEFAULT_BLOCKED_ACTIONS,
    allowedChains: [], // Parent must configure
    restrictToBase: false, // Parent must explicitly enable
    usdLimit: undefined, // Parent must set
    isActive: true,
  };
}
