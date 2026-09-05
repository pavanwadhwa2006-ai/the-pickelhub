/**
 * ProfileSettingsMenu Component
 *
 * User Profile & Settings dropdown menu with:
 * 1. Profile Picture upload with client-side validation, live preview, loading ring, and delete link.
 * 2. Radio-style theme selector for "Classic dark" (default) and "Garden light".
 * 3. Quick athlete navigation links and logout action.
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';
import { THEMES } from '../context/themeConstants';
import api from '../services/api';

const ProfileSettingsMenu = () => {
  const { user, player, logout, refreshProfile, isAdmin, isAdminMode, toggleAdminViewMode } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Client-side validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Invalid format. Only PNG, JPEG, or WEBP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit.');
      return;
    }

    // Live local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        await refreshProfile();
        setSuccessMsg('Photo updated ✓');
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload photo.');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setUploading(true);

    try {
      const res = await api.delete('/profile/photo');
      if (res.data.success) {
        setPreviewUrl(null);
        await refreshProfile();
        setSuccessMsg('Photo removed ✓');
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsOpen(false);
  };

  const handleSelectAdminMode = () => {
    toggleAdminViewMode('ADMIN');
    setIsOpen(false);
  };

  const handleSelectAthleteView = () => {
    toggleAdminViewMode('PLAYER');
    setIsOpen(false);
    if (window.location.pathname.startsWith('/admin')) {
      navigate('/dashboard');
    }
  };

  const currentPhoto = previewUrl || player?.profilePhoto;

  return (
    <div className="relative" ref={menuRef}>
      {/* Navbar Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 border transition-all cursor-pointer rounded-full group focus:outline-none shadow-sm hover:brightness-110"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderColor: 'var(--nav-accent)',
        }}
        aria-label="User Profile & Settings Menu"
        aria-expanded={isOpen}
      >
        <div
          className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-md"
          style={{ backgroundColor: 'var(--nav-accent)', color: 'var(--nav-logo-text)' }}
        >
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={player?.name || 'Athlete'}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(player?.name || user?.email)
          )}
        </div>
        <span
          className="text-xs font-bold hidden sm:inline-block pr-2 transition-colors"
          style={{ color: 'var(--nav-text)' }}
        >
          {player?.name?.split(' ')[0] || user?.email?.split('@')[0]}
        </span>
      </button>

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 max-h-[calc(100vh-100px)] overflow-y-auto bg-[var(--color-bg-card)] border-2 border-[var(--color-border-subtle)] text-[var(--color-text-primary)] shadow-2xl p-6 z-50 animate-fade-in divide-y divide-[var(--color-border-subtle)] rounded-2xl">
          {/* Header Action Bar with Quick Logout */}
          <div className="flex items-center justify-between pb-3 mb-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted)] uppercase">
              ACCOUNT & SETTINGS
            </span>
            <button
              type="button"
              id="top-quick-logout-btn"
              onClick={handleLogout}
              className="text-[11px] font-bold tracking-wider uppercase text-rose-400 hover:text-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors px-2 py-1 rounded-md bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/40"
              title="Log out of your account"
            >
              <span>LOGOUT</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Header Profile Section with Avatar & Upload */}
          <div className="pt-4 pb-5 flex flex-col items-center text-center">
            {/* Avatar Circle with Camera Overlay */}
            <div className="relative mb-3 group">
              <div
                className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-[var(--color-accent-primary)] text-white font-['Playfair_Display'] font-bold text-2xl shadow-xl relative ${
                  uploading ? 'ring-4 ring-[var(--color-accent-primary)] ring-offset-2 animate-pulse' : ''
                }`}
              >
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={player?.name || 'Athlete'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(player?.name || user?.email)
                )}
              </div>

              {/* Camera Icon Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Change profile picture"
                className="absolute bottom-0 right-0 w-7 h-7 bg-[var(--color-bg-base)] border border-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)] text-white rounded-full flex items-center justify-center transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Remove Photo Action */}
            {currentPhoto && !uploading && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-[10px] text-[var(--color-accent-primary)] hover:underline font-bold uppercase cursor-pointer mb-2"
              >
                Remove photo
              </button>
            )}

            {/* Inline Notifications */}
            {errorMsg && (
              <div className="text-[11px] text-[#ff5451] font-semibold mb-2">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="text-[11px] text-[#4ade80] font-semibold mb-2">
                {successMsg}
              </div>
            )}

            {/* Identity Info */}
            <h4 className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary)]">
              {player?.name || user?.email?.split('@')[0]}
            </h4>
            <div className="text-[10px] text-[var(--color-accent-primary)] font-mono mt-0.5">
              {player?.playerId} • {player?.currentRating || 1000} Elo
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-full block mt-0.5 font-mono">
              {user?.email}
            </span>
          </div>

          {/* Perspective Switcher (Visible only for Administrators) */}
          {isAdmin && (
            <div className="py-4">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-accent-primary)] uppercase block mb-2.5">
                PERSPECTIVE SWITCHER
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSelectAdminMode}
                  className={`p-2.5 border rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    isAdminMode
                      ? 'bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)] shadow-sm'
                      : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="text-base">👑</span>
                  <span className="text-[10px] tracking-wider">Admin Mode</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectAthleteView}
                  className={`p-2.5 border rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    !isAdminMode
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="text-base">🏓</span>
                  <span className="text-[10px] tracking-wider">Athlete View</span>
                </button>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
                {isAdminMode
                  ? 'Active admin privileges, match approvals, and tournament settings.'
                  : 'Previewing experience as an authentic club athlete.'}
              </p>
            </div>
          )}

          {/* Theme Selector */}
          <div className="py-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted)] uppercase block mb-3">
              THEME SELECTION
            </span>
            <div className="space-y-2">
              <label
                className={`flex items-center justify-between p-2.5 border rounded-xl text-xs font-bold uppercase cursor-pointer transition-all ${
                  theme === THEMES.CLASSIC_DARK
                    ? 'bg-[var(--color-bg-base)] border-[var(--color-accent-primary)] text-[var(--color-text-primary)] shadow-sm'
                    : 'bg-[var(--color-bg-base)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-accent-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="theme"
                    checked={theme === THEMES.CLASSIC_DARK}
                    onChange={() => setTheme(THEMES.CLASSIC_DARK)}
                    className="accent-[var(--color-accent-primary)] cursor-pointer"
                  />
                  <span>Classic dark</span>
                </div>
                <span className="text-[9px] text-[var(--color-accent-primary)] font-mono">MAROON</span>
              </label>

              <label
                className={`flex items-center justify-between p-2.5 border rounded-xl text-xs font-bold uppercase cursor-pointer transition-all ${
                  theme === THEMES.GARDEN_LIGHT
                    ? 'bg-[var(--color-bg-base)] border-[var(--color-accent-primary)] text-[var(--color-text-primary)] shadow-sm'
                    : 'bg-[var(--color-bg-base)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-accent-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="theme"
                    checked={theme === THEMES.GARDEN_LIGHT}
                    onChange={() => setTheme(THEMES.GARDEN_LIGHT)}
                    className="accent-[var(--color-accent-primary)] cursor-pointer"
                  />
                  <span>Garden light</span>
                </div>
                <span className="text-[9px] text-[var(--color-accent-primary)] font-mono">BOTANICAL</span>
              </label>
            </div>
          </div>

          {/* Quick Actions & Logout */}
          <div className="pt-4 space-y-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  toggleAdminViewMode('ADMIN');
                  setIsOpen(false);
                  navigate('/admin');
                }}
                className="w-full py-2.5 px-3 bg-[var(--color-accent-primary)] hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider block text-center rounded-xl transition-all shadow-sm cursor-pointer"
              >
                ADMIN PORTAL 👑
              </button>
            )}

            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 px-3 bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider block text-center rounded-xl transition-colors"
            >
              DASHBOARD
            </Link>

            {player?.playerId && (
              <Link
                to={`/players/${player.playerId}`}
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 px-3 bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider block text-center rounded-xl transition-colors"
              >
                VIEW PUBLIC PROFILE
              </Link>
            )}

            <button
              type="button"
              id="profile-logout-btn"
              onClick={handleLogout}
              className="w-full py-2.5 px-3 bg-rose-950/30 hover:bg-rose-600 border border-rose-800/60 hover:border-rose-600 text-xs font-bold text-rose-300 hover:text-white uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettingsMenu;
