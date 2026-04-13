import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GeneratePasswordModal from './index';

describe('GeneratePasswordModal', () => {
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
});
