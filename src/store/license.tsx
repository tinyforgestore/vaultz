import { createContext, useContext, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { licenseStatusAtom } from '@/atoms/license';
import { activeModalAtom, pendingLicenseKeyAtom } from '@/atoms/ui';
import type { ActiveModal } from '@/atoms/ui';
import { isProAtom } from '@/atoms/derived';
import { LicenseStatus } from '@/types/license';

interface LicenseStore {
  licenseStatus: LicenseStatus | null;
  isPro: boolean;
  activeModal: ActiveModal;
  pendingLicenseKey: string | null;
}

export const LicenseStoreContext = createContext<LicenseStore | null>(null);
export type { LicenseStore };

export function LicenseStoreProvider({ children }: { children: React.ReactNode }) {
  const licenseStatus = useAtomValue(licenseStatusAtom);
  const isPro = useAtomValue(isProAtom);
  const activeModal = useAtomValue(activeModalAtom);
  const pendingLicenseKey = useAtomValue(pendingLicenseKeyAtom);
  const value = useMemo(
    () => ({ licenseStatus, isPro, activeModal, pendingLicenseKey }),
    [licenseStatus, isPro, activeModal, pendingLicenseKey]
  );
  return <LicenseStoreContext.Provider value={value}>{children}</LicenseStoreContext.Provider>;
}

export function useLicenseStore(): LicenseStore {
  const ctx = useContext(LicenseStoreContext);
  if (!ctx) throw new Error('useLicenseStore must be used within LicenseStoreProvider');
  return ctx;
}
