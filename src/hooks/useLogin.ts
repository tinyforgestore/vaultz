import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { isAuthenticatedAtom } from '@/store/atoms';
import { sessionService } from '@/services/sessionService';

export function useLogin() {
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setIsAuthenticated = useSetAtom(isAuthenticatedAtom);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!masterPassword) {
      setError('Please enter your master password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await sessionService.login(masterPassword);
      
      if (success) {
        setIsAuthenticated(true);
        navigate('/dashboard');
      } else {
        setError('Invalid master password');
        setMasterPassword('');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    masterPassword,
    setMasterPassword,
    error,
    isLoading,
    handleLogin,
  };
}
