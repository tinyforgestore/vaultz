import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/plugin-deep-link', () => ({
  getCurrent: vi.fn().mockResolvedValue(null),
  onOpenUrl: vi.fn().mockResolvedValue(vi.fn()),
}));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import GlobalModals from './index';
import { activeModalAtom, licenseStatusAtom, pendingLicenseKeyAtom } from '@/store/atoms';
import type { ActiveModal } from '@/store/atoms';

const mockInvoke = vi.mocked(invoke);

function renderGlobalModals(activeModal: ActiveModal = null, pendingKey: string | null = null) {
  const store = createStore();
  store.set(activeModalAtom, activeModal);
  if (pendingKey !== null) store.set(pendingLicenseKeyAtom, pendingKey);
  mockInvoke.mockResolvedValue(undefined);
  return {
    store,
    ...render(
      <Provider store={store}>
        <GlobalModals />
      </Provider>
    ),
  };
}

describe('GlobalModals', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders nothing when activeModal is null', () => {
    const { container } = renderGlobalModals();
    expect(container.firstChild).toBeNull();
  });

  it('shows UpgradeToProModal when activeModal is "upgrade"', () => {
    renderGlobalModals('upgrade');
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });

  it('shows ActivateLicenseModal when activeModal is "activate"', () => {
    renderGlobalModals('activate');
    expect(screen.getByText('Activate Pro License')).toBeInTheDocument();
  });

  it('shows ProWelcomeModal when activeModal is "proWelcome"', () => {
    renderGlobalModals('proWelcome');
    expect(screen.getByText('Welcome to Pro!')).toBeInTheDocument();
  });

  it('UpgradeToProModal onClose sets activeModal to null and clears pendingLicenseKey', () => {
    const { store } = renderGlobalModals('upgrade', 'SOME-KEY');
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(store.get(activeModalAtom)).toBeNull();
    expect(store.get(pendingLicenseKeyAtom)).toBeNull();
  });

  it('UpgradeToProModal onActivate transitions to "activate"', () => {
    const { store } = renderGlobalModals('upgrade');
    fireEvent.click(screen.getByText(/Already have a license key/));
    expect(store.get(activeModalAtom)).toBe('activate');
  });

  it('ActivateLicenseModal onClose sets activeModal to null', () => {
    const { store } = renderGlobalModals('activate');
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(store.get(activeModalAtom)).toBeNull();
  });

  it('ActivateLicenseModal onBuyInstead transitions to "upgrade"', () => {
    const { store } = renderGlobalModals('activate');
    fireEvent.click(screen.getByText(/Don't have a license yet/));
    expect(store.get(activeModalAtom)).toBe('upgrade');
  });

  it('ActivateLicenseModal onSuccess transitions to "proWelcome" and sets licenseStatus', async () => {
    const { store } = renderGlobalModals('activate');
    fireEvent.change(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX'), {
      target: { value: 'ABCD-1234-EFGH-5678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Activate$/i }));
    await screen.findByText('Welcome to Pro!');
    expect(store.get(activeModalAtom)).toBe('proWelcome');
    expect(store.get(licenseStatusAtom)).toEqual({ is_active: true });
  });

  it('ProWelcomeModal "Got it" button sets activeModal to null', () => {
    const { store } = renderGlobalModals('proWelcome');
    fireEvent.click(screen.getByRole('button', { name: /Got it/i }));
    expect(store.get(activeModalAtom)).toBeNull();
  });

  it('ProWelcomeModal overlay click sets activeModal to null', () => {
    const { store } = renderGlobalModals('proWelcome');
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(store.get(activeModalAtom)).toBeNull();
  });

  it('pendingLicenseKey is forwarded to ActivateLicenseModal as initialKey', () => {
    renderGlobalModals('activate', 'MY-LICENSE-KEY');
    expect(screen.getByDisplayValue('MY-LICENSE-KEY')).toBeInTheDocument();
  });

  it('autoSubmit fires activation and transitions to proWelcome when pendingKey is set', async () => {
    const { store } = renderGlobalModals('activate', 'PENDING-KEY');
    await screen.findByText('Welcome to Pro!');
    expect(store.get(activeModalAtom)).toBe('proWelcome');
    expect(store.get(pendingLicenseKeyAtom)).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith('activate_license', { key: 'PENDING-KEY' });
  });

  it('Activate button is disabled when no pendingKey and input is empty', async () => {
    renderGlobalModals('activate');
    expect(await screen.findByRole('button', { name: /^Activate$/i })).toBeDisabled();
  });

  it('ActivateLicenseModal shows error when activation fails', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Invalid license key'));
    renderGlobalModals('activate');
    fireEvent.change(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX'), {
      target: { value: 'BAD-KEY-1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Activate$/i }));
    expect(await screen.findByText('Invalid license key')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Activate$/i })).not.toBeDisabled();
  });
});
