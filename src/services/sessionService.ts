import { invoke } from '@tauri-apps/api/core';

export const sessionService = {
  /**
   * Authenticate user with master password
   */
  login: async (password: string): Promise<boolean> => {
    try {
      const result = await invoke<boolean>('login', { password });
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  /**
   * Log out current user and clear session
   */
  logout: async (): Promise<void> => {
    try {
      await invoke('logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      return await invoke<boolean>('is_authenticated');
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  },

  /**
   * Update last activity timestamp
   */
  updateActivity: async (): Promise<void> => {
    try {
      await invoke('update_activity');
    } catch (error) {
      console.error('Update activity error:', error);
    }
  },

  /**
   * Check if session has timed out
   * @returns true if session expired, false otherwise
   */
  checkTimeout: async (): Promise<boolean> => {
    try {
      return await invoke<boolean>('check_session_timeout');
    } catch (error) {
      console.error('Timeout check error:', error);
      return false;
    }
  },
};
