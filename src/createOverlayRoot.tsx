import React, { type ComponentType } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@radix-ui/themes/styles.css';
import './overlay.css';
import { Theme as RadixTheme } from '@radix-ui/themes';
import { Provider } from 'jotai';
import { lightTheme, darkTheme } from '@/styles/theme.css';

/**
 * Bootstraps a Tauri overlay window: detects color scheme, applies the matching
 * theme to the document root, and renders the given component inside a Jotai
 * Provider + Radix Theme.
 */
export function createOverlayRoot(Component: ComponentType): void {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.add(isDark ? darkTheme : lightTheme);

  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('createOverlayRoot: #root element not found');
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Provider>
        <RadixTheme appearance={isDark ? 'dark' : 'light'} className={isDark ? darkTheme : lightTheme}>
          <Component />
        </RadixTheme>
      </Provider>
    </React.StrictMode>,
  );
}
