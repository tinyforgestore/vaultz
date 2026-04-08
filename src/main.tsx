import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/components/App";
import '@radix-ui/themes/styles.css';
import './global.css';
import { Theme } from '@radix-ui/themes';

document.addEventListener('contextmenu', (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Theme>
      <App />
    </Theme>
  </React.StrictMode>,
);
