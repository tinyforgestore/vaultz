import { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { licenseStatusAtom, pendingLicenseKeyAtom } from '@/store/atoms';

interface UseActivateLicenseProps {
  initialKey?: string;
  autoSubmit?: boolean;
  onSuccess: () => void;
}

export function useActivateLicense({ initialKey, autoSubmit, onSuccess }: UseActivateLicenseProps) {
  const [keyInput, setKeyInput] = useState(initialKey ?? '');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setLicenseStatus = useSetAtom(licenseStatusAtom);
  const setPendingKey = useSetAtom(pendingLicenseKeyAtom);

  const activateLicense = (key: string) => {
    setActivating(true);
    setError(null);
    invoke('activate_license', { key: key.trim() })
      .then(() => {
        setLicenseStatus({ is_active: true });
        onSuccess();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || 'Activation failed');
      })
      .finally(() => {
        setActivating(false);
      });
  };

  useEffect(() => {
    setPendingKey(null);
    if (autoSubmit && initialKey) {
      activateLicense(initialKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => {
    if (!keyInput.trim() || activating) return;
    activateLicense(keyInput);
  };

  return { keyInput, setKeyInput, activating, error, handleSubmit };
}
