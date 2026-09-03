/**
 * Auth Context
 *
 * Provides reactive authentication state, login, register, and logout methods.
 *
 * Dual-Token Architecture:
 * - Access token stored in-memory only (via api.js setAccessToken) — XSS-safe
 * - Refresh token stored in httpOnly cookie (handled by browser automatically)
 * - User/player data kept in localStorage for instant UI hydration (no secrets)
 * - On mount: attempts silent refresh to restore session from cookie
 */

import { useState, useEffect, useCallback } from 'react';
import api, { setAccessToken, clearAccessToken } from '../services/api';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearAuth = useCallback(() => {
    setUser(null);
    setPlayer(null);
    clearAccessToken();
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

  // Listen for auth expiry events dispatched by api.js interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      clearAuth();
    };
    window.addEventListener('picklehub:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('picklehub:auth-expired', handleAuthExpired);
  }, [clearAuth]);

  // On mount: attempt silent refresh to restore session from httpOnly cookie
  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const response = await api.post('/auth/refresh');
        if (response.data.success && response.data.token) {
          setAccessToken(response.data.token);
          setUser(response.data.user);
          setPlayer(response.data.player || null);
          localStorage.setItem('picklehub_user', JSON.stringify(response.data.user));
          if (response.data.player) {
            localStorage.setItem('picklehub_player', JSON.stringify(response.data.player));
          }
        }
      } catch {
        // No valid refresh token — user needs to log in
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    silentRefresh();
  }, [clearAuth]);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: accessTokenValue, user: userData, player: playerData } = response.data;

      setAccessToken(accessTokenValue);
      setUser(userData);
      setPlayer(playerData || null);
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
      const { token: accessTokenValue, user: userData, player: playerData } = response.data;

      setAccessToken(accessTokenValue);
      setUser(userData);
      setPlayer(playerData || null);
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

  const googleLogin = async (credential) => {
    setError(null);
    try {
      const response = await api.post('/auth/google', { credential });
      const { token: accessTokenValue, user: userData, player: playerData } = response.data;

      setAccessToken(accessTokenValue);
      setUser(userData);
      setPlayer(playerData || null);
      localStorage.setItem('picklehub_user', JSON.stringify(userData));
      if (playerData) {
        localStorage.setItem('picklehub_player', JSON.stringify(playerData));
      }

      return { success: true, user: userData, player: playerData };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Google authentication failed. Please try again.';
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
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    login,
    register,
    googleLogin,
    logout,
    refreshProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
