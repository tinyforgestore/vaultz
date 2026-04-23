import { Crown } from 'lucide-react';
import { Button, Flex, Text } from '@radix-ui/themes';
import { openUrl } from '@tauri-apps/plugin-opener';
import * as styles from './index.css';
import * as sharedStyles from '@/styles/shared.css';

const LS_CHECKOUT_URL = 'https://tinyforgestore.lemonsqueezy.com/checkout/buy/1a249b54-4356-4b66-98e2-5ad796096efa';

interface Props {
  onClose: () => void;
  onActivate: () => void;
}

export default function UpgradeToProModal({ onClose, onActivate }: Props) {
  const handleBuy = () => {
    openUrl(LS_CHECKOUT_URL);
  };

  return (
    <div className={styles.overlay} onClick={onClose} data-testid="modal-overlay">
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrap}>
          <Crown size={44} color="var(--amber-9)" />
        </div>

        <h2 className={styles.heading}>Upgrade to Pro</h2>

        <ul className={styles.benefitsList}>
          <li className={styles.benefitItem}>Unlimited passwords</li>
          <li className={styles.benefitItem}>Unlimited folders</li>
          <li className={styles.benefitItem}>All future features included</li>
        </ul>

        <Flex direction="column" gap="2" className={sharedStyles.fullWidth}>
          <Button size="3" className={sharedStyles.fullWidth} onClick={handleBuy}>
            Buy Pro License
          </Button>
        </Flex>

        <Text size="2">
          <button className={styles.activateLink} onClick={onActivate}>
            Already have a license key? Activate →
          </button>
        </Text>
      </div>
    </div>
  );
}
