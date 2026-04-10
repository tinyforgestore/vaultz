import { Crown } from 'lucide-react';
import * as styles from './index.css';

interface Props {
  onClose: () => void;
}

export default function ProWelcomeModal({ onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrap}>
          <Crown size={44} color="white" />
        </div>
        <h2 className={styles.title}>Welcome to Pro!</h2>
        <p className={styles.subtitle}>
          You now have unlimited entries and folders. Enjoy the full Vaultz experience!
        </p>
        <button className={styles.dismiss} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
