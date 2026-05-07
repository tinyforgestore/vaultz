import { useNavigate } from 'react-router-dom';
import { EVENTS } from '@/constants/events';
import { useTauriEvent } from './useTauriEvent';

/**
 * Listens for `open-create-entry-prefilled` events emitted by the overlay
 * window's "+ New entry" button. On receipt, navigates to the dashboard with
 * a `prefilledPassword` location-state slot the dashboard reads to open the
 * CreatePasswordModal pre-populated.
 *
 * Registered once at the SessionWrapper level so the listener exists across
 * route changes for the lifetime of the authenticated session.
 */
export function useOpenCreateEntryPrefilled() {
  const navigate = useNavigate();
  useTauriEvent<string>(EVENTS.OPEN_CREATE_ENTRY_PREFILLED, (password) => {
    navigate('/dashboard', { state: { prefilledPassword: password } });
  });
}
