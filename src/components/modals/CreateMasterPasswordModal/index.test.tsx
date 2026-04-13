import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateMasterPasswordModal } from './index';

const defaultProps = {
  open: true,
  password: '',
  confirmPassword: '',
  error: '',
  isLoading: false,
  onPasswordChange: vi.fn(),
  onConfirmPasswordChange: vi.fn(),
  onCreate: vi.fn(),
};

describe('CreateMasterPasswordModal', () => {
  it('renders the title when open', () => {
    render(<CreateMasterPasswordModal {...defaultProps} />);
    expect(screen.getByText('Create Master Password')).toBeInTheDocument();
  });

  it('does not render content when open is false', () => {
    render(<CreateMasterPasswordModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Create Master Password')).not.toBeInTheDocument();
  });

  it('shows error text when error prop is set', () => {
    render(<CreateMasterPasswordModal {...defaultProps} error="Passwords do not match" />);
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('calls onCreate when Create Vault button is clicked', () => {
    const onCreate = vi.fn();
    render(<CreateMasterPasswordModal {...defaultProps} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: /Create Vault/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when isLoading is true', () => {
    render(<CreateMasterPasswordModal {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
  });
});
