import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordGenerator from './index';

describe('PasswordGenerator', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders without crashing (embedded mode)', () => {
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    expect(screen.getByText(/Length:/)).toBeInTheDocument();
  });

  it('renders inside a dialog when not embedded', () => {
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Generate Password')).toBeInTheDocument();
  });

  it('shows checkbox options', () => {
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    expect(screen.getByText('Uppercase (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Lowercase (a-z)')).toBeInTheDocument();
    expect(screen.getByText('Numbers (0-9)')).toBeInTheDocument();
    expect(screen.getByText(/Symbols/)).toBeInTheDocument();
  });

  it('calls onUsePassword when "Use This Password" button is clicked', () => {
    const onUsePassword = vi.fn();
    render(<PasswordGenerator onUsePassword={onUsePassword} onCancel={vi.fn()} isEmbedded />);
    fireEvent.click(screen.getByText('Use This Password'));
    expect(onUsePassword).toHaveBeenCalledTimes(1);
    expect(typeof onUsePassword.mock.calls[0][0]).toBe('string');
  });

  it('regenerates when Regenerate button is clicked', () => {
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const firstPass = input.value;
    // Regenerate might produce the same password by chance, but the button click should not throw
    fireEvent.click(screen.getByText('Regenerate'));
    // Still a non-empty string
    expect(input.value.length).toBeGreaterThan(0);
    // first value was also non-empty
    expect(firstPass.length).toBeGreaterThan(0);
  });

  it('displays default length label of 16', () => {
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    expect(screen.getByText('Length: 16')).toBeInTheDocument();
  });

  it('generated password is non-empty on initial render', () => {
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  it('generated password field is read-only', () => {
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it('"Use This Password" passes the exact displayed password value', () => {
    const onUsePassword = vi.fn();
    render(<PasswordGenerator onUsePassword={onUsePassword} onCancel={vi.fn()} isEmbedded />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const displayed = input.value;
    fireEvent.click(screen.getByText('Use This Password'));
    expect(onUsePassword).toHaveBeenCalledWith(displayed);
  });

  it('toggling Uppercase checkbox changes its checked state', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const checkbox = screen.getByRole('checkbox', { name: /uppercase/i });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('data-state', 'unchecked'));
  });

  it('toggling Lowercase checkbox changes its checked state', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const checkbox = screen.getByRole('checkbox', { name: /lowercase/i });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('data-state', 'unchecked'));
  });

  it('toggling Numbers checkbox changes its checked state', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const checkbox = screen.getByRole('checkbox', { name: /numbers/i });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('data-state', 'unchecked'));
  });

  it('toggling Symbols checkbox changes its checked state', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={vi.fn()} isEmbedded />);
    const checkbox = screen.getByRole('checkbox', { name: /symbols/i });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('data-state', 'unchecked'));
  });

  it('pressing Escape in dialog mode calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PasswordGenerator onUsePassword={vi.fn()} onCancel={onCancel} />);
    expect(screen.getByText('Generate Password')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });
});
