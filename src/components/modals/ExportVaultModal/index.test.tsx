import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportVaultModal from './index';

describe('ExportVaultModal', () => {
  afterEach(() => vi.clearAllMocks());
  it('renders the dialog title', () => {
    render(<ExportVaultModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Export Vault')).toBeInTheDocument();
  });

  it('renders passphrase fields', () => {
    render(<ExportVaultModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Export Passphrase *')).toBeInTheDocument();
    expect(screen.getByText('Confirm Passphrase *')).toBeInTheDocument();
  });

  it('shows error when passphrases do not match', async () => {
    render(<ExportVaultModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Export Passphrase *'), { target: { value: 'passphrase1' } });
    fireEvent.change(screen.getByLabelText('Confirm Passphrase *'), { target: { value: 'passphrase2' } });
    fireEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('shows error when passphrase is too short', async () => {
    render(<ExportVaultModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Export Passphrase *'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm Passphrase *'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('calls onConfirm with passphrase when valid', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ExportVaultModal onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Export Passphrase *'), { target: { value: 'strongpassword' } });
    fireEvent.change(screen.getByLabelText('Confirm Passphrase *'), { target: { value: 'strongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledWith('strongpassword'));
  });

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ExportVaultModal onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it('eye icon on Export Passphrase field toggles both fields to type="text"', async () => {
    const user = userEvent.setup();
    render(<ExportVaultModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const eyeButtons = document.querySelectorAll('button[tabindex="-1"]');
    await user.click(eyeButtons[0] as HTMLElement);
    await waitFor(() => {
      document.querySelectorAll('input[type="text"]').forEach((input) =>
        expect(input).toHaveAttribute('type', 'text')
      );
    });
  });

  it('eye icon on Confirm Passphrase field toggles both fields to type="text"', async () => {
    const user = userEvent.setup();
    render(<ExportVaultModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const eyeButtons = document.querySelectorAll('button[tabindex="-1"]');
    await user.click(eyeButtons[1] as HTMLElement);
    await waitFor(() => {
      document.querySelectorAll('input[type="text"]').forEach((input) =>
        expect(input).toHaveAttribute('type', 'text')
      );
    });
  });

  it('shows error message when onConfirm rejects with an Error', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Disk full'));
    render(<ExportVaultModal onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Export Passphrase *'), { target: { value: 'validpassword' } });
    fireEvent.change(screen.getByLabelText('Confirm Passphrase *'), { target: { value: 'validpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(await screen.findByText('Disk full')).toBeInTheDocument();
  });

  it('shows "Export failed" when onConfirm rejects with a non-Error value', async () => {
    const onConfirm = vi.fn().mockRejectedValue(42);
    render(<ExportVaultModal onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Export Passphrase *'), { target: { value: 'validpassword' } });
    fireEvent.change(screen.getByLabelText('Confirm Passphrase *'), { target: { value: 'validpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(await screen.findByText('Export failed')).toBeInTheDocument();
  });

  it('shows string error directly when onConfirm rejects with a string', async () => {
    const onConfirm = vi.fn().mockRejectedValue('Permission denied');
    render(<ExportVaultModal onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Export Passphrase *'), { target: { value: 'validpassword' } });
    fireEvent.change(screen.getByLabelText('Confirm Passphrase *'), { target: { value: 'validpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(await screen.findByText('Permission denied')).toBeInTheDocument();
  });
});
