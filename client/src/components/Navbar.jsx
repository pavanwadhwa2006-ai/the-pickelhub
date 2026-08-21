/**
 * Navbar Component
 *
 * Cinematic Editorial navigation bar with sharp aesthetics,
 * active state indicators, role badges, and mobile responsiveness.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'HOME', path: '/' },
    ...(isAuthenticated ? [{ label: 'DASHBOARD', path: '/dashboard' }] : []),
    ...(isAdmin ? [{ label: 'ADMIN PANEL', path: '/admin' }] : []),
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#181305]/95 backdrop-blur-md border-b border-[#3b3423]">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 md:px-20 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-8 h-8 bg-[#ff3b3f] flex items-center justify-center text-white font-bold text-lg font-mono">
            P
          </div>
          <div className="flex flex-col">
            <span className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold tracking-tight text-[#ede1c9] group-hover:text-white transition-colors">
              THE PICKLEHUB
            </span>
            <span className="text-[10px] tracking-[0.25em] text-[#ad8885] uppercase font-semibold">
              RATING & LEAGUE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative py-2 text-xs font-bold tracking-[0.2em] transition-colors ${
                  active ? 'text-[#ede1c9]' : 'text-[#9a8e7a] hover:text-[#ede1c9]'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#ff3b3f]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop User Actions */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-[#ede1c9]">
                  {user?.email}
                </span>
                <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 bg-[#251f10] border border-[#3b3423] text-[#ffb3ad] font-bold">
                  {user?.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-bold tracking-[0.15em] uppercase text-[#ede1c9] bg-[#251f10] hover:bg-[#3b3423] border border-[#3b3423] transition-all cursor-pointer"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2 text-xs font-bold tracking-[0.15em] uppercase text-[#ede1c9] hover:text-white border border-[#3b3423] hover:border-[#ad8885] bg-[#1a1508] transition-all"
              >
                LOGIN
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 text-xs font-bold tracking-[0.15em] uppercase text-white bg-[#ff3b3f] hover:bg-[#e02b2f] transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)]"
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
          className="md:hidden p-2 text-[#ede1c9] hover:text-white focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#181305] border-b border-[#3b3423] px-6 py-6 animate-fade-in">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-bold tracking-[0.15em] py-2 border-b border-[#251f10] ${
                  isActive(link.path) ? 'text-[#ff3b3f]' : 'text-[#ede1c9]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="pt-4 flex flex-col gap-3">
                <div className="text-xs text-[#9a8e7a]">
                  Logged in as <span className="text-[#ede1c9] font-bold">{user?.email}</span> ({user?.role})
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3 text-xs font-bold tracking-[0.15em] uppercase text-[#ede1c9] bg-[#251f10] border border-[#3b3423]"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <div className="pt-4 flex flex-col gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 text-center text-xs font-bold tracking-[0.15em] uppercase text-[#ede1c9] border border-[#3b3423] bg-[#1a1508]"
                >
                  LOGIN
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 text-center text-xs font-bold tracking-[0.15em] uppercase text-white bg-[#ff3b3f]"
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
