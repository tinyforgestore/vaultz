import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockHook = vi.fn();
vi.mock('@/hooks/useOverlayGenerator', () => ({
  useOverlayGenerator: () => mockHook(),
}));

// Stub PasswordGenerator to keep this test focused on overlay branches.
vi.mock('@/components/PasswordGenerator', () => ({
  default: ({ onUsePassword, onCancel }: { onUsePassword: (p: string) => void; onCancel: () => void }) => (
    <div data-testid="password-generator">
      <button onClick={() => onUsePassword('generated-pass')}>UsePass</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import OverlayGenerator from './index';

const baseHookValue = {
  isLocked: false,
  hideOverlay: vi.fn(),
  copyToClipboard: vi.fn(),
  saveAsEntry: vi.fn(),
};

describe('OverlayGenerator', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('renders locked panel when vault is locked', () => {
    mockHook.mockReturnValue({ ...baseHookValue, isLocked: true });
    render(<OverlayGenerator />);
    expect(screen.getByText(/Vault locked/)).toBeInTheDocument();
  });

  it('renders generator when unlocked', () => {
    mockHook.mockReturnValue(baseHookValue);
    render(<OverlayGenerator />);
    expect(screen.getByTestId('password-generator')).toBeInTheDocument();
    expect(screen.getByText(/Generate Password/)).toBeInTheDocument();
  });

  it('the New entry button is disabled (PM-024 stub)', () => {
    mockHook.mockReturnValue(baseHookValue);
    render(<OverlayGenerator />);
    const btn = screen.getByText(/New entry/).closest('button');
    expect(btn).toBeDisabled();
  });

  it('UsePass triggers copyToClipboard', () => {
    const copy = vi.fn();
    mockHook.mockReturnValue({ ...baseHookValue, copyToClipboard: copy });
    render(<OverlayGenerator />);
    screen.getByText('UsePass').click();
    expect(copy).toHaveBeenCalledWith('generated-pass');
  });

  it('Cancel triggers hideOverlay', () => {
    const hide = vi.fn();
    mockHook.mockReturnValue({ ...baseHookValue, hideOverlay: hide });
    render(<OverlayGenerator />);
    screen.getByText('Cancel').click();
    expect(hide).toHaveBeenCalled();
  });
});
