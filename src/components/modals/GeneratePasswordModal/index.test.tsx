import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GeneratePasswordModal from './index';

describe('GeneratePasswordModal', () => {
  afterEach(() => vi.clearAllMocks());
  it('renders in dialog mode with title', () => {
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Generate Password')).toBeInTheDocument();
  });

  it('renders in embedded mode without dialog title', () => {
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    expect(screen.queryByText('Generate Password')).not.toBeInTheDocument();
  });

  it('renders checkbox options', () => {
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    expect(screen.getByText('Uppercase (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Lowercase (a-z)')).toBeInTheDocument();
    expect(screen.getByText('Numbers (0-9)')).toBeInTheDocument();
    expect(screen.getByText(/Symbols/)).toBeInTheDocument();
  });

  it('calls onUsePassword when Use This Password is clicked', () => {
    const onUsePassword = vi.fn();
    render(<GeneratePasswordModal onUsePassword={onUsePassword} onCancel={vi.fn()} isEmbedded />);
    fireEvent.click(screen.getByText('Use This Password'));
    expect(onUsePassword).toHaveBeenCalledTimes(1);
    expect(typeof onUsePassword.mock.calls[0][0]).toBe('string');
  });

  it('renders a generated password in the readonly field', () => {
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  it('toggling Uppercase checkbox changes its checked state', async () => {
    const user = userEvent.setup();
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const checkbox = screen.getByRole('checkbox', { name: /uppercase/i });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('data-state', 'unchecked'));
  });

  it('toggling Lowercase checkbox changes its checked state', async () => {
    const user = userEvent.setup();
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const checkbox = screen.getByRole('checkbox', { name: /lowercase/i });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('data-state', 'unchecked'));
  });

  it('toggling Numbers checkbox changes its checked state', async () => {
    const user = userEvent.setup();
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const checkbox = screen.getByRole('checkbox', { name: /numbers/i });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('data-state', 'unchecked'));
  });

  it('toggling Symbols checkbox changes its checked state', async () => {
    const user = userEvent.setup();
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const checkbox = screen.getByRole('checkbox', { name: /symbols/i });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('data-state', 'unchecked'));
  });

  it('calls onCancel when Escape is pressed in dialog mode', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<GeneratePasswordModal onUsePassword={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });
});
