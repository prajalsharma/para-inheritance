/**
 * Role Selector Component
 *
 * Initial screen that lets users choose their role:
 * - Parent: Creates and manages allowance policies
 * - Child: Views their allowance rules (read-only)
 *
 * @see https://docs.getpara.com/v2/concepts/universal-embedded-wallets
 */

import { usePermissions } from '../contexts/PermissionContext';
import type { UserRole } from '../types/permissions';
import styles from './RoleSelector.module.css';

interface RoleSelectorProps {
  onRoleSelect: (role: UserRole) => void;
}

export function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  const { setUserRole } = usePermissions();

  const handleSelect = (role: UserRole) => {
    setUserRole(role);
    onRoleSelect(role);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>Para Allowance Wallet</h1>
        <p className={styles.subtitle}>
          A secure crypto wallet with parent-controlled permissions.
        </p>

        <div className={styles.roleCards}>
          <button
            className={styles.roleCard}
            onClick={() => handleSelect('parent')}
          >
            <span className={styles.roleIcon}>👨‍👩‍👧</span>
            <h2>I'm a Parent</h2>
            <p>
              Create a wallet and set up allowance rules for your child.
            </p>
            <ul className={styles.roleFeatures}>
              <li>Create secure wallets</li>
              <li>Set merchant allowlists</li>
              <li>Block risky actions</li>
              <li>Control spending limits</li>
            </ul>
          </button>

          <button
            className={styles.roleCard}
            onClick={() => handleSelect('child')}
          >
            <span className={styles.roleIcon}>👧</span>
            <h2>I'm a Child</h2>
            <p>
              View your allowance rules and use your wallet within limits.
            </p>
            <ul className={styles.roleFeatures}>
              <li>View approved merchants</li>
              <li>See spending limits</li>
              <li>Understand your rules</li>
              <li>Use wallet safely</li>
            </ul>
          </button>
        </div>

        <p className={styles.poweredBy}>
          Powered by{' '}
          <a
            href="https://docs.getpara.com/v2/concepts/universal-embedded-wallets"
            target="_blank"
            rel="noopener noreferrer"
          >
            Para Universal Embedded Wallets
          </a>
        </p>
      </div>
    </div>
  );
}
