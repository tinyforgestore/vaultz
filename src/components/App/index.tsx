import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import PasswordDetailsPage from '@/pages/PasswordDetailsPage';
import SettingsPage from '@/pages/SettingsPage';
import { useSessionActivity } from '@/hooks/useSessionActivity';

function SessionWrapper() {
  // Track user activity and auto-lock after inactivity
  useSessionActivity();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/password/:id" element={<PasswordDetailsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SessionWrapper />
    </BrowserRouter>
  );
}

export default App;
