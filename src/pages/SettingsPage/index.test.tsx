import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }));
vi.mock('@/services/sessionService', () => ({
  sessionService: { logout: vi.fn() },
}));

import { invoke } from '@tauri-apps/api/core';
import SettingsPage from './index';
import { foldersAtom } from '@/store/atoms';
import type { Folder } from '@/types';

const mockInvoke = vi.mocked(invoke);

function renderSettings(folders: Folder[] = []) {
  const store = createStore();
  store.set(foldersAtom, folders);
  mockInvoke.mockImplementation((cmd: unknown) => {
    if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
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
    const folders: Folder[] = [
      { id: 'f1', name: 'Work', icon: 'folder', isDefault: false, createdAt: new Date() },
    ];
    renderSettings(folders);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });
});
