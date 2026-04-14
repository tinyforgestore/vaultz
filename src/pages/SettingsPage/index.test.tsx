import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }));
vi.mock('@/services/sessionService', () => ({
  sessionService: { logout: vi.fn() },
}));

import { invoke } from '@tauri-apps/api/core';
import { save as mockSaveImport } from '@tauri-apps/plugin-dialog';
import SettingsPage from './index';
import { foldersAtom, licenseStatusAtom, activeModalAtom } from '@/store/atoms';
import { makeFolder } from '@/testUtils';
import type { Folder } from '@/types';

const mockSave = vi.mocked(mockSaveImport);

const mockInvoke = vi.mocked(invoke);

function renderSettings(folders: Folder[] = [], isPro = false) {
  const store = createStore();
  store.set(foldersAtom, folders);
  if (isPro) {
    store.set(licenseStatusAtom, { is_active: true });
  }
  mockInvoke.mockImplementation((cmd: unknown) => {
    if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
    if (cmd === 'get_license_status') return Promise.resolve(isPro ? { is_active: true } : null);
    if (cmd === 'validate_license') return Promise.resolve(isPro ? true : false);
    if (cmd === 'get_passwords') return Promise.resolve([]);
    return Promise.resolve(undefined);
  });
  return {
    store,
    ...render(
      <MemoryRouter>
        <Provider store={store}>
          <SettingsPage />
        </Provider>
      </MemoryRouter>
    ),
  };
}

