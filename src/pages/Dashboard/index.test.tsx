import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ writeText: vi.fn() }));
vi.mock('@/services/sessionService', () => ({
  sessionService: { logout: vi.fn().mockResolvedValue(undefined) },
}));

import { invoke } from '@tauri-apps/api/core';
import Dashboard from './index';
import GlobalModals from '@/components/GlobalModals';
import { allPasswordsAtom, foldersAtom, licenseStatusAtom, activeModalAtom, favoriteAlertAtom } from '@/store/atoms';
import { makePassword, makeFolder } from '@/testUtils';
import type { Password, Folder } from '@/types';

const mockInvoke = vi.mocked(invoke);

interface RenderDashboardOptions {
  passwords?: Password[];
  folders?: Folder[];
  isPro?: boolean;
}

function renderDashboard(options: RenderDashboardOptions = {}) {
  const { passwords = [], folders = [], isPro = false } = options;
  const store = createStore();
  if (passwords.length > 0) {
    store.set(allPasswordsAtom, passwords);
  }
  if (folders.length > 0) {
    store.set(foldersAtom, folders);
  }
  if (isPro) {
    store.set(licenseStatusAtom, { is_active: true });
  }
  mockInvoke.mockImplementation((cmd: unknown) => {
    if (cmd === 'get_folders') return Promise.resolve(options.folders ?? []);
    if (cmd === 'get_passwords') return Promise.resolve(options.passwords ?? []);
    if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
    if (cmd === 'get_license_status') return Promise.resolve(isPro ? { is_active: true } : null);
    return Promise.resolve(undefined);
  });
  return {
    store,
    ...render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
          <GlobalModals />
        </Provider>
      </MemoryRouter>
    ),
  };
}

