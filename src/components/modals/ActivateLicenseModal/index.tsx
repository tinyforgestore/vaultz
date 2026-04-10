import { Button, Flex, TextField } from '@radix-ui/themes';
import { useActivateLicense } from './useActivateLicense';
import * as styles from './index.css';

interface Props {
  initialKey?: string;
  autoSubmit?: boolean;
  onSuccess: () => void;
  onClose: () => void;
  onBuyInstead: () => void;
}

export default function ActivateLicenseModal({
  initialKey,
  autoSubmit,
  onSuccess,
  onClose,
  onBuyInstead,
}: Props) {
  const { keyInput, setKeyInput, activating, error, handleSubmit } = useActivateLicense({
    initialKey,
    autoSubmit,
    onSuccess,
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.heading}>Activate Pro License</h2>

        <Flex direction="column" gap="2">
          <TextField.Root
            size="2"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            disabled={activating}
          />
          {error && <span className={styles.errorText}>{error}</span>}
        </Flex>

        <Button
          color="amber"
          size="2"
          className={styles.activateButton}
          disabled={!keyInput.trim() || activating}
          onClick={handleSubmit}
        >
          {activating ? 'Activating…' : 'Activate'}
        </Button>

        <button className={styles.buyLink} onClick={onBuyInstead}>
          Don't have a license yet? Buy on Gumroad →
        </button>
      </div>
    </div>
  );
}
