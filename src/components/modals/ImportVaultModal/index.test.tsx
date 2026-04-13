import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImportVaultModal from './index';

describe('ImportVaultModal', () => {
  it('renders the dialog title and file name', () => {
    render(
      <ImportVaultModal
        filePath="/home/user/vault.pmvault"
        isReplacing={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Import Vault')).toBeInTheDocument();
    expect(screen.getByText('vault.pmvault')).toBeInTheDocument();
  });

  it('shows the replacing warning when isReplacing is true', () => {
    render(
      <ImportVaultModal
        filePath="/home/user/vault.pmvault"
        isReplacing={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/replace your current vault/)).toBeInTheDocument();
  });

  it('does not show replacing warning when isReplacing is false', () => {
    render(
      <ImportVaultModal
        filePath="/home/user/vault.pmvault"
        isReplacing={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByText(/replace your current vault/)).not.toBeInTheDocument();
  });

  it('shows error when passphrase is empty on submit via form submit event', async () => {
    render(
      <ImportVaultModal
        filePath="/home/user/vault.pmvault"
        isReplacing={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    fireEvent.submit(screen.getByRole('dialog').querySelector('form') as HTMLFormElement);
    expect(await screen.findByText(/required/i)).toBeInTheDocument();
  });

  it('calls onConfirm when passphrase is provided', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ImportVaultModal
        filePath="/home/user/vault.pmvault"
        isReplacing={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('Vault Passphrase *'), { target: { value: 'mypassphrase' } });
    fireEvent.click(screen.getByRole('button', { name: /^Import$/i }));
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledWith('mypassphrase'));
  });
});
