/**
 * Navbar Component
 *
 * Cinematic Editorial navigation bar with sharp aesthetics,
 * animated underline hover states, brand micro-interactions,
 * role indicators, mobile drawer transitions, and Admin Perspective Switcher.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import ProfileSettingsMenu from './ProfileSettingsMenu';
import api from '../services/api';

const prefetchRoute = (path) => {
  try {
    if (path === '/leaderboard') import('../pages/LeaderboardPage');
    else if (path === '/tournaments') import('../pages/TournamentsPage');
    else if (path === '/compare') import('../pages/ComparePage');
    else if (path === '/dashboard') import('../pages/DashboardPage');
    else if (path === '/admin') import('../pages/AdminPage');
    else if (path === '/matches/submit') import('../pages/SubmitMatchPage');
  } catch {
    // Ignore prefetch errors
  }
};

const Navbar = () => {
  const { isAuthenticated, isAdmin, isAdminMode, toggleAdminViewMode } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Poll pending approvals count if in Admin Mode
  useEffect(() => {
    let isMounted = true;
    if (!isAdminMode) return;

    const fetchPending = async () => {
      try {
        const res = await api.get('/admin/matches/pending');
        if (isMounted && res.data.success) {
          setPendingCount(res.data.count ?? res.data.data?.length ?? 0);
        }
      } catch {
        // Silently ignore non-fatal polling errors
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 45_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAdminMode]);

  const navLinks = [
    { label: 'HOME', path: '/' },
    { label: 'LEADERBOARD', path: '/leaderboard' },
    { label: 'TOURNAMENTS', path: '/tournaments' },
    { label: 'COMPARE', path: '/compare' },
    ...(isAuthenticated ? [{ label: 'DASHBOARD', path: '/dashboard' }] : []),
    ...(isAdminMode ? [{ label: 'ADMIN PANEL', path: '/admin', badge: pendingCount }] : []),
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Ambient Top Banner when Admin is viewing as Athlete */}
      {isAdmin && !isAdminMode && (
        <div
          role="status"
          aria-live="polite"
          className="bg-gradient-to-r from-[#10241F] via-[#1D3461] to-[#722F37] border-b border-[#B08D57]/40 px-4 sm:px-10 py-1.5 text-xs text-[#FBF8ED] flex items-center justify-between shadow-sm z-50 relative"
        >
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[11px] sm:text-xs">
              <strong>Athlete Perspective:</strong> Previewing The PickleHub as a player.
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleAdminViewMode('ADMIN')}
            className="px-2.5 py-0.5 bg-[#B08D57] hover:bg-[#c9a46c] text-[#10241F] text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer shadow shrink-0"
          >
            Return to Admin Portal 👑
          </button>
        </div>
      )}

      <header
        className="navbar-header sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-200"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
      >
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 md:px-20 h-20 flex items-center justify-between">
          {/* Brand Logo with micro-interaction */}
          <Link
            to="/"
            onMouseEnter={() => prefetchRoute('/')}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div
              className="w-8 h-8 flex items-center justify-center font-bold text-lg font-mono group-hover:scale-105 transition-all duration-300 shadow-md"
              style={{ backgroundColor: 'var(--nav-logo-bg)', color: 'var(--nav-logo-text)' }}
            >
              P
            </div>
            <div className="flex flex-col">
              <span
                className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold tracking-tight transition-colors"
                style={{ color: 'var(--nav-text)' }}
              >
                THE PICKLEHUB
              </span>
              <span
                className="text-[10px] tracking-[0.25em] uppercase font-semibold"
                style={{ color: 'var(--nav-accent)' }}
              >
                RATING & LEAGUE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links with animated growing underline */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onMouseEnter={() => prefetchRoute(link.path)}
                  onTouchStart={() => prefetchRoute(link.path)}
                  className={`nav-link-animated py-2 text-xs font-bold tracking-[0.2em] transition-colors flex items-center gap-1.5 ${
                    active ? 'active' : ''
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge > 0 && (
                    <span
                      className="px-1.5 py-0.2 bg-[#ff3b3f] text-white text-[9px] font-mono font-bold rounded-full animate-pulse shadow-sm"
                      title={`${link.badge} pending matches`}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Admin Perspective Switcher Pill */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => toggleAdminViewMode()}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                  isAdminMode
                    ? 'bg-[#B08D57]/20 border-[#B08D57] text-[#FBF8ED] hover:bg-[#B08D57]/30'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                }`}
                title={
                  isAdminMode
                    ? 'Switch to Athlete View to browse as an everyday player'
                    : 'Switch to Admin Mode for moderation and approval tools'
                }
                aria-label={isAdminMode ? 'Switch to Athlete View' : 'Switch to Admin Mode'}
              >
                <span className="text-xs">{isAdminMode ? '👑' : '🏓'}</span>
                <span>{isAdminMode ? 'Admin Mode' : 'Athlete View'}</span>
              </button>
            )}

            {isAuthenticated ? (
              <ProfileSettingsMenu />
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  onMouseEnter={() => prefetchRoute('/login')}
                  className="px-5 py-2 text-xs font-bold tracking-[0.15em] uppercase transition-all hover:brightness-110"
                  style={{
                    color: 'var(--nav-text)',
                    border: '1px solid var(--nav-accent)',
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                  }}
                >
                  LOGIN
                </Link>
                <Link
                  to="/register"
                  onMouseEnter={() => prefetchRoute('/register')}
                  className="px-5 py-2 text-xs font-bold tracking-[0.15em] uppercase transition-all hover:brightness-110 shadow-md"
                  style={{
                    backgroundColor: 'var(--nav-accent)',
                    color: 'var(--nav-logo-text)',
                  }}
                >
                  JOIN THE CLUB
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 focus:outline-none transition-colors"
            style={{ color: 'var(--nav-text)' }}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Drawer Menu with smooth animation */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-b px-6 py-6 animate-fade-in"
            style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
          >
            {/* Mobile Admin Perspective Switcher */}
            {isAdmin && (
              <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--nav-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--nav-text-muted)' }}>
                    Perspective
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      toggleAdminViewMode();
                      setMobileMenuOpen(false);
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 border ${
                      isAdminMode
                        ? 'bg-[#B08D57]/20 border-[#B08D57] text-[#FBF8ED]'
                        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    <span>{isAdminMode ? '👑 Admin Mode' : '🏓 Athlete View'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-bold tracking-[0.15em] py-2 border-b transition-colors flex items-center justify-between ${
                    isActive(link.path) ? 'font-bold' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    color: isActive(link.path) ? 'var(--nav-accent)' : 'var(--nav-text)',
                    borderColor: 'var(--nav-border)',
                  }}
                >
                  <span>{link.label}</span>
                  {link.badge > 0 && (
                    <span className="px-2 py-0.5 bg-[#ff3b3f] text-white text-[10px] font-mono rounded-full font-bold">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}

              {!isAuthenticated && (
                <div className="pt-4 flex flex-col gap-3">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 text-center text-xs font-bold tracking-[0.15em] uppercase transition-all"
                    style={{
                      color: 'var(--nav-text)',
                      border: '1px solid var(--nav-accent)',
                      backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    LOGIN
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 text-center text-xs font-bold tracking-[0.15em] uppercase transition-all shadow-md"
                    style={{
                      backgroundColor: 'var(--nav-accent)',
                      color: 'var(--nav-logo-text)',
                    }}
                  >
                    JOIN THE CLUB
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;
