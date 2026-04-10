import { useAtom } from 'jotai';
import { activeModalAtom, pendingLicenseKeyAtom } from '@/store/atoms';
import UpgradeToProModal from '@/components/modals/UpgradeToProModal';
import ActivateLicenseModal from '@/components/modals/ActivateLicenseModal';
import ProWelcomeModal from '@/components/modals/ProWelcomeModal';
import { useDeepLink } from '@/hooks/useDeepLink';

export default function GlobalModals() {
  useDeepLink();
  const [activeModal, setActiveModal] = useAtom(activeModalAtom);
  const [pendingLicenseKey, setPendingLicenseKey] = useAtom(pendingLicenseKeyAtom);

  if (activeModal === 'upgrade') {
    return (
      <UpgradeToProModal
        onClose={() => {
          setPendingLicenseKey(null);
          setActiveModal(null);
        }}
        onActivate={() => setActiveModal('activate')}
      />
    );
  }

  if (activeModal === 'activate') {
    return (
      <ActivateLicenseModal
        initialKey={pendingLicenseKey ?? undefined}
        autoSubmit={!!pendingLicenseKey}
        onClose={() => setActiveModal(null)}
        onBuyInstead={() => setActiveModal('upgrade')}
        onSuccess={() => setActiveModal('proWelcome')}
      />
    );
  }

  if (activeModal === 'proWelcome') {
    return <ProWelcomeModal onClose={() => setActiveModal(null)} />;
  }

  return null;
}
