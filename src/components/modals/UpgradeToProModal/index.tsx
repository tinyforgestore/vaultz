import { Crown } from 'lucide-react';
import { Button, Flex, Text } from '@radix-ui/themes';
import { openUrl } from '@tauri-apps/plugin-opener';
import * as styles from './index.css';
import * as sharedStyles from '@/styles/shared.css';

const GUMROAD_PRODUCT_URL = 'https://tinyforgestore.gumroad.com/l/vaultz';

interface Props {
  onClose: () => void;
  onActivate: () => void;
}

export default function UpgradeToProModal({ onClose, onActivate }: Props) {
  const handleBuy = () => {
    openUrl(GUMROAD_PRODUCT_URL);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
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
            Buy on Gumroad
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
