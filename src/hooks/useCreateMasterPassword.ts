import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useCreateMasterPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validatePasswords = (): boolean => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const createMasterPassword = async (): Promise<boolean> => {
    setError('');

    if (!validatePasswords()) {
      return false;
    }

    setIsLoading(true);

    try {
      // Initialize database with master password and default folders
      await invoke('initialize_database', { masterPassword: password });

      setPassword('');
      setConfirmPassword('');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create master password');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    password,
    confirmPassword,
    error,
    isLoading,
    setPassword,
    setConfirmPassword,
    createMasterPassword,
  };
}
