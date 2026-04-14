import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  afterEach(() => vi.clearAllMocks());

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

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderModal({ onCancel });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it('eye icon toggles password field to type="text"', async () => {
    const user = userEvent.setup();
    renderModal();
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(passwordInput).toHaveAttribute('type', 'password');
    const eyeBtn = document.querySelector('button[tabindex="-1"]') as HTMLElement;
    await user.click(eyeBtn);
    await waitFor(() => expect(passwordInput).toHaveAttribute('type', 'text'));
  });

  it('typing in service name updates the input value', () => {
    renderModal();
    const input = screen.getByLabelText(/Service Name/i);
    fireEvent.change(input, { target: { value: 'GitHub' } });
    expect(input).toHaveValue('GitHub');
  });

  it('typing in username updates the input value', () => {
    renderModal();
    const input = screen.getByLabelText(/Username/i);
    fireEvent.change(input, { target: { value: 'user@example.com' } });
    expect(input).toHaveValue('user@example.com');
  });

  it('typing in password field updates the input value', () => {
    renderModal();
    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'mysecret' } });
    expect(input).toHaveValue('mysecret');
  });

  it('typing in URL field updates the input value', () => {
    renderModal();
    const input = screen.getByLabelText(/^URL/i);
    fireEvent.change(input, { target: { value: 'https://github.com' } });
    expect(input).toHaveValue('https://github.com');
  });

  it('typing in notes updates the textarea value', () => {
    renderModal();
    const textarea = screen.getByLabelText(/^Notes/i);
    fireEvent.change(textarea, { target: { value: 'my notes' } });
    expect(textarea).toHaveValue('my notes');
  });

  it('"Use This Password" fills the password field and hides the generator', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Generate/i }));
    expect(screen.getByText('Use This Password')).toBeInTheDocument();
    await user.click(screen.getByText('Use This Password'));
    await waitFor(() => {
      expect(screen.queryByText('Use This Password')).not.toBeInTheDocument();
    });
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(passwordInput.value.length).toBeGreaterThan(0);
  });

  it('"Hide" button closes the generator', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Generate/i }));
    expect(screen.getByText('Use This Password')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Hide$/i }));
    await waitFor(() => {
      expect(screen.queryByText('Use This Password')).not.toBeInTheDocument();
    });
  });

  it('form submission calls onConfirm with field values', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderModal({ onConfirm });
    fireEvent.change(screen.getByLabelText(/Service Name/i), { target: { value: 'GitHub' } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'user@example.com' } });
    fireEvent.change(document.querySelector('input[type="password"]') as HTMLElement, { target: { value: 'secret123' } });
    await user.click(screen.getByRole('button', { name: /^Save$/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
        serviceName: 'GitHub',
        username: 'user@example.com',
        password: 'secret123',
      }));
    });
  });

  it('"New" folder button opens CreateFolderModal', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /^New$/i }));
    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();
  });

  it('CreateFolderModal cancel closes it', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /^New$/i }));
    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();
    const folderDialog = screen.getByText('Create New Folder').closest('[role="dialog"]')!;
    await user.click(within(folderDialog).getByRole('button', { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
    });
  });

  it('CreateFolderModal confirm success closes the folder modal', async () => {
    const user = userEvent.setup();
    const store = createStore();
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'create_folder') return Promise.resolve({ id: 'new-f', name: 'My Folder', icon: 'folder', isDefault: false, createdAt: new Date().toISOString() });
      return Promise.resolve(undefined);
    });
    render(
      <Provider store={store}>
        <CreatePasswordModal onConfirm={vi.fn()} onCancel={vi.fn()} />
      </Provider>
    );

    await user.click(screen.getByRole('button', { name: /^New$/i }));
    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();

    const folderDialog = screen.getByText('Create New Folder').closest('[role="dialog"]')!;
    await user.type(within(folderDialog).getByRole('textbox'), 'My Folder');
    await user.click(within(folderDialog).getByRole('button', { name: /^Create$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
    });
  });

  it('CreateFolderModal limit-reached error closes folder modal and calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const store = createStore();
    mockInvoke.mockImplementation((cmd: unknown) => {
      if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
      if (cmd === 'create_folder') return Promise.reject(new Error('LIMIT_REACHED:folders'));
      return Promise.resolve(undefined);
    });
    render(
      <Provider store={store}>
        <CreatePasswordModal onConfirm={vi.fn()} onCancel={onCancel} />
      </Provider>
    );

    await user.click(screen.getByRole('button', { name: /^New$/i }));
    expect(await screen.findByText('Create New Folder')).toBeInTheDocument();

    const folderDialog = screen.getByText('Create New Folder').closest('[role="dialog"]')!;
    await user.type(within(folderDialog).getByRole('textbox'), 'My Folder');
    await user.click(within(folderDialog).getByRole('button', { name: /^Create$/i }));

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
    });
  });
});
