import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn().mockResolvedValue(null) }));
vi.mock('@/services/sessionService', () => ({
  sessionService: { login: vi.fn().mockResolvedValue(false) },
}));

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { sessionService } from '@/services/sessionService';
import LoginPage from './index';

const mockInvoke = vi.mocked(invoke);

function renderLoginPage(databaseExists = true) {
  const store = createStore();
  mockInvoke.mockImplementation((cmd: unknown) => {
    if (cmd === 'database_exists') return Promise.resolve(databaseExists);
    return Promise.resolve(undefined);
  });
  return {
    store,
    ...render(
      <MemoryRouter>
        <Provider store={store}>
          <LoginPage />
        </Provider>
      </MemoryRouter>
    ),
  };
}

describe('LoginPage', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows checking state initially', () => {
    renderLoginPage();
    expect(screen.getByText('Checking database...')).toBeInTheDocument();
  });

  it('shows unlock form when database exists', async () => {
    renderLoginPage(true);
    await act(async () => {});
    expect(screen.getByText('Enter your master password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Master password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlock Vault/i })).toBeInTheDocument();
  });

  it('shows welcome screen when no database exists', async () => {
    renderLoginPage(false);
    await act(async () => {});
    expect(screen.getByText('Welcome to Vaultz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Vault/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import Existing Vault/i })).toBeInTheDocument();
  });

  it('unlock button is disabled when password field is empty', async () => {
    renderLoginPage(true);
    await act(async () => {});
    const btn = screen.getByRole('button', { name: /Unlock Vault/i });
    expect(btn).toBeDisabled();
  });

  it('shows an error and stays on login page when unlock fails with wrong password', async () => {
    vi.mocked(sessionService.login).mockResolvedValue(false);
    renderLoginPage(true);
    await act(async () => {});
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText('Master password');
    await user.type(input, 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /Unlock Vault/i }));
    await act(async () => {});
    expect(screen.getByText('Invalid master password')).toBeInTheDocument();
    expect(screen.getByText('Enter your master password')).toBeInTheDocument();
  });

  it('eye toggle switches password input between text and password types', async () => {
    const user = userEvent.setup();
    renderLoginPage(true);
    await act(async () => {});

    const input = screen.getByPlaceholderText('Master password');
    expect(input).toHaveAttribute('type', 'password');

    const eyeToggle = screen.getByRole('button', { name: /toggle password visibility/i });
    await user.click(eyeToggle);
    expect(input).toHaveAttribute('type', 'text');

    await user.click(eyeToggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('unlock button becomes enabled when password is typed', async () => {
    const user = userEvent.setup();
    renderLoginPage(true);
    await act(async () => {});

    const button = screen.getByRole('button', { name: /Unlock Vault/i });
    expect(button).toBeDisabled();

    const input = screen.getByPlaceholderText('Master password');
    await user.type(input, 'mysecret');

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('clicking Create Vault button opens the create master password modal', async () => {
    const user = userEvent.setup();
    renderLoginPage(false);
    await act(async () => {});

    const createVaultBtn = screen.getByRole('button', { name: /Create Vault/i });
    await user.click(createVaultBtn);

    expect(await screen.findByText('Create Master Password')).toBeInTheDocument();
  });

  it('Restore from backup button triggers file dialog', async () => {
    const user = userEvent.setup();
    renderLoginPage(true);
    await act(async () => {});

    const restoreBtn = screen.getByRole('button', { name: /Restore from backup/i });
    await user.click(restoreBtn);

    await waitFor(() => {
      expect(vi.mocked(open)).toHaveBeenCalled();
    });
  });
});
