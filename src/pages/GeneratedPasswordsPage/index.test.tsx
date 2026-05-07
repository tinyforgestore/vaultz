import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';

const hookState = {
  history: [] as Array<{ id: number; password: string; createdAt: string }>,
  hiddenIds: new Set<number>(),
  confirmClear: false,
  selectedIndex: -1,
  setSelectedIndex: vi.fn(),
  copiedId: null as string | null,
  clipboardToast: null as string | null,
  handleCopy: vi.fn(),
  handleDelete: vi.fn(),
  handleRequestClearAll: vi.fn(),
  handleCancelClearAll: vi.fn(),
  handleConfirmClearAll: vi.fn(),
  handleCreateEntry: vi.fn(),
  handleBack: vi.fn(),
  handleReveal: vi.fn(),
  handleHide: vi.fn(),
};

vi.mock('@/hooks/useGeneratedPasswordsPage', () => ({
  useGeneratedPasswordsPage: () => hookState,
}));

import GeneratedPasswordsPage from './index';

function renderPage() {
  return render(
    <Theme>
      <MemoryRouter>
        <GeneratedPasswordsPage />
      </MemoryRouter>
    </Theme>,
  );
}

describe('GeneratedPasswordsPage', () => {
  beforeEach(() => {
    hookState.history = [];
    hookState.hiddenIds = new Set();
    hookState.confirmClear = false;
    hookState.selectedIndex = -1;
    hookState.copiedId = null;
    hookState.clipboardToast = null;
    Object.values(hookState)
      .filter((v): v is ReturnType<typeof vi.fn> => typeof v === 'function')
      .forEach((fn) => fn.mockReset());
  });

  it('renders empty state when there is no history', () => {
    renderPage();
    expect(screen.getByText(/No generated passwords yet/i)).toBeInTheDocument();
  });

  it('renders rows revealed by default and hides on EyeOff click', () => {
    hookState.history = [{ id: 1, password: 'topsecret', createdAt: '2026-04-28 12:00:00' }];
    renderPage();
    expect(screen.getByTestId('password-1').textContent).toBe('topsecret');
    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(hookState.handleHide).toHaveBeenCalledWith(1);
  });

  it('masks the password when id is in hiddenIds', () => {
    hookState.history = [{ id: 1, password: 'topsecret', createdAt: '2026-04-28 12:00:00' }];
    hookState.hiddenIds = new Set([1]);
    renderPage();
    expect(screen.getByTestId('password-1').textContent).not.toContain('topsecret');
    fireEvent.click(screen.getByLabelText('Reveal password'));
    expect(hookState.handleReveal).toHaveBeenCalledWith(1);
  });

  it('Copy button calls handleCopy with the row item', () => {
    hookState.history = [{ id: 5, password: 'p', createdAt: '2026-04-28 12:00:00' }];
    renderPage();
    fireEvent.click(screen.getByLabelText('Copy password'));
    expect(hookState.handleCopy).toHaveBeenCalledWith(hookState.history[0]);
  });

  it('Create-entry button calls handleCreateEntry with the password', () => {
    hookState.history = [{ id: 5, password: 'pp', createdAt: '2026-04-28 12:00:00' }];
    renderPage();
    fireEvent.click(screen.getByLabelText('Create entry'));
    expect(hookState.handleCreateEntry).toHaveBeenCalledWith('pp');
  });

  it('Delete button calls handleDelete with id', () => {
    hookState.history = [{ id: 9, password: 'p', createdAt: '2026-04-28 12:00:00' }];
    renderPage();
    fireEvent.click(screen.getByLabelText('Delete'));
    expect(hookState.handleDelete).toHaveBeenCalledWith(9);
  });

  it('Back button calls handleBack', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Back'));
    expect(hookState.handleBack).toHaveBeenCalled();
  });

  it('Clear All button is disabled when history is empty', () => {
    renderPage();
    const btn = screen.getByRole('button', { name: /Clear All/i });
    expect(btn).toBeDisabled();
  });

  it('Clear All flow: request → confirm shows Cancel/Confirm pair', () => {
    hookState.history = [{ id: 1, password: 'p', createdAt: '2026-04-28 12:00:00' }];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));
    expect(hookState.handleRequestClearAll).toHaveBeenCalled();
  });

  it('Confirm-clear stage shows confirm and cancel buttons that call handlers', () => {
    hookState.history = [{ id: 1, password: 'p', createdAt: '2026-04-28 12:00:00' }];
    hookState.confirmClear = true;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(hookState.handleCancelClearAll).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Confirm Clear/i }));
    expect(hookState.handleConfirmClearAll).toHaveBeenCalled();
  });
});
