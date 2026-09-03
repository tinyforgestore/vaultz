import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { isAuthenticatedAtom, refreshLicenseAtom } from '@/store/atoms';

/**
 * Revalidates the Pro license whenever the window regains focus.
 *
 * Without this, `validate_license` only ever runs at unlock and on the Settings
 * mount. Auto-lock can be disabled (`get_lock_timeout` may return `null`), so an
 * app left running past the 30-day offline grace window lapses mid-session: the
 * UI drops to Free and vault writes start hitting the Free limits, with no user
 * action that would recover it.
 *
 * Focus rather than a timer: it costs nothing while the app sits idle in the
 * background, and any user who is about to interact with the app has just
 * focused it. The cadence gate inside `validate_license` (24h) means a burst of
 * focus events still results in at most one network call per day, and
 * `refreshLicenseAtom` memoizes its in-flight chain, so a focus event racing the
 * unlock refresh joins that chain instead of starting a second one.
 *
 * Gated on `isAuthenticatedAtom` because the backend commands only take
 * `DbState` and therefore succeed while the vault is still locked: without the
 * gate, focusing the login window would ship the license key (and, on a legacy
 * row, the hostname plus an activation seat) to Lemon Squeezy pre-authentication,
 * and a focus after logout would write `licenseStatusAtom` straight back so the
 * UI reads Pro over a locked vault.
 *
 * Mount this exactly once, at the app level — mounting it per page would attach
 * one listener per mounted page and multiply the calls.
 */
export function useLicenseRefreshOnFocus(): void {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const refreshLicense = useSetAtom(refreshLicenseAtom);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () => {
      refreshLicense();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, refreshLicense]);
}
