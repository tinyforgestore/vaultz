import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');

import { invoke } from '@tauri-apps/api/core';
import CreatePasswordModal from './index';
import { foldersAtom } from '@/store/atoms';
import type { Folder } from '@/types';

const mockInvoke = vi.mocked(invoke);

function renderModal(overrides: Partial<React.ComponentProps<typeof CreatePasswordModal>> = {}) {
  const store = createStore();
  mockInvoke.mockImplementation((cmd: unknown) => {
    if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
    return Promise.resolve(undefined);
  });
  const defaults = {
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return {
    store,
    ...render(
      <Provider store={store}>
        <CreatePasswordModal {...defaults} {...overrides} />
      </Provider>
    ),
    ...defaults,
    ...overrides,
  };
}

describe('CreatePasswordModal', () => {
  it('renders "Create New Password" title in create mode', () => {
    renderModal();
    expect(screen.getByText('Create New Password')).toBeInTheDocument();
  });

  it('renders "Edit Password" title when initialData is provided', () => {
    const initialData = {
      id: '1',
      name: 'GitHub',
      username: 'user',
      password: 'pw',
      isFavorite: false,
      folderId: 'f1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    renderModal({ initialData });
    expect(screen.getByText('Edit Password')).toBeInTheDocument();
  });

  it('renders required fields', () => {
    renderModal();
    expect(screen.getByText(/Service Name/)).toBeInTheDocument();
    expect(screen.getByText(/Username/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Create New Password/i })).toBeInTheDocument();
  });

  it('shows folder options from store', async () => {
    const folder: Folder = { id: 'f1', name: 'Personal', icon: 'folder', isDefault: false, createdAt: new Date() };
    const store = createStore();
    store.set(foldersAtom, [folder]);
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      return Promise.resolve(undefined);
    });
    render(
      <Provider store={store}>
        <CreatePasswordModal onConfirm={vi.fn()} onCancel={vi.fn()} />
      </Provider>
    );
    expect(await screen.findByText('Personal')).toBeInTheDocument();
  });

  it('shows and hides generator on Generate button click', () => {
    renderModal();
    expect(screen.queryByText('Use This Password')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    expect(screen.getByText('Use This Password')).toBeInTheDocument();
  });
});