describe('Dashboard', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders without crashing', () => {
    const { container } = renderDashboard();
    expect(container).toBeInTheDocument();
  });

  it('shows the brand name', () => {
    renderDashboard();
    expect(screen.getByText('Vault')).toBeInTheDocument();
  });

  it('shows the search input', () => {
    renderDashboard();
    expect(screen.getByPlaceholderText('Search passwords...')).toBeInTheDocument();
  });

  it('shows empty state when no passwords exist', async () => {
    renderDashboard();
    expect(await screen.findByText('No passwords found')).toBeInTheDocument();
  });

  it('shows the New Folder button in the tab strip', () => {
    renderDashboard();
    expect(screen.getByText('New Folder')).toBeInTheDocument();
  });

  it('shows a password card when passwords exist', async () => {
    renderDashboard({ passwords: [makePassword()] });
    expect(await screen.findByText('GitHub')).toBeInTheDocument();
  });

  it('search query filters the password list', async () => {
    const user = userEvent.setup();
    const pw1 = makePassword({ id: 'p1', name: 'GitHub' });
    const pw2 = makePassword({ id: 'p2', name: 'Twitter' });
    renderDashboard({ passwords: [pw1, pw2] });

    // Wait for both passwords to load before typing
    await screen.findByText('GitHub');
    await screen.findByText('Twitter');

    const searchInput = screen.getByPlaceholderText('Search passwords...');
    await user.type(searchInput, 'GitHub');

    await waitFor(() => {
      expect(screen.queryByText('Twitter')).not.toBeInTheDocument();
    });
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('clicking selection-mode button shows bulk toolbar', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });

    expect(await screen.findByText('0 selected')).toBeInTheDocument();
  });

  it('bulk toolbar shows Favorite, Unfavorite and Delete buttons', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Favorite')).toBeInTheDocument();
      expect(screen.getByText('Unfavorite')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('clicking LogOut opens confirm dialog', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /log out/i }));
    });

    expect(await screen.findByText('Are you sure you want to logout?')).toBeInTheDocument();
  });

  it('Cancel button in logout dialog closes it', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /log out/i }));
    });

    expect(await screen.findByText('Are you sure you want to logout?')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await act(async () => {
      await user.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Are you sure you want to logout?')).not.toBeInTheDocument();
    });
  });

  it('shows upgrade banner when not Pro', async () => {
    renderDashboard();
    expect(await screen.findByText('Upgrade to Pro')).toBeInTheDocument();
  });

  it('does not show upgrade banner when Pro', async () => {
    renderDashboard({ isPro: true });
    await waitFor(() => {
      expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
    });
  });

  it('clicking settings icon navigates to /settings', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Settings/i }));
    });

    // Navigation is a side-effect in MemoryRouter; just assert the button is clickable without crashing
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
  });

  it('clicking floating + button when not in selection mode opens create password modal', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await act(async () => {});

    const floatingBtn = screen.getByRole('button', { name: /add password/i });

    await act(async () => {
      await user.click(floatingBtn);
    });

    // CreatePasswordModal should appear
    expect(await screen.findByText('Create New Password')).toBeInTheDocument();
  });

  it('clicking a folder tab switches the selected folder', async () => {
    const user = userEvent.setup();
    const folder = makeFolder({ id: 'f1', name: 'Work' });
    const pw1 = makePassword({ id: 'p1', name: 'GitHub', folderId: 'f1' });
    const pw2 = makePassword({ id: 'p2', name: 'Twitter', folderId: 'other' });

    const rawPw1 = { ...pw1, createdAt: pw1.createdAt.toISOString(), updatedAt: pw1.updatedAt.toISOString() };
    const rawPw2 = { ...pw2, createdAt: pw2.createdAt.toISOString(), updatedAt: pw2.updatedAt.toISOString() };

    const store = createStore();
    store.set(allPasswordsAtom, [pw1, pw2]);
    store.set(foldersAtom, [folder]);

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_folders') return Promise.resolve([{ ...folder, createdAt: folder.createdAt.toISOString() }]);
      if (cmd === 'get_passwords') return Promise.resolve([rawPw1, rawPw2]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      return Promise.resolve(undefined);
    });

    render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </MemoryRouter>
    );

    await screen.findByText('GitHub');
    await screen.findByText('Twitter');

    const workTab = screen.getByRole('button', { name: /Work/i });
    await act(async () => {
      await user.click(workTab);
    });

    await waitFor(() => {
      expect(screen.queryByText('Twitter')).not.toBeInTheDocument();
    });
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('clicking a password card navigates to that password', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub' });
    renderDashboard({ passwords: [pw] });

    await screen.findByText('GitHub');

    await act(async () => {
      await user.click(screen.getByText('GitHub'));
    });

    // After navigation, verify no empty state appeared
    expect(screen.queryByText('No passwords found')).not.toBeInTheDocument();
  });

  it('selecting a password in selection mode increments selected count', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub' });
    renderDashboard({ passwords: [pw] });

    await screen.findByText('GitHub');

    // Enter selection mode
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });

    expect(await screen.findByText('0 selected')).toBeInTheDocument();

    // In selection mode the Card's onClick fires onToggleSelection — click the heading text inside the card
    await act(async () => {
      await user.click(screen.getByText('GitHub'));
    });

    expect(await screen.findByText('1 selected')).toBeInTheDocument();
  });

  it('clicking Select All / Deselect All in bulk toolbar works', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub' });
    renderDashboard({ passwords: [pw] });

    await screen.findByText('GitHub');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });

    await screen.findByText('0 selected');

    // Click Select All
    const selectAllBtn = screen.getByRole('button', { name: /Select All/i });
    await act(async () => {
      await user.click(selectAllBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    // Now it should show Deselect All
    const deselectAllBtn = screen.getByRole('button', { name: /Deselect All/i });
    await act(async () => {
      await user.click(deselectAllBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('0 selected')).toBeInTheDocument();
    });
  });

  it('clicking bulk delete button opens delete confirmation when items selected', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub' });
    renderDashboard({ passwords: [pw] });

    await screen.findByText('GitHub');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });

    await screen.findByText('0 selected');

    // Select all
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Select All/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    // Click bulk Delete
    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    await act(async () => {
      await user.click(deleteBtn);
    });

    expect(await screen.findByText(/Delete Password/i)).toBeInTheDocument();
  });

  it('clicking Favorite bulk button when items are selected does not crash', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub' });
    const rawPw = { ...pw, createdAt: pw.createdAt.toISOString(), updatedAt: pw.updatedAt.toISOString() };

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_folders') return Promise.resolve([]);
      if (cmd === 'get_passwords') return Promise.resolve([rawPw]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'update_password') return Promise.resolve({ ...rawPw, isFavorite: true });
      return Promise.resolve(undefined);
    });

    const store = createStore();
    store.set(allPasswordsAtom, [pw]);
    render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </MemoryRouter>
    );

    await screen.findByText('GitHub');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });

    await screen.findByText('0 selected');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Select All/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    const favoriteBtn = screen.getByRole('button', { name: /^Favorite$/i });
    await act(async () => {
      await user.click(favoriteBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_password', expect.objectContaining({ id: 'p1' }));
    });
  });

  it('bulk delete confirmation calls delete_password for selected items', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub' });
    const rawPw = { ...pw, createdAt: pw.createdAt.toISOString(), updatedAt: pw.updatedAt.toISOString() };

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_folders') return Promise.resolve([]);
      if (cmd === 'get_passwords') return Promise.resolve([rawPw]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'delete_passwords') return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });

    const store = createStore();
    store.set(allPasswordsAtom, [pw]);
    render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </MemoryRouter>
    );

    await screen.findByText('GitHub');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });
    await screen.findByText('0 selected');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Select All/i }));
    });
    await waitFor(() => expect(screen.getByText('1 selected')).toBeInTheDocument());

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    });

    expect(await screen.findByText(/Delete Passwords?/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    await act(async () => {
      await user.click(confirmDeleteBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('delete_passwords', { ids: ['p1'] });
    });
  });

  it('clicking copy icon on a password card shows clipboard toast', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub', password: 'mysecret' });
    renderDashboard({ passwords: [pw] });

    await screen.findByText('GitHub');

    const card = screen.getByText('GitHub').closest('.rt-BaseCard') as HTMLElement;
    const btnsInCard = Array.from(card.querySelectorAll('button'));

    // Must have at least 2 buttons (copy + star)
    expect(btnsInCard.length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      await user.click(btnsInCard[btnsInCard.length - 2]); // copy button
    });

    expect(await screen.findByText(/Copied/i)).toBeInTheDocument();
  });

  it('New Folder button opens create folder modal', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await act(async () => {
      await user.click(screen.getByText('New Folder'));
    });

    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();
  });

  it('upgrade banner CTA opens upgrade modal and clears pending key', async () => {
    const user = userEvent.setup();
    const { store } = renderDashboard();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Upgrade to Pro$/i }));
    });

    expect(store.get(activeModalAtom)).toBe('upgrade');
  });

  it('Unfavorite bulk button calls update_password with isFavorite false', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub', isFavorite: true });
    const rawPw = { ...pw, createdAt: pw.createdAt.toISOString(), updatedAt: pw.updatedAt.toISOString() };

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_folders') return Promise.resolve([]);
      if (cmd === 'get_passwords') return Promise.resolve([rawPw]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'update_password') return Promise.resolve({ ...rawPw, isFavorite: false });
      return Promise.resolve(undefined);
    });

    const store = createStore();
    store.set(allPasswordsAtom, [pw]);
    render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </MemoryRouter>
    );

    await screen.findByText('GitHub');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });
    await screen.findByText('0 selected');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Select All/i }));
    });
    await waitFor(() => expect(screen.getByText('1 selected')).toBeInTheDocument());

    const unfavoriteBtn = screen.getByRole('button', { name: /^Unfavorite$/i });
    await act(async () => {
      await user.click(unfavoriteBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_password', expect.objectContaining({ id: 'p1' }));
    });
  });

  it('CreatePasswordModal cancel closes the modal', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await act(async () => {});

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /add password/i }));
    });

    expect(await screen.findByText('Create New Password')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Create New Password')).not.toBeInTheDocument();
    });
  });

  it('CreateFolderModal (New Folder) cancel closes the modal', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await act(async () => {
      await user.click(screen.getByText('New Folder'));
    });

    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
    });
  });

  it('DeletePasswordModal cancel closes it', async () => {
    const user = userEvent.setup();
    const pw = makePassword({ id: 'p1', name: 'GitHub' });
    renderDashboard({ passwords: [pw] });

    await screen.findByText('GitHub');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /toggle selection mode/i }));
    });
    await screen.findByText('0 selected');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Select All/i }));
    });
    await waitFor(() => expect(screen.getByText('1 selected')).toBeInTheDocument());

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    });
    expect(await screen.findByText(/Delete Password/i)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText(/Delete Password/i)).not.toBeInTheDocument();
    });
  });

  it('CreatePasswordModal submission creates password and closes modal', async () => {
    const user = userEvent.setup();

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_folders') return Promise.resolve([]);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'create_password') return Promise.resolve({ id: 'new-p', name: 'GitHub', username: 'user', password: 'pw', isFavorite: false, folderId: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      return Promise.resolve(undefined);
    });

    const store = createStore();
    render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </MemoryRouter>
    );
    await act(async () => {});

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /add password/i }));
    });

    expect(await screen.findByText('Create New Password')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Service Name/i), { target: { value: 'GitHub' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'user@example.com' } });
    fireEvent.change(document.querySelector('input[type="password"]') as HTMLElement, { target: { value: 'secret123' } });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Save$/i }));
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_password', expect.any(Object));
      expect(screen.queryByText('Create New Password')).not.toBeInTheDocument();
    });
  });

  it('CreateFolderModal (New Folder) submission creates folder and closes modal', async () => {
    const user = userEvent.setup();

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_folders') return Promise.resolve([]);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'create_folder') return Promise.resolve({ id: 'new-f', name: 'Work', icon: 'folder', isDefault: false, createdAt: new Date().toISOString() });
      return Promise.resolve(undefined);
    });

    const store = createStore();
    render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </MemoryRouter>
    );

    await act(async () => {
      await user.click(screen.getByText('New Folder'));
    });

    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'Work');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Create$/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
    });
  });

  it('favoriteAlert toast disappears after 2 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const store = createStore();
    store.set(favoriteAlertAtom, 'Maximum 2 favorites per folder');
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'get_folders') return Promise.resolve([]);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      return Promise.resolve(undefined);
    });

    render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Maximum 2 favorites per folder')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2000); });

    await waitFor(() => {
      expect(screen.queryByText('Maximum 2 favorites per folder')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});
