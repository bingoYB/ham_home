// Must stay first: installs the `storage` global before any storage module is evaluated.
import "./install-globals";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { App } from "@/entrypoints/app/App";
import { initTheme } from "@/hooks/useTheme";
import i18n from "@/lib/i18n/config";
import "@/style.css";

// Apply the theme before the first paint to avoid a flash
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
);
