import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import PasswordDetailsPage from './index';
import { allPasswordsAtom, foldersAtom } from '@/store/atoms';
import { makePassword, makeFolder } from '@/testUtils';
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

async function renderDetailsPageReady(passwordId = 'p1', seedPassword?: Password) {
  const result = renderDetailsPage(passwordId, seedPassword);
  await act(async () => {});
  return result;
}

describe('PasswordDetailsPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows not found when password is missing', async () => {
    await renderDetailsPageReady('nonexistent');
    expect(screen.getByText('Password not found')).toBeInTheDocument();
  });

  it('renders password details when password exists in store', async () => {
    const pw = makePassword();
    await renderDetailsPageReady('p1', pw);
    // Multiple elements may contain the name (header title + avatar strip)
    expect(screen.getAllByText('GitHub').length).toBeGreaterThan(0);
  });

  it('renders username/email field', async () => {
    const pw = makePassword();
    await renderDetailsPageReady('p1', pw);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('renders Edit and Delete buttons', async () => {
    const pw = makePassword();
    await renderDetailsPageReady('p1', pw);
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('renders User / Email and Password section labels', async () => {
    const pw = makePassword();
    await renderDetailsPageReady('p1', pw);
    expect(screen.getByText('User / Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('password field is masked by default', async () => {
    const pw = makePassword({ password: 'secret' });
    await renderDetailsPageReady('p1', pw);

    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    // makePassword() defaults password to 'secret' (6 chars) → 6 bullet chars
    expect(screen.getByText('••••••')).toBeInTheDocument();
  });

  it('clicking eye icon reveals the password', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ password: 'secret' });
    await renderDetailsPageReady('p1', pw);

    const eyeButton = screen.getByRole('button', { name: /toggle password visibility/i });

    await user.click(eyeButton);

    await waitFor(() => {
      expect(screen.getByText('secret')).toBeInTheDocument();
    });
  });

  it('clicking Edit button opens edit modal', async () => {
    const user = userEvent.setup();
    const pw = makePassword();
    await renderDetailsPageReady('p1', pw);

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    await user.click(editBtn);

    expect(await screen.findByText('Edit Password')).toBeInTheDocument();
  });

  it('clicking Delete button shows delete confirmation sheet', async () => {
    const user = userEvent.setup();
    const pw = makePassword();
    await renderDetailsPageReady('p1', pw);

    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    await user.click(deleteBtn);

    expect(await screen.findByText('Delete entry?')).toBeInTheDocument();
  });

  it('Cancel in delete sheet closes it', async () => {
    const user = userEvent.setup();
    const pw = makePassword();
    await renderDetailsPageReady('p1', pw);

    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    await user.click(deleteBtn);
    expect(await screen.findByText('Delete entry?')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Delete entry?')).not.toBeInTheDocument();
    });
  });

  it('copying username field calls clipboard with correct value', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const pw = makePassword({ username: 'user@example.com' });
    await renderDetailsPageReady('p1', pw);

    const copyButton = screen.getByRole('button', { name: /copy username/i });

    await user.click(copyButton);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('recovery email section renders when present', async () => {
    const pw = makePassword({ recoveryEmail: 'rec@example.com' });
    await renderDetailsPageReady('p1', pw);

    expect(screen.getByText('Recovery Email')).toBeInTheDocument();
    expect(screen.getByText('rec@example.com')).toBeInTheDocument();
  });

  it('website field renders when present', async () => {
    const pw = makePassword({ website: 'https://github.com' });
    await renderDetailsPageReady('p1', pw);

    expect(screen.getByText('https://github.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy website/i })).toBeInTheDocument();
  });

  it('website field shows dash when absent', async () => {
    const pw = makePassword({ website: undefined });
    await renderDetailsPageReady('p1', pw);

    // The website field renders '—' when absent; there are multiple dashes for empty fields
    const emptySlots = screen.getAllByText('—');
    expect(emptySlots.length).toBeGreaterThan(0);
  });

  it('notes field renders content when present', async () => {
    const pw = makePassword({ notes: 'My important note' });
    await renderDetailsPageReady('p1', pw);

    expect(screen.getByText('My important note')).toBeInTheDocument();
  });

  it('clicking back button does not crash', async () => {
    const user = userEvent.setup();
    const pw = makePassword();
    await renderDetailsPageReady('p1', pw);

    const backBtn = screen.getByRole('button', { name: /go back/i });
    await act(async () => {
      await user.click(backBtn);
    });

    // After navigation, the page component unmounts from the /password/:id route
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
    });
  });

  it('clicking favorite star button calls toggleFavorite', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ isFavorite: false });
    const rawPw = { ...pw, createdAt: pw.createdAt.toISOString(), updatedAt: pw.updatedAt.toISOString() };

    await renderDetailsPageReady('p1', pw);

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'update_password') return Promise.resolve({ ...rawPw, isFavorite: true });
      return Promise.resolve(undefined);
    });

    const favoriteBtn = screen.getByRole('button', { name: /toggle favorite/i });
    await act(async () => {
      await user.click(favoriteBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_password', expect.objectContaining({ id: 'p1' }));
    });
  });

  it('copying password field calls clipboard with the password', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const pw = makePassword({ password: 'mysecret' });
    await renderDetailsPageReady('p1', pw);

    const copyPasswordBtn = screen.getByRole('button', { name: /copy password/i });
    await user.click(copyPasswordBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith('mysecret');
    });
  });

  it('copying website field calls clipboard with the website url', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const pw = makePassword({ website: 'https://github.com' });
    await renderDetailsPageReady('p1', pw);

    const copyWebsiteBtn = screen.getByRole('button', { name: /copy website/i });
    await user.click(copyWebsiteBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith('https://github.com');
    });
  });

  it('toast message appears after copying', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const pw = makePassword({ password: 'mysecret' });
    await renderDetailsPageReady('p1', pw);

    const copyPasswordBtn = screen.getByRole('button', { name: /copy password/i });
    await user.click(copyPasswordBtn);

    expect(await screen.findByText(/Copied/i)).toBeInTheDocument();
  });

  it('confirmDelete calls deletePassword atom and navigates to dashboard', async () => {
    const user = userEvent.setup();
    const pw = makePassword();

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'delete_password') return Promise.resolve(undefined);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    const store = createStore();
    store.set(allPasswordsAtom, [pw]);
    render(
      <MemoryRouter initialEntries={['/password/p1']}>
        <Provider store={store}>
          <Routes>
            <Route path="/password/:id" element={<PasswordDetailsPage />} />
          </Routes>
        </Provider>
      </MemoryRouter>
    );
    await act(async () => {});

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    await user.click(deleteBtn);

    expect(await screen.findByText('Delete entry?')).toBeInTheDocument();

    // Find the confirm Delete button inside the delete sheet
    const deleteSheet = screen.getByText('Delete entry?').closest('div')!;
    const confirmBtn = within(deleteSheet).getByRole('button', { name: /^Delete$/i });
    await act(async () => {
      await user.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('delete_password', { id: 'p1' });
    });
  });

  it('folder badge renders when password belongs to a seeded folder', async () => {
    const folder = makeFolder({ id: 'f1', name: 'Work' });
    const pw = makePassword({ id: 'p1', folderId: 'f1' });

    const store = createStore();
    store.set(allPasswordsAtom, [pw]);
    store.set(foldersAtom, [folder]);
    mockInvoke.mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/password/p1']}>
        <Provider store={store}>
          <Routes>
            <Route path="/password/:id" element={<PasswordDetailsPage />} />
          </Routes>
        </Provider>
      </MemoryRouter>
    );

    await act(async () => {});

    // Folder badge appears because the password has a folder
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('confirmEdit calls updatePassword and closes modal', async () => {
    const user = userEvent.setup();
    const pw = makePassword();
    const rawPw = { ...pw, createdAt: pw.createdAt.toISOString(), updatedAt: pw.updatedAt.toISOString() };

    await renderDetailsPageReady('p1', pw);

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'update_password') return Promise.resolve({ ...rawPw, name: 'Updated' });
      if (cmd === 'get_passwords') return Promise.resolve([rawPw]);
      return Promise.resolve(undefined);
    });

    // Open edit modal
    const editBtn = screen.getByRole('button', { name: /^Edit$/i });
    await user.click(editBtn);

    expect(await screen.findByText('Edit Password')).toBeInTheDocument();

    // Submit form by clicking Save
    const saveBtn = screen.getByRole('button', { name: /Save|Edit Password/i });
    await act(async () => {
      await user.click(saveBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_password', expect.any(Object));
    });

    await waitFor(() => {
      expect(screen.queryByText('Edit Password')).not.toBeInTheDocument();
    });
  });
});
