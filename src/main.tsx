import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/components/App";
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@radix-ui/themes/styles.css';
import './global.css';
import { Theme as RadixTheme } from '@radix-ui/themes';
import { Provider } from 'jotai';
import { lightTheme, darkTheme } from '@/styles/theme.css';
import { useTheme, Theme } from '@/hooks/useTheme';

// Apply initial theme synchronously before first paint to avoid flash.
// atomWithStorage serializes values as JSON, so raw localStorage values carry
// surrounding quotes (e.g. '"dark"'). Strip them when reading directly.
const _rawTheme = localStorage.getItem('vaultz-theme');
const _storedTheme = (_rawTheme === '"dark"') ? 'dark' : (_rawTheme === '"light"') ? 'light' : 'system';
const _osTheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const _initialTheme: 'light' | 'dark' = _storedTheme === 'system' ? _osTheme : _storedTheme;
// Set both document.documentElement (for global CSS / vanilla-extract themeVars)
// and the Radix <Theme className> (for Radix component scope) — each layer needs
// the class independently; setting only one leaves the other unstyled.
document.documentElement.classList.add(_initialTheme === 'dark' ? darkTheme : lightTheme);

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function ThemedApp() {
  const { theme } = useTheme();
  const resolved = resolveTheme(theme);
  return (
    // className syncs the Radix component tree; document.documentElement class
    // (managed by useTheme's useEffect) covers global CSS vars and vanilla-extract tokens.
    <RadixTheme appearance={resolved} className={resolved === 'dark' ? darkTheme : lightTheme}>
      <App />
    </RadixTheme>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* Jotai Provider gives all hooks access to the shared global store */}
    <Provider>
      <ThemedApp />
    </Provider>
  </React.StrictMode>,
);
