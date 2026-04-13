import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PasswordGenerator from './index';

describe('PasswordGenerator', () => {
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
});
