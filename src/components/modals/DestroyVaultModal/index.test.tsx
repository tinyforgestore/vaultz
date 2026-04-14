import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DestroyVaultModal from './index';

describe('DestroyVaultModal', () => {
  afterEach(() => vi.clearAllMocks());
  it('renders the dialog title', () => {
    render(<DestroyVaultModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Destroy Vault?')).toBeInTheDocument();
  });

  it('warns about permanent data loss', () => {
    render(<DestroyVaultModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/permanently delete/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
  });

  it('calls onConfirm when Destroy Vault button is clicked', () => {
    const onConfirm = vi.fn();
    render(<DestroyVaultModal onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Destroy Vault/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<DestroyVaultModal onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });
});
