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
  recordGenerated: vi.fn(),
  handleGeneratedChange: vi.fn(),
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

  it('the New entry button is enabled and calls saveAsEntry on click', () => {
    const save = vi.fn();
    mockHook.mockReturnValue({ ...baseHookValue, saveAsEntry: save });
    render(<OverlayGenerator />);
    const btn = screen.getByText(/New entry/).closest('button')!;
    expect(btn).not.toBeDisabled();
    btn.click();
    expect(save).toHaveBeenCalled();
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

// ---------------------------------------------------------------------------
// Integration: real hook + real PasswordGenerator. Verifies that pressing
// "Use This Password" or Enter inserts the password into history exactly
// ONCE (no duplicate from an extra recordGenerated call inside copyToClipboard).
// ---------------------------------------------------------------------------

describe('OverlayGenerator (integration)', () => {
  // Re-mock with fresh modules so the hook is real this time.
  beforeEach(() => {
    vi.resetModules();
  });

  const setupRealWiring = async () => {
    vi.doUnmock('@/hooks/useOverlayGenerator');
    vi.doUnmock('@/components/PasswordGenerator');

    // is_authenticated → true so the generator is rendered (not the locked panel).
    const invokeMock = vi.fn().mockImplementation((cmd: string) => {
      if (cmd === 'is_authenticated') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });
    vi.doMock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));
    vi.doMock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(() => {}) }));
    vi.doMock('@tauri-apps/api/window', () => ({
      getCurrentWindow: () => ({
        hide: vi.fn().mockResolvedValue(undefined),
        listen: vi.fn().mockResolvedValue(() => {}),
      }),
    }));
    return invokeMock;
  };

  it('clicking "Use This Password" calls record_generated_password exactly once', async () => {
    const invokeMock = await setupRealWiring();
    const Real = (await import('./index')).default;
    const { render: r2, screen: s2, fireEvent, waitFor } = await import('@testing-library/react');

    r2(<Real />);
    await waitFor(() => expect(s2.getByText('Use This Password')).toBeInTheDocument());

    fireEvent.click(s2.getByText('Use This Password'));

    const recordCalls = invokeMock.mock.calls.filter(
      (c: unknown[]) => c[0] === 'record_generated_password',
    );
    expect(recordCalls).toHaveLength(1);
  });

  it('pressing Enter calls record_generated_password exactly once', async () => {
    const invokeMock = await setupRealWiring();
    const Real = (await import('./index')).default;
    const { render: r2, screen: s2, waitFor } = await import('@testing-library/react');

    r2(<Real />);
    await waitFor(() => expect(s2.getByText('Use This Password')).toBeInTheDocument());

    // Generator's keydown listener fires Enter → handleUsePassword (single record).
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    await waitFor(() => {
      const recordCalls = invokeMock.mock.calls.filter(
        (c: unknown[]) => c[0] === 'record_generated_password',
      );
      expect(recordCalls).toHaveLength(1);
    });
  });
});
