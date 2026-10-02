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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#120e03]/95 backdrop-blur-xl border-t border-[#3b3423] pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 px-3 shadow-[0_-4px_25px_rgba(0,0,0,0.6)]"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Leaderboard */}
        <Link
          to="/leaderboard"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/leaderboard')
              ? 'text-[#ff3b3f]'
              : 'text-[#9a8e7a] hover:text-[#ede1c9]'
          }`}
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
              ? 'text-[#ff3b3f]'
              : 'text-[#9a8e7a] hover:text-[#ede1c9]'
          }`}
        >
          <span className="text-lg leading-none">🏅</span>
          <span className="text-[10px] font-bold tracking-wider uppercase font-mono">
            Events
          </span>
        </Link>

        {/* 3. Center Action: Submit Match Score (Raised Glow Button) */}
        <Link
          to="/matches/submit"
          className={`flex flex-col items-center justify-center -mt-5 w-13 h-13 rounded-full bg-gradient-to-tr from-[#e02b2f] to-[#ff3b3f] text-white shadow-[0_0_18px_rgba(255,59,63,0.55)] border-2 border-[#120e03] active:scale-95 transition-all ${
            isActive('/matches/submit') ? 'ring-2 ring-[#ffb3ad]' : ''
          }`}
          title="Submit Match Scores"
        >
          <span className="text-xl leading-none font-bold">🏓</span>
        </Link>

        {/* 4. Dashboard / Login */}
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            isActive('/dashboard') || isActive('/login')
              ? 'text-[#ff3b3f]'
              : 'text-[#9a8e7a] hover:text-[#ede1c9]'
          }`}
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
                ? 'text-[#ff3b3f]'
                : 'text-[#fbbf24] hover:text-[#ff3b3f]'
            }`}
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
