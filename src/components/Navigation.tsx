/**
 * Navigation Component
 *
 * Provides navigation for the app and logout functionality.
 */

import { useParaAuth } from '../hooks/useParaAuth';
import { usePermissions } from '../contexts/PermissionContext';
import styles from './Navigation.module.css';

interface NavigationProps {
  onLogout: () => void;
}

export function Navigation({ onLogout }: NavigationProps) {
  const { email, wallets, logout } = useParaAuth();
  const { userProfile } = usePermissions();

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.logo}>💰</span>
        <span className={styles.title}>Allowance Wallet</span>
        <span className={styles.role}>
          {userProfile?.role === 'parent' ? '(Parent)' : '(Child)'}
        </span>
      </div>

      <div className={styles.user}>
        {email && <span className={styles.email}>{email}</span>}
        {wallets[0] && (
          <span className={styles.address}>
            {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-4)}
          </span>
        )}
        <button className={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
