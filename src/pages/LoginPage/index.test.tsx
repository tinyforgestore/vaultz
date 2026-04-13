import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@/services/sessionService', () => ({
  sessionService: { login: vi.fn().mockResolvedValue(false) },
}));

import { invoke } from '@tauri-apps/api/core';
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
    const input = screen.getByPlaceholderText('Master password');
    fireEvent.change(input, { target: { value: 'wrongpassword' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });
    expect(screen.getByText('Invalid master password')).toBeInTheDocument();
    expect(screen.getByText('Enter your master password')).toBeInTheDocument();
  });
});
