import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ writeText: vi.fn() }));
vi.mock('@/services/sessionService', () => ({
  sessionService: { logout: vi.fn() },
}));

import { invoke } from '@tauri-apps/api/core';
import Dashboard from './index';

const mockInvoke = vi.mocked(invoke);

function renderDashboard() {
  const store = createStore();
  mockInvoke.mockImplementation((cmd: unknown) => {
    if (cmd === 'get_folders') return Promise.resolve([]);
    if (cmd === 'get_passwords') return Promise.resolve([]);
    if (cmd === 'check_limit_status') return Promise.resolve({ passwords_at_limit: false, folders_at_limit: false });
    return Promise.resolve(undefined);
  });
  return {
    store,
    ...render(
      <MemoryRouter>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </MemoryRouter>
    ),
  };
}

describe('Dashboard', () => {
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
});