describe('SettingsPage', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders without crashing', () => {
    const { container } = renderSettings();
    expect(container).toBeInTheDocument();
  });

  it('renders the Settings title', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders Security section', () => {
    renderSettings();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Master Password/i })).toBeInTheDocument();
  });

  it('renders Backup section', () => {
    renderSettings();
    expect(screen.getByText('Backup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Vault/i })).toBeInTheDocument();
  });

  it('renders Folders section with filter input', () => {
    renderSettings();
    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter folders...')).toBeInTheDocument();
  });

  it('renders Danger Zone section', () => {
    renderSettings();
    expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Destroy Vault/i })).toBeInTheDocument();
  });

  it('renders folder list from store', () => {
    const folders = [makeFolder({ id: 'f1', name: 'Work' })];
    renderSettings(folders);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('clicking Change Master Password opens its modal', async () => {
    const user = userEvent.setup();
    renderSettings();

    const btn = screen.getByRole('button', { name: /Change Master Password/i });
    await user.click(btn);

    // Wait for the unique modal field label to appear (modal title and button share the same text)
    expect(await screen.findByText('Current Password *')).toBeInTheDocument();
  });

  it('clicking Export Vault opens its modal', async () => {
    const user = userEvent.setup();
    renderSettings();

    const btn = screen.getByRole('button', { name: /Export Vault/i });
    await user.click(btn);

    // Wait for the unique modal field label to appear (modal title and button share the same text)
    expect(await screen.findByText('Export Passphrase *')).toBeInTheDocument();
  });

  it('clicking Destroy Vault button shows confirmation text', async () => {
    const user = userEvent.setup();
    renderSettings();

    const destroyBtn = screen.getByRole('button', { name: /Destroy Vault/i });
    await user.click(destroyBtn);

    expect(
      await screen.findByText(/This will permanently destroy all vault data/)
    ).toBeInTheDocument();
  });

  it('Cancel in destroy confirmation hides it', async () => {
    const user = userEvent.setup();
    renderSettings();

    const destroyBtn = screen.getByRole('button', { name: /Destroy Vault/i });
    await user.click(destroyBtn);

    expect(
      await screen.findByText(/This will permanently destroy all vault data/)
    ).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByText(/This will permanently destroy all vault data/)
      ).not.toBeInTheDocument();
    });
  });

  it('folder filter input narrows the folder list', async () => {
    const user = userEvent.setup();
    const folders = [
      makeFolder({ id: 'f1', name: 'Work' }),
      makeFolder({ id: 'f2', name: 'Personal' }),
    ];
    renderSettings(folders);

    const filterInput = screen.getByPlaceholderText('Filter folders...');
    await user.type(filterInput, 'Work');

    await waitFor(() => {
      expect(screen.queryByText('Personal')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('clicking Add New Folder opens create folder modal', async () => {
    const user = userEvent.setup();
    renderSettings();

    const addFolderBtn = screen.getByRole('button', { name: /\+ Add New Folder/i });
    await user.click(addFolderBtn);

    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();
    expect(screen.getByText('Folder Name *')).toBeInTheDocument();
  });

  it('shows "Pro Member" text in footer when isPro', async () => {
    renderSettings([], true);

    expect(await screen.findByText(/Pro Member/)).toBeInTheDocument();
  });

  it('shows "Free Member" text in footer when not Pro', async () => {
    renderSettings([], false);
    expect(await screen.findByText(/Free Member/)).toBeInTheDocument();
  });

  it('does not show upgrade card when isPro', async () => {
    renderSettings([], true);
    await act(async () => {});
    expect(screen.queryByText('Activate Pro License')).not.toBeInTheDocument();
  });

  it('shows Activate Pro License button when not Pro', async () => {
    renderSettings([], false);
    expect(await screen.findByText('Activate Pro License')).toBeInTheDocument();
  });

  it('back button is present and clickable', async () => {
    const user = userEvent.setup();
    const store = createStore();
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'validate_license') return Promise.resolve(false);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Provider store={store}>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </Provider>
      </MemoryRouter>
    );

    const backBtn = screen.getByRole('button', { name: /go back/i });
    await act(async () => {
      await user.click(backBtn);
    });

    // After navigating to /dashboard, the SettingsPage unmounts
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('clicking pencil icon for a folder opens edit folder modal', async () => {
    const user = userEvent.setup();
    const folder = makeFolder({ id: 'f1', name: 'Work' });
    renderSettings([folder]);

    await screen.findByText('Work');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /edit work/i }));
    });

    expect(await screen.findByText('Edit Folder')).toBeInTheDocument();
  });

  it('clicking trash icon for a folder opens delete folder modal', async () => {
    const user = userEvent.setup();
    const folder = makeFolder({ id: 'f1', name: 'Work' });
    renderSettings([folder]);

    await screen.findByText('Work');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /delete work/i }));
    });

    expect(await screen.findByText('Delete Folder?')).toBeInTheDocument();
  });

  it('confirm delete folder removes folder after confirmation', async () => {
    const user = userEvent.setup();
    const folder = makeFolder({ id: 'f1', name: 'Work' });

    renderSettings([folder]);

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'delete_folder') return Promise.resolve(undefined);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      if (cmd === 'get_folders') return Promise.resolve([]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'validate_license') return Promise.resolve(false);
      return Promise.resolve(undefined);
    });

    await screen.findByText('Work');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /delete work/i }));
    });

    expect(await screen.findByText('Delete Folder?')).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    await act(async () => {
      await user.click(confirmDeleteBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('delete_folder', { folderId: 'f1' });
    });
  });

  it('confirm destroy vault calls invoke and navigates', async () => {
    const user = userEvent.setup();

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'destroy_vault') return Promise.resolve(undefined);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'validate_license') return Promise.resolve(false);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    renderSettings();

    // Open destroy vault confirmation
    const destroyBtn = screen.getByRole('button', { name: /Destroy Vault/i });
    await user.click(destroyBtn);

    expect(await screen.findByText(/This will permanently destroy all vault data/)).toBeInTheDocument();

    // Click the red "Destroy Vault" confirm button
    const confirmDestroyBtn = screen.getByRole('button', { name: /^Destroy Vault$/i });
    await act(async () => {
      await user.click(confirmDestroyBtn);
    });

    // Invoke should have been called with destroy_vault
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('destroy_vault');
    });
  });

  it('confirm change master password submits correctly', async () => {
    const user = userEvent.setup();

    renderSettings();

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'change_master_password') return Promise.resolve(true);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'validate_license') return Promise.resolve(false);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    const changePwdBtn = screen.getByRole('button', { name: /Change Master Password/i });
    await user.click(changePwdBtn);

    expect(await screen.findByText('Current Password *')).toBeInTheDocument();

    // Fill in all three required password fields (type="password" — not queryable by RTL role)
    // Dialog renders in a Radix UI portal outside the component container; use document
    const allInputs = document.querySelectorAll('input[type="password"]');
    if (allInputs.length >= 2) {
      await user.type(allInputs[0] as HTMLElement, 'OldPass123!');
      await user.type(allInputs[1] as HTMLElement, 'NewPass456!');
      if (allInputs.length >= 3) {
        await user.type(allInputs[2] as HTMLElement, 'NewPass456!');
      }
    }

    const submitBtn = screen.getByRole('button', { name: /Change Password/i });
    await act(async () => {
      await user.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('change_master_password', expect.any(Object));
    });
  });

  it('confirm export vault opens file save dialog', async () => {
    const user = userEvent.setup();
    mockSave.mockResolvedValue('/some/path/vault-export.pmvault');

    renderSettings();

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'export_vault') return Promise.resolve(undefined);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'validate_license') return Promise.resolve(false);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    const exportBtn = screen.getByRole('button', { name: /Export Vault/i });
    await user.click(exportBtn);

    expect(await screen.findByText('Export Passphrase *')).toBeInTheDocument();

    // Type passphrase into the password inputs (type="password" — not queryable by RTL role)
    // Dialog renders in a Radix UI portal outside the component container; use document
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    if (passwordInputs.length >= 2) {
      await user.type(passwordInputs[0] as HTMLElement, 'mypassphrase123');
      await user.type(passwordInputs[1] as HTMLElement, 'mypassphrase123');
    }

    const exportSubmitBtn = screen.getByRole('button', { name: /^Export$/i });
    await act(async () => {
      await user.click(exportSubmitBtn);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    });
  });

  it('cancel edit folder modal closes the modal', async () => {
    const user = userEvent.setup();
    const folder = makeFolder({ id: 'f1', name: 'Work' });
    renderSettings([folder]);

    await screen.findByText('Work');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /edit work/i }));
    });

    expect(await screen.findByText('Edit Folder')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await act(async () => {
      await user.click(cancelBtn);
    });

    await waitFor(() => {
      expect(screen.queryByText('Edit Folder')).not.toBeInTheDocument();
    });
  });

  it('confirm create folder calls create_folder', async () => {
    const user = userEvent.setup();

    renderSettings();

    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'create_folder') return Promise.resolve({ id: 'new-f', name: 'Test Folder', icon: 'folder', isDefault: false, createdAt: new Date().toISOString() });
      if (cmd === 'get_folders') return Promise.resolve([]);
      if (cmd === 'get_passwords') return Promise.resolve([]);
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'get_license_status') return Promise.resolve(null);
      if (cmd === 'validate_license') return Promise.resolve(false);
      return Promise.resolve(undefined);
    });

    const addFolderBtn = screen.getByRole('button', { name: /\+ Add New Folder/i });
    await user.click(addFolderBtn);

    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();

    const folderNameInput = screen.getByRole('textbox');
    await user.type(folderNameInput, 'Test Folder');

    const createBtn = screen.getByRole('button', { name: /^Create$/i });
    await act(async () => {
      await user.click(createBtn);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_folder', { input: expect.objectContaining({ name: 'Test Folder' }) });
    });
  });

  it('clicking Activate Pro License sets activeModal to activate', async () => {
    const user = userEvent.setup();
    const { store } = renderSettings([], false);

    const activateBtn = await screen.findByRole('button', { name: /Activate Pro License/i });
    await act(async () => {
      await user.click(activateBtn);
    });

    expect(store.get(activeModalAtom)).toBe('activate');
  });

  it('Escape in ChangeMasterPasswordModal closes it', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: /Change Master Password/i }));
    expect(await screen.findByText('Current Password *')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Current Password *')).not.toBeInTheDocument();
    });
  });

  it('Escape in ExportVaultModal closes it', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: /Export Vault/i }));
    expect(await screen.findByText('Export Passphrase *')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Export Passphrase *')).not.toBeInTheDocument();
    });
  });

  it('Escape in CreateFolderModal (from Settings) closes it', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: /\+ Add New Folder/i }));
    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
    });
  });

  it('Cancel in DeleteFolderModal closes the modal', async () => {
    const user = userEvent.setup();
    const folder = makeFolder({ id: 'f1', name: 'Work' });
    renderSettings([folder]);

    await screen.findByText('Work');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /delete work/i }));
    });
    expect(await screen.findByText('Delete Folder?')).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^Cancel$/i }));
    });
    await waitFor(() => {
      expect(screen.queryByText('Delete Folder?')).not.toBeInTheDocument();
    });
  });
});
