import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import PasswordDetailsPage from '@/pages/PasswordDetailsPage';
import SettingsPage from '@/pages/SettingsPage';
import GeneratedPasswordsPage from '@/pages/GeneratedPasswordsPage';
import { useSessionActivity } from '@/hooks/useSessionActivity';
import { useGlobalKeyboard } from '@/hooks/useGlobalKeyboard';
import { useOpenCreateEntryPrefilled } from '@/hooks/useOpenCreateEntryPrefilled';
import { useLicenseRefreshOnFocus } from '@/hooks/useLicenseRefreshOnFocus';
import GlobalModals from '@/components/GlobalModals';

function SessionWrapper() {
  // Track user activity and auto-lock after inactivity
  useSessionActivity();
  // Global keyboard shortcuts available on all authenticated pages
  useGlobalKeyboard();
  // Listen for overlay → main window deep-link to pre-fill the create-entry modal
  useOpenCreateEntryPrefilled();
  // Revalidate the Pro license when the window regains focus, so a long-lived
  // session cannot silently outlive the offline grace window. Mounted here (once)
  // rather than per page, or it would fire several times per focus.
  useLicenseRefreshOnFocus();

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/password/:id" element={<PasswordDetailsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/generated-passwords" element={<GeneratedPasswordsPage />} />
      </Routes>
      <GlobalModals />
    </>
  );
}

function App() {
  return (
    <MemoryRouter>
      <SessionWrapper />
    </MemoryRouter>
  );
}

export default App;
