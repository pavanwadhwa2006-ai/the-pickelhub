/**
 * Auth Context
 *
 * Provides reactive authentication state, login, register, and logout methods.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AuthContext from './authContextDef';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('picklehub_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [player, setPlayer] = useState(() => {
    const savedPlayer = localStorage.getItem('picklehub_player');
    return savedPlayer ? JSON.parse(savedPlayer) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('picklehub_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearAuth = useCallback(() => {
    setUser(null);
    setPlayer(null);
    setToken(null);
    localStorage.removeItem('picklehub_token');
    localStorage.removeItem('picklehub_user');
    localStorage.removeItem('picklehub_player');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  // Validate stored token and fetch fresh user profile on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('picklehub_token');
      if (storedToken) {
        try {
          const response = await api.get('/auth/me');
          if (response.data.success) {
            setUser(response.data.user);
            setPlayer(response.data.player || null);
            localStorage.setItem('picklehub_user', JSON.stringify(response.data.user));
            if (response.data.player) {
              localStorage.setItem('picklehub_player', JSON.stringify(response.data.player));
            }
          }
        } catch {
          // Token invalid or expired
          clearAuth();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [clearAuth]);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData, player: playerData } = response.data;

      setToken(newToken);
      setUser(userData);
      setPlayer(playerData || null);
      localStorage.setItem('picklehub_token', newToken);
      localStorage.setItem('picklehub_user', JSON.stringify(userData));
      if (playerData) {
        localStorage.setItem('picklehub_player', JSON.stringify(playerData));
      }

      return { success: true, user: userData, player: playerData };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
      return { success: false, message, status: err.response?.status };
    }
  };

  const register = async (email, password, role = 'PLAYER', name = '') => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { email, password, role, name });
      const { token: newToken, user: userData, player: playerData } = response.data;

      setToken(newToken);
      setUser(userData);
      setPlayer(playerData || null);
      localStorage.setItem('picklehub_token', newToken);
      localStorage.setItem('picklehub_user', JSON.stringify(userData));
      if (playerData) {
        localStorage.setItem('picklehub_player', JSON.stringify(playerData));
      }

      return { success: true, user: userData, player: playerData };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, message };
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/players/me');
      if (res.data.success) {
        setPlayer(res.data.data);
        localStorage.setItem('picklehub_player', JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.error('Failed to refresh player profile:', err.message);
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    player,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    login,
    register,
    logout,
    refreshProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
