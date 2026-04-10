import { useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { activeModalAtom } from '@/store/atoms';
import { LimitStatus } from '@/types/license';

export function useLimitCheck() {
  const setActiveModal = useSetAtom(activeModalAtom);

  const checkAndOpen = (type: 'password' | 'folder', onAllowed: () => void, onBlocked?: () => void) => {
    invoke<LimitStatus>('check_limit_status')
      .then((status) => {
        const atLimit = type === 'password' ? status.passwords_at_limit : status.folders_at_limit;
        if (atLimit) {
          onBlocked?.();
          setActiveModal('upgrade');
        } else {
          onAllowed();
        }
      })
      .catch(() => {
        // fail open — IPC/DB error should not block the user; backend enforces at write time
        onAllowed();
      });
  };

  return { checkAndOpen };
}
