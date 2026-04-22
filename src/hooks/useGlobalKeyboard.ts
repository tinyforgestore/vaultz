import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSetAtom, useAtomValue } from 'jotai';
import { isLogoutConfirmAtom } from '@/store/atoms';

export function useGlobalKeyboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const setIsLogoutConfirm = useSetAtom(isLogoutConfirmAtom);
  const isLogoutConfirmOpen = useAtomValue(isLogoutConfirmAtom);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      // Only suppress when the user is actively typing. BUTTON is intentionally
      // excluded — global shortcuts (Cmd+,, Cmd+Shift+L) should fire even when a
      // button is focused (e.g. Radix Select triggers). See useKeyboardNav for the
      // Dashboard-local guard that does suppress shortcuts on focused buttons.
      const isTypingContext =
        tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;

      if (isTypingContext) return;
      if (isLogoutConfirmOpen) return;

      // Cmd+, → Settings
      if (e.key === ',' && e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        navigate('/settings');
        return;
      }

      // ← → back to Dashboard (from Settings page)
      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey && !e.altKey && location.pathname === '/settings') {
        e.preventDefault();
        navigate('/dashboard');
        return;
      }

      // Cmd+Shift+L → Logout
      // Use toLowerCase() — macOS WKWebView reports e.key as 'l' (lowercase) when Cmd
      // is held, because Cmd suppresses Shift's case transformation on the key property.
      if (e.key.toLowerCase() === 'l' && e.shiftKey && e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsLogoutConfirm(true);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname, setIsLogoutConfirm, isLogoutConfirmOpen]);
}
