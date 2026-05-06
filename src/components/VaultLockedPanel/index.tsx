import * as styles from './index.css';

interface VaultLockedPanelProps {
  message?: string;
}

export default function VaultLockedPanel({
  message = 'Vault locked — open Vaultz to unlock',
}: VaultLockedPanelProps) {
  return (
    <div className={styles.container}>
      <div className={styles.panel}>{message}</div>
    </div>
  );
}
