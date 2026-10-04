/**
 * MobileBottomNav Component
 *
 * Fixed bottom navigation bar for mobile devices (< 768px).
 * Gives courtside players and club admins a sleek, native app experience
 * with 1-thumb reachability for Rankings, Tournaments, Submit Match, and Admin Approvals.
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const MobileBottomNav = () => {
  const { isAuthenticated, isAdminMode } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl border-t pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 px-3 shadow-[0_-4px_25px_rgba(0,0,0,0.35)] transition-colors duration-200"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--nav-border)',
      }}
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Leaderboard */}
        <Link
          to="/leaderboard"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/leaderboard')
              ? 'font-bold'
              : 'hover:opacity-100 opacity-80'
          }`}
          style={{
            color: isActive('/leaderboard') ? 'var(--nav-accent)' : 'var(--nav-text-muted)',
          }}
        >
          <span className="text-lg leading-none">🏆</span>
          <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
            Ranks
          </span>
        </Link>

        {/* 2. Tournaments */}
        <Link
          to="/tournaments"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/tournaments')
              ? 'font-bold'
              : 'hover:opacity-100 opacity-80'
          }`}
          style={{
            color: isActive('/tournaments') ? 'var(--nav-accent)' : 'var(--nav-text-muted)',
          }}
        >
          <span className="text-lg leading-none">🏅</span>
          <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
            Events
          </span>
        </Link>

        {/* 3. Center Action: Submit Match Score (Raised Glow Button) */}
        <Link
          to="/matches/submit"
          className={`flex flex-col items-center justify-center -mt-5 w-13 h-13 rounded-full text-white shadow-xl active:scale-95 transition-all ${
            isActive('/matches/submit') ? 'ring-2 ring-[var(--nav-accent)]' : ''
          }`}
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            borderColor: 'var(--nav-bg)',
            borderWidth: '2px',
            boxShadow: '0 0 18px var(--glow-shadow)',
          }}
          title="Submit Match Scores"
        >
          <span className="text-xl leading-none font-bold">🏓</span>
        </Link>

        {/* 4. Dashboard / Login */}
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/dashboard') || isActive('/login')
              ? 'font-bold'
              : 'hover:opacity-100 opacity-80'
          }`}
          style={{
            color: (isActive('/dashboard') || isActive('/login')) ? 'var(--nav-accent)' : 'var(--nav-text-muted)',
          }}
        >
          <span className="text-lg leading-none">👤</span>
          <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
            {isAuthenticated ? 'Profile' : 'Sign In'}
          </span>
        </Link>

        {/* 5. Admin Mode Shortcut (Only visible if Admin) */}
        {isAdminMode && (
          <Link
            to="/admin"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl relative transition-all ${
              isActive('/admin')
                ? 'font-bold'
                : 'hover:opacity-100 opacity-80'
            }`}
            style={{
              color: isActive('/admin') ? 'var(--nav-accent)' : '#F59E0B',
            }}
          >
            <span className="text-lg leading-none">🛡️</span>
            <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
              Admin
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
