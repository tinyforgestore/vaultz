import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

import App from './index';

function renderApp() {
  const store = createStore();
  // App uses BrowserRouter internally, so we need to render it directly
  return render(
    <Provider store={store}>
      <App />
    </Provider>
  );
}

describe('App', () => {
  it('renders without crashing', () => {
    // App navigates / → /login by default
    const { container } = renderApp();
    expect(container).toBeInTheDocument();
  });

  it('redirects / to /login and shows login page', () => {
    renderApp();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
