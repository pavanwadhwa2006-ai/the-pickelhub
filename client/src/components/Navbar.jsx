/**
 * Navbar Component
 *
 * Cinematic Editorial navigation bar with sharp aesthetics,
 * animated underline hover states, brand micro-interactions,
 * role indicators, and mobile drawer transitions.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import ProfileSettingsMenu from './ProfileSettingsMenu';

const Navbar = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'HOME', path: '/' },
    { label: 'LEADERBOARD', path: '/leaderboard' },
    { label: 'TOURNAMENTS', path: '/tournaments' },
    ...(isAuthenticated ? [{ label: 'DASHBOARD', path: '/dashboard' }] : []),
    ...(isAdmin ? [{ label: 'ADMIN PANEL', path: '/admin' }] : []),
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className="navbar-header sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-200"
      style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 md:px-20 h-20 flex items-center justify-between">
        {/* Brand Logo with micro-interaction */}
        <Link
          to="/"
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
                className={`nav-link-animated py-2 text-xs font-bold tracking-[0.2em] transition-colors ${
                  active ? 'active' : ''
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop User Actions */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <ProfileSettingsMenu />
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
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
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-bold tracking-[0.15em] py-2 border-b transition-colors ${
                  isActive(link.path) ? 'font-bold' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  color: isActive(link.path) ? 'var(--nav-accent)' : 'var(--nav-text)',
                  borderColor: 'var(--nav-border)',
                }}
              >
                {link.label}
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
  );
};

export default Navbar;
