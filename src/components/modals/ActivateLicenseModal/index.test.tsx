import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import ActivateLicenseModal from './index';

const mockInvoke = vi.mocked(invoke);

function renderModal(props: Partial<React.ComponentProps<typeof ActivateLicenseModal>> = {}) {
  const store = createStore();
  const defaults = {
    onSuccess: vi.fn(),
    onClose: vi.fn(),
    onBuyInstead: vi.fn(),
  };
  return {
    store,
    ...render(
      <Provider store={store}>
        <ActivateLicenseModal {...defaults} {...props} />
      </Provider>
    ),
    ...defaults,
    ...props,
  };
}

describe('ActivateLicenseModal', () => {
  it('renders the heading and input', () => {
    renderModal();
    expect(screen.getByText('Activate Pro License')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your license key here')).toBeInTheDocument();
  });

  it('Activate button is disabled when input is empty', () => {
    renderModal();
    const btn = screen.getByRole('button', { name: /activate/i });
    expect(btn).toBeDisabled();
  });

  it('Activate button is enabled when key is typed', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Paste your license key here'), {
      target: { value: 'ABCD-1234-EFGH-5678' },
    });
    const btn = screen.getByRole('button', { name: /activate/i });
    expect(btn).not.toBeDisabled();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onBuyInstead when buy link is clicked', () => {
    const onBuyInstead = vi.fn();
    renderModal({ onBuyInstead });
    fireEvent.click(screen.getByText(/Don't have a license yet/));
    expect(onBuyInstead).toHaveBeenCalledTimes(1);
  });

  it('shows error text when invoke rejects', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Invalid key'));
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Paste your license key here'), {
      target: { value: 'BAD-KEY' },
    });
    fireEvent.click(screen.getByRole('button', { name: /activate/i }));
    // Wait for async rejection
    await screen.findByText('Invalid key');
  });
});
