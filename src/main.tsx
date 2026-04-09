import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/components/App";
import '@radix-ui/themes/styles.css';
import './global.css';
import { Theme } from '@radix-ui/themes';
import { lightTheme } from '@/styles/theme.css';

document.addEventListener('contextmenu', (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Theme className={lightTheme}>
      <App />
    </Theme>
  </React.StrictMode>,
);
