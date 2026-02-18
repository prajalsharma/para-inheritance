/**
 * Permission Context
 *
 * Provides global state management for permission policies and user profiles.
 *
 * Role lifecycle:
 * - User selects role on RoleSelector → setUserRole() called immediately
 * - After Para auth completes → setupUserProfile() merges wallet into profile
 *   WITHOUT overwriting the already-selected role
 *
 * Policy follows Para Permissions Architecture:
 *   Policy → Scopes → Permissions → Conditions
 *
 * @see https://docs.getpara.com/v2/react/guides/permissions
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
  BASE_CHAIN_ID,
} from '../types/permissions';
import { buildParaPolicy } from '../utils/paraPolicyBuilder';

const STORAGE_KEYS = {
  POLICIES: 'para_allowance_policies',
  USER_PROFILE: 'para_allowance_user_profile',
  LINKED_ACCOUNTS: 'para_allowance_linked_accounts',
} as const;

interface PermissionContextState {
  userProfile: UserProfile | null;
  policies: PermissionPolicy[];
  currentPolicy: PermissionPolicy | null;
  isLoading: boolean;
}

interface PermissionContextActions {
  setupUserProfile: (walletAddress: string, email?: string) => void;
  setUserRole: (role: UserRole) => void;
  createPolicy: (policy: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'>) => PermissionPolicy;
  updatePolicy: (policyId: string, updates: Partial<PermissionPolicy>) => void;
  deletePolicy: (policyId: string) => void;
  toggleBlockedAction: (policyId: string, action: BlockedAction) => void;
  linkChildToPolicy: (policyId: string, childWalletAddress: string) => void;
  loadChildPolicy: (parentWalletAddress: string) => void;
  clearUserData: () => void;
}

type PermissionContextType = PermissionContextState & PermissionContextActions;

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
   * Set up user profile after Para authentication.
   *
   * IMPORTANT: This merges the wallet address into the existing profile
   * WITHOUT overwriting the role. The role is set by setUserRole() which
   * is called when the user selects Parent or Child on the RoleSelector.
   */
  const setupUserProfile = useCallback((walletAddress: string, email?: string) => {
    setUserProfile(prev => {
      if (prev) {
        // Merge wallet address into existing profile (preserve role)
        return { ...prev, walletAddress, email: email ?? prev.email };
      }
      // No profile yet — create one with a default role of 'parent'
      // (RoleSelector will call setUserRole to override this)
      return { walletAddress, email, role: 'parent' };
    });
  }, []);

  /**
   * Set user role — called immediately when user clicks Parent or Child
   */
  const setUserRole = useCallback((role: UserRole) => {
    setUserProfile(prev =>
      prev ? { ...prev, role } : { walletAddress: '', role }
    );
  }, []);

  /**
   * Create a new permission policy.
   * Builds Para Policy JSON from parent's explicit selections.
   */
  const createPolicy = useCallback(
    (policyData: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'>): PermissionPolicy => {
      const now = Date.now();

      let paraPolicyJSON: ParaPolicyJSON | undefined;
      try {
        paraPolicyJSON = buildParaPolicy({
          name: policyData.name,
          usdLimit: policyData.usdLimit,
          restrictToBase: true, // always Base per spec
          allowedAddresses: policyData.allowedAddresses,
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

      setPolicies(prev => [...prev, newPolicy]);

      if (userProfile) {
        setUserProfile({ ...userProfile, policyId: newPolicy.id });
      }

      return newPolicy;
    },
    [userProfile]
  );

  /**
   * Update an existing policy and rebuild Para Policy JSON if needed
   */
  const updatePolicy = useCallback((policyId: string, updates: Partial<PermissionPolicy>) => {
    setPolicies(prev =>
      prev.map(policy => {
        if (policy.id !== policyId) return policy;

        const updated = { ...policy, ...updates, updatedAt: Date.now() };

        // Rebuild Para Policy JSON whenever relevant fields change
        if (
          updates.usdLimit !== undefined ||
          updates.allowedAddresses !== undefined ||
          updates.restrictToBase !== undefined
        ) {
          try {
            updated.paraPolicyJSON = buildParaPolicy({
              name: updated.name,
              usdLimit: updated.usdLimit,
              restrictToBase: true, // always Base per spec
              allowedAddresses: updated.allowedAddresses,
            });
          } catch (e) {
            console.error('[Policy] Failed to rebuild Para Policy JSON:', e);
          }
        }

        return updated;
      })
    );
  }, []);

  const deletePolicy = useCallback((policyId: string) => {
    setPolicies(prev => prev.filter(p => p.id !== policyId));
  }, []);

  const toggleBlockedAction = useCallback(
    (policyId: string, action: BlockedAction) => {
      setPolicies(prev =>
        prev.map(policy => {
          if (policy.id !== policyId) return policy;
          const hasAction = policy.blockedActions.includes(action);
          return {
            ...policy,
            blockedActions: hasAction
              ? policy.blockedActions.filter(a => a !== action)
              : [...policy.blockedActions, action],
            updatedAt: Date.now(),
          };
        })
      );
    },
    []
  );

  const linkChildToPolicy = useCallback(
    (policyId: string, childWalletAddress: string) => {
      updatePolicy(policyId, { childWalletAddress });

      const linkedAccounts = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.LINKED_ACCOUNTS) || '{}'
      );
      linkedAccounts[childWalletAddress.toLowerCase()] = {
        policyId,
        parentWalletAddress: userProfile?.walletAddress,
      };
      localStorage.setItem(STORAGE_KEYS.LINKED_ACCOUNTS, JSON.stringify(linkedAccounts));

      setUserProfile(prev => {
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

  const loadChildPolicy = useCallback((childWalletAddress: string) => {
    const linkedAccounts = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.LINKED_ACCOUNTS) || '{}'
    );
    const link = linkedAccounts[childWalletAddress.toLowerCase()];

    if (link) {
      const allPolicies = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.POLICIES) || '[]'
      );
      const policy = allPolicies.find((p: PermissionPolicy) => p.id === link.policyId);

      if (policy) {
        setCurrentPolicy(policy);
        setUserProfile(prev => {
          // Preserve the 'child' role that was set by RoleSelector
          const role = prev?.role === 'child' ? 'child' : 'child';
          return {
            walletAddress: childWalletAddress,
            role,
            policyId: policy.id,
            parentWalletAddress: link.parentWalletAddress,
          };
        });
      }
    }
  }, []);

  const clearUserData = useCallback(() => {
    setUserProfile(null);
    setCurrentPolicy(null);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  }, []);

  // Current policy for parent view
  const parentCurrentPolicy = userProfile?.policyId
    ? policies.find(p => p.id === userProfile.policyId) || null
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

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Create initial policy structure for new parents
 * Per spec: Base chain is required, $15 USD limit suggested, blocks deploy + smart contract
 */
export function createInitialPolicyStructure(
  parentWalletAddress: string
): Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt' | 'paraPolicyJSON'> {
  return {
    name: 'Child Allowance Policy',
    parentWalletAddress,
    blockedActions: DEFAULT_BLOCKED_ACTIONS,
    allowedChains: [BASE_CHAIN_ID], // Base only per spec
    restrictToBase: true,           // Always Base per spec
    usdLimit: 15,                   // Default $15 per spec
    allowedAddresses: undefined,    // Parent may optionally configure
    isActive: true,
  };
}
