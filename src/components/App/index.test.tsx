import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-deep-link', () => ({
  getCurrent: vi.fn().mockResolvedValue(null),
  onOpenUrl: vi.fn().mockResolvedValue(vi.fn()),
}));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/services/sessionService', () => ({
  sessionService: {
    updateActivity: vi.fn(),
    checkTimeout: vi.fn().mockResolvedValue(false),
    login: vi.fn().mockResolvedValue(false),
  },
}));

// Mock heavy page components so the test only verifies routing plumbing
vi.mock('@/pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">LoginPage</div>,
}));
vi.mock('@/pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock('@/pages/PasswordDetailsPage', () => ({
  default: () => <div data-testid="password-details-page">PasswordDetailsPage</div>,
}));
vi.mock('@/pages/SettingsPage', () => ({
  default: () => <div data-testid="settings-page">SettingsPage</div>,
}));

import { invoke } from '@tauri-apps/api/core';
import App from './index';
import { isAuthenticatedAtom } from '@/atoms/session';

function renderApp({ authenticated = false }: { authenticated?: boolean } = {}) {
  const store = createStore();
  if (authenticated) store.set(isAuthenticatedAtom, true);
  // App uses BrowserRouter internally, so we need to render it directly
  return render(
    <Provider store={store}>
      <App />
    </Provider>
  );
}

describe('App', () => {
  // `isAuthenticatedAtom` is an `atomWithStorage`, so the authenticated case
  // would otherwise leak into the tests that expect the login route.
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('renders without crashing', () => {
    // App navigates / → /login by default
    const { container } = renderApp();
    expect(container).toBeInTheDocument();
  });

  it('redirects / to /login and shows login page', () => {
    renderApp();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('revalidates the license exactly once when the window regains focus', async () => {
    // Wired at the app level, not per page: mounting it per page would attach one
    // listener per mounted page and fire several chains per focus event.
    const calls: string[] = [];
    vi.mocked(invoke).mockImplementation((cmd: unknown) => {
      calls.push(cmd as string);
      if (cmd === 'get_license_status') return Promise.resolve({ is_active: true });
      if (cmd === 'validate_license') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    // The focus refresh is gated on authentication — the backend commands succeed
    // over a locked vault, so an unauthenticated window must stay silent.
    renderApp({ authenticated: true });
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(calls.filter((cmd) => cmd === 'validate_license')).toEqual(['validate_license']);
  });
});
