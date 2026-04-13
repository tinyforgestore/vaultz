import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportVaultModal from './index';

describe('ExportVaultModal', () => {
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
});
