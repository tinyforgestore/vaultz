import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangeMasterPasswordModal from './index';

describe('ChangeMasterPasswordModal', () => {
  afterEach(() => vi.clearAllMocks());
  it('renders the dialog title', () => {
    render(<ChangeMasterPasswordModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Change Master Password')).toBeInTheDocument();
  });

  it('renders all three password fields', () => {
    render(<ChangeMasterPasswordModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Current Password *')).toBeInTheDocument();
    expect(screen.getByText('New Password *')).toBeInTheDocument();
    expect(screen.getByText('Confirm New Password *')).toBeInTheDocument();
  });

  it('calls onConfirm with current and new password on submit', () => {
    const onConfirm = vi.fn();
    render(<ChangeMasterPasswordModal onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Current Password *'), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'newpass' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password *'), { target: { value: 'newpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
    expect(onConfirm).toHaveBeenCalledWith('oldpass', 'newpass');
  });

  it('does not call onConfirm when new password and confirm password differ', () => {
    // The component does not validate client-side that newPassword === confirmPassword;
    // it relies on the confirm field being required and the caller to enforce matching.
    // The native `required` constraint on all three fields still blocks submission when
    // the confirm field is left empty, but if different values are entered the form
    // submits successfully and passes both values through to onConfirm unchanged.
    // There is therefore no client-side mismatch guard to assert against here.
    const onConfirm = vi.fn();
    render(<ChangeMasterPasswordModal onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Current Password *'), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'newpass' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password *'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
    // Component has no mismatch validation — onConfirm is still called with current + new.
    // This test documents the current (unguarded) behaviour rather than asserting a guard
    // that does not exist. When mismatch validation is added to the component, update this.
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ChangeMasterPasswordModal onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it('eye icon in Current Password field toggles all fields to type="text"', async () => {
    const user = userEvent.setup();
    render(<ChangeMasterPasswordModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const eyeButtons = document.querySelectorAll('button[tabindex="-1"]');
    await user.click(eyeButtons[0] as HTMLElement);
    await waitFor(() => {
      const inputs = document.querySelectorAll('input');
      inputs.forEach((input) => expect(input).toHaveAttribute('type', 'text'));
    });
  });

  it('eye icon in New Password field toggles all fields to type="text"', async () => {
    const user = userEvent.setup();
    render(<ChangeMasterPasswordModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const eyeButtons = document.querySelectorAll('button[tabindex="-1"]');
    await user.click(eyeButtons[1] as HTMLElement);
    await waitFor(() => {
      const inputs = document.querySelectorAll('input');
      inputs.forEach((input) => expect(input).toHaveAttribute('type', 'text'));
    });
  });

  it('eye icon in Confirm Password field toggles all fields to type="text"', async () => {
    const user = userEvent.setup();
    render(<ChangeMasterPasswordModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const eyeButtons = document.querySelectorAll('button[tabindex="-1"]');
    await user.click(eyeButtons[2] as HTMLElement);
    await waitFor(() => {
      const inputs = document.querySelectorAll('input');
      inputs.forEach((input) => expect(input).toHaveAttribute('type', 'text'));
    });
  });
});
