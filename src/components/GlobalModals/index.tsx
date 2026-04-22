import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { activeModalAtom, pendingLicenseKeyAtom, isLogoutConfirmAtom, logoutAtom } from '@/store/atoms';
import UpgradeToProModal from '@/components/modals/UpgradeToProModal';
import ActivateLicenseModal from '@/components/modals/ActivateLicenseModal';
import ProWelcomeModal from '@/components/modals/ProWelcomeModal';
import { useDeepLink } from '@/hooks/useDeepLink';
import { useNavigate } from 'react-router-dom';
import { sessionService } from '@/services/sessionService';
import { Dialog, Flex, Text, Button } from '@radix-ui/themes';

export default function GlobalModals() {
  useDeepLink();
  const [activeModal, setActiveModal] = useAtom(activeModalAtom);
  const [pendingLicenseKey, setPendingLicenseKey] = useAtom(pendingLicenseKeyAtom);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useAtom(isLogoutConfirmAtom);
  const logout = useSetAtom(logoutAtom);
  const navigate = useNavigate();

  const confirmLogout = () => {
    sessionService.logout()
      .then(() => {
        logout();
        setIsLogoutConfirmOpen(false);
        navigate('/login');
      })
      .catch(() => {
        logout();
        setIsLogoutConfirmOpen(false);
        navigate('/login');
      });
  };

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

  return (
    <Dialog.Root open={isLogoutConfirmOpen} onOpenChange={(open) => !open && setIsLogoutConfirmOpen(false)}>
      <Dialog.Content>
        <Dialog.Title>Logout</Dialog.Title>
        <Text>Are you sure you want to logout?</Text>
        <Flex gap="2" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">Cancel</Button>
          </Dialog.Close>
          <Button color="red" onClick={confirmLogout} autoFocus>Logout</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
