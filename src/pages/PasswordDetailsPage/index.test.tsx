import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ writeText: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import PasswordDetailsPage from './index';
import { allPasswordsAtom, foldersAtom } from '@/store/atoms';
import { makePassword } from '@/testUtils';
import type { Password } from '@/types';

const mockInvoke = vi.mocked(invoke);

function renderDetailsPage(passwordId = 'p1', seedPassword?: Password) {
  const store = createStore();
  if (seedPassword) {
    store.set(allPasswordsAtom, [seedPassword]);
  }
  mockInvoke.mockResolvedValue(undefined);

  return {
    store,
    ...render(
      <MemoryRouter initialEntries={[`/password/${passwordId}`]}>
        <Provider store={store}>
          <Routes>
            <Route path="/password/:id" element={<PasswordDetailsPage />} />
          </Routes>
        </Provider>
      </MemoryRouter>
    ),
  };
}

describe('PasswordDetailsPage', () => {
  it('shows not found when password is missing', async () => {
    renderDetailsPage('nonexistent');
    await act(async () => {});
    expect(screen.getByText('Password not found')).toBeInTheDocument();
  });

  it('renders password details when password exists in store', async () => {
    const pw = makePassword();
    renderDetailsPage('p1', pw);
    await act(async () => {});
    // Multiple elements may contain the name (header title + avatar strip)
    expect(screen.getAllByText('GitHub').length).toBeGreaterThan(0);
  });

  it('renders username/email field', async () => {
    const pw = makePassword();
    renderDetailsPage('p1', pw);
    await act(async () => {});
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('renders Edit and Delete buttons', async () => {
    const pw = makePassword();
    renderDetailsPage('p1', pw);
    await act(async () => {});
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('renders User / Email and Password section labels', async () => {
    const pw = makePassword();
    renderDetailsPage('p1', pw);
    await act(async () => {});
    expect(screen.getByText('User / Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });
});
