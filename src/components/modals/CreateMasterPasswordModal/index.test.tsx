import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  afterEach(() => vi.clearAllMocks());

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

  it('renders the description text', () => {
    render(<CreateMasterPasswordModal {...defaultProps} />);
    expect(screen.getByText(/This password cannot be recovered if lost/)).toBeInTheDocument();
  });

  it('password input displays the password prop value', () => {
    render(<CreateMasterPasswordModal {...defaultProps} password="mypassword" />);
    expect(screen.getByPlaceholderText('Enter master password')).toHaveValue('mypassword');
  });

  it('confirm input displays the confirmPassword prop value', () => {
    render(<CreateMasterPasswordModal {...defaultProps} confirmPassword="mypassword" />);
    expect(screen.getByPlaceholderText('Confirm master password')).toHaveValue('mypassword');
  });

  it('both fields are type="password" by default', () => {
    render(<CreateMasterPasswordModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter master password')).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText('Confirm master password')).toHaveAttribute('type', 'password');
  });

  it('clicking the eye icon switches both inputs to type="text"', async () => {
    const user = userEvent.setup();
    render(<CreateMasterPasswordModal {...defaultProps} />);
    const [eyeBtn] = screen.getAllByRole('button', { name: '' });
    await user.click(eyeBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter master password')).toHaveAttribute('type', 'text');
      expect(screen.getByPlaceholderText('Confirm master password')).toHaveAttribute('type', 'text');
    });
  });

  it('clicking the eye icon a second time reverts to type="password"', async () => {
    const user = userEvent.setup();
    render(<CreateMasterPasswordModal {...defaultProps} />);
    const [eyeBtn] = screen.getAllByRole('button', { name: '' });
    await user.click(eyeBtn);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Enter master password')).toHaveAttribute('type', 'text')
    );
    await user.click(eyeBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter master password')).toHaveAttribute('type', 'password');
      expect(screen.getByPlaceholderText('Confirm master password')).toHaveAttribute('type', 'password');
    });
  });

  it('calls onPasswordChange with the typed value', () => {
    const onPasswordChange = vi.fn();
    render(<CreateMasterPasswordModal {...defaultProps} onPasswordChange={onPasswordChange} />);
    fireEvent.change(screen.getByPlaceholderText('Enter master password'), {
      target: { value: 'NewPass!' },
    });
    expect(onPasswordChange).toHaveBeenCalledWith('NewPass!');
  });

  it('calls onConfirmPasswordChange with the typed value', () => {
    const onConfirmPasswordChange = vi.fn();
    render(<CreateMasterPasswordModal {...defaultProps} onConfirmPasswordChange={onConfirmPasswordChange} />);
    fireEvent.change(screen.getByPlaceholderText('Confirm master password'), {
      target: { value: 'NewPass!' },
    });
    expect(onConfirmPasswordChange).toHaveBeenCalledWith('NewPass!');
  });

  it('Cancel button is also disabled when isLoading', () => {
    render(<CreateMasterPasswordModal {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
  });

  it('clicking the eye icon in the confirm field also toggles visibility', async () => {
    const user = userEvent.setup();
    render(<CreateMasterPasswordModal {...defaultProps} />);
    const eyeButtons = screen.getAllByRole('button', { name: '' });
    const confirmEyeBtn = eyeButtons[1];
    await user.click(confirmEyeBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter master password')).toHaveAttribute('type', 'text');
      expect(screen.getByPlaceholderText('Confirm master password')).toHaveAttribute('type', 'text');
    });
  });
});
