import { atom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { LicenseStatus } from '@/types/license';

export const licenseStatusAtom = atom<LicenseStatus | null>(null);

/**
 * Holds the currently running refresh chain, per store, so concurrent callers
 * share one chain instead of racing. Private to this module — reset it through
 * `resetLicenseAtom`, never directly.
 */
const inFlightRefreshAtom = atom<Promise<void> | null>(null);

/**
 * Single code path for refreshing Pro entitlement.
 *
 * `get_license_status` first for a fast initial render, then chain
 * `validate_license` → `get_license_status` so the final status always reflects
 * any timestamp renewal / activation counts stored by the validation.
 *
 * Sequencing: the chain is memoized while in flight, and the fast initial write
 * only happens while `licenseStatusAtom` is still `null`. Without both guards a
 * slow chain's pre-validate result could land after another chain's
 * post-validate result and clobber it — showing Free with upgrade prompts on a
 * license that was just renewed.
 *
 * Errors are lenient and the returned promise never rejects, because `init.ts`
 * fires it unawaited. Crucially, no failure anywhere in the chain downgrades a
 * status we already have: a transient IPC failure is not evidence that the
 * license lapsed, and treating it as such is exactly how a paying user ends up
 * staring at upgrade prompts. So a status already on the atom survives every
 * rejection, and only a *successful* read replaces it.
 *
 * The promise is returned (not swallowed) so callers and tests can await the
 * full three-step chain.
 */
export const refreshLicenseAtom = atom(null, (get, set) => {
  const pending = get(inFlightRefreshAtom);
  if (pending) return pending;

  // A chain is "current" only while it is still the memoized one. `resetLicense`
  // (logout) drops the memo, which is what lets the guards below abandon a chain
  // whose result nobody wants any more.
  // `self` is filled in below, before any of the callbacks can run (they are all
  // asynchronous), so the guards read the real chain reference.
  const self: { chain: Promise<void> | null } = { chain: null };
  const isCurrent = () => get(inFlightRefreshAtom) === self.chain;

  const chain = invoke<LicenseStatus>('get_license_status')
    .then((status) => {
      if (isCurrent() && get(licenseStatusAtom) === null) set(licenseStatusAtom, status);
    })
    // Deliberately does NOT null the status. The write above is guarded by
    // `=== null` precisely so a stale/slow result cannot clobber a known-good
    // one; nulling here would defeat that guard from one line away and flip a
    // user who is showing Pro straight to Free on a transient failure.
    .catch(() => {})
    .then(() =>
      invoke<boolean>('validate_license')
        .catch(() => {})
        .then(() => invoke<LicenseStatus>('get_license_status'))
        .then((status) => {
          if (isCurrent()) set(licenseStatusAtom, status ?? null);
        })
        .catch(() => {})
    )
    .finally(() => {
      // Only clear our own memo — never a newer chain's.
      if (isCurrent()) set(inFlightRefreshAtom, null);
    });

  self.chain = chain;
  set(inFlightRefreshAtom, chain);
  return chain;
});

/**
 * Clears all license state on logout.
 *
 * Both atoms must be reset together. Dropping the in-flight memo is not just
 * bookkeeping: it is what marks a still-running chain as abandoned, so its
 * pending `get_license_status` result cannot repopulate `licenseStatusAtom`
 * after the vault has been locked.
 */
export const resetLicenseAtom = atom(null, (_get, set) => {
  set(licenseStatusAtom, null);
  set(inFlightRefreshAtom, null);
});
