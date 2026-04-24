import { PasswordsStoreProvider } from './passwords';
import { FoldersStoreProvider } from './folders';
import { SessionStoreProvider } from './session';
import { LicenseStoreProvider } from './license';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Nesting order is arbitrary — jotai atoms share a global store regardless of React context depth
  return (
    <SessionStoreProvider>
      <LicenseStoreProvider>
        <PasswordsStoreProvider>
          <FoldersStoreProvider>
            {children}
          </FoldersStoreProvider>
        </PasswordsStoreProvider>
      </LicenseStoreProvider>
    </SessionStoreProvider>
  );
}

export { usePasswordsStore, PasswordsStoreContext } from './passwords';
export type { PasswordsStore } from './passwords';
export { useFoldersStore, FoldersStoreContext } from './folders';
export type { FoldersStore } from './folders';
export { useSessionStore, SessionStoreContext } from './session';
export type { SessionStore } from './session';
export { useLicenseStore, LicenseStoreContext } from './license';
export type { LicenseStore } from './license';
