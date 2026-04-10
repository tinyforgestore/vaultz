import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { activeModalAtom, pendingLicenseKeyAtom } from '@/store/atoms';

function parseLicenseKey(urls: string[]): string | null {
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      if (url.protocol === 'vaultz:' && url.pathname.replace(/^\//, '') === 'activate') {
        const key = url.searchParams.get('license_key');
        if (key) return key;
      }
    } catch { /* ignore malformed */ }
  }
  return null;
}

export function useDeepLink() {
  const setActiveModal = useSetAtom(activeModalAtom);
  const setPendingKey = useSetAtom(pendingLicenseKeyAtom);

  useEffect(() => {
    const handle = (urls: string[]) => {
      const key = parseLicenseKey(urls);
      if (!key) return;
      setPendingKey(key);
      setActiveModal('activate');
    };

    let mounted = true;

    // Cold launch
    getCurrent().then((urls) => { if (mounted && urls) handle(urls.map(String)); }).catch((e) => console.error('[deep-link] getCurrent failed:', e));

    // Warm launch
    let unlisten: (() => void) | null = null;
    onOpenUrl((urls) => handle(urls.map(String)))
      .then((fn) => {
        if (mounted) { unlisten = fn; }
        else { fn(); }
      })
      .catch((e) => console.error('[deep-link] onOpenUrl failed:', e));

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []);
}
