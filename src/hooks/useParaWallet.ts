/**
 * Para Wallet Hook
 *
 * Centralized hook for opening Para's embedded wallet UI.
 * Allows users to view balance, send/receive crypto, and sign messages.
 *
 * IMPORTANT: This does NOT bypass permissions.
 * - Child wallets still respect chain restrictions and USD limits
 * - Para backend is the enforcement authority
 * - Client-side checks are UX only
 *
 * @see https://docs.getpara.com/v2/react/guides/customization/modal
 */

import { useCallback } from 'react';
import { useModal, useParaStatus, useAccount, useWallet } from '@getpara/react-sdk';

interface UseParaWalletReturn {
  /**
   * Open the Para embedded wallet modal.
   * This shows the wallet UI where users can:
   * - View balance
   * - Send crypto (subject to policy restrictions)
   * - Receive crypto (view address/QR)
   * - Sign messages (if allowed by policy)
   */
  openWallet: () => void;
  /**
   * Whether the wallet can be opened (user is authenticated and SDK ready)
   */
  canOpenWallet: boolean;
  /**
   * Current wallet address
   */
  walletAddress: string | null;
  /**
   * Whether the modal is currently open
   */
  isModalOpen: boolean;
}

/**
 * Hook for opening Para's embedded wallet UI
 *
 * Usage:
 * ```tsx
 * const { openWallet, canOpenWallet } = useParaWallet();
 *
 * return (
 *   <button onClick={openWallet} disabled={!canOpenWallet}>
 *     Open Wallet
 *   </button>
 * );
 * ```
 */
export function useParaWallet(): UseParaWalletReturn {
  const { openModal, isOpen } = useModal();
  const paraStatus = useParaStatus();
  const account = useAccount();
  const { data: wallet } = useWallet();

  const isAuthenticated = account.isConnected;
  const isReady = paraStatus.isReady;
  const canOpenWallet = isAuthenticated && isReady;
  const walletAddress = wallet?.address || null;

  const openWallet = useCallback(() => {
    if (!canOpenWallet) {
      console.warn('[ParaWallet] Cannot open wallet:', {
        isAuthenticated,
        isReady,
      });
      return;
    }

    try {
      // Open the Para modal - it will show wallet management for authenticated users
      // Para's modal automatically shows the appropriate view based on auth state
      openModal();
      console.log('[ParaWallet] Wallet modal opened');
    } catch (error) {
      console.error('[ParaWallet] Failed to open wallet:', error);
    }
  }, [canOpenWallet, isAuthenticated, isReady, openModal]);

  return {
    openWallet,
    canOpenWallet,
    walletAddress,
    isModalOpen: isOpen,
  };
}

export default useParaWallet;
