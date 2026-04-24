import { createContext, useContext, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { isAuthenticatedAtom, isLogoutConfirmAtom } from '@/atoms/session';

interface SessionStore {
  isAuthenticated: boolean;
  isLogoutConfirm: boolean;
}

export const SessionStoreContext = createContext<SessionStore | null>(null);
export type { SessionStore };

export function SessionStoreProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isLogoutConfirm = useAtomValue(isLogoutConfirmAtom);
  const value = useMemo(
    () => ({ isAuthenticated, isLogoutConfirm }),
    [isAuthenticated, isLogoutConfirm]
  );
  return <SessionStoreContext.Provider value={value}>{children}</SessionStoreContext.Provider>;
}

export function useSessionStore(): SessionStore {
  const ctx = useContext(SessionStoreContext);
  if (!ctx) throw new Error('useSessionStore must be used within SessionStoreProvider');
  return ctx;
}
