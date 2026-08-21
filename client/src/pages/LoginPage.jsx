/**
 * LoginPage Component
 *
 * Cinematic Editorial login page with account lockout handling,
 * loading states, and error alerts.
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setLocalError(result.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-16 px-6 sm:px-10 bg-[#181305]">
      <div className="w-full max-w-md bg-[#251f10] border border-[#3b3423] p-8 sm:p-10 shadow-2xl relative animate-fade-in-up">
        {/* Subtle accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff3b3f]" />

        <div className="mb-8">
          <span className="text-[10px] font-bold tracking-[0.25em] text-[#ffb3ad] uppercase block mb-2">
            MEMBER AUTHENTICATION
          </span>
          <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[#ede1c9]">
            Sign In
          </h1>
          <p className="text-xs text-[#9a8e7a] mt-2">
            Enter your credentials to access your player rating and match history.
          </p>
        </div>

        {/* Error / Lockout Alert Banner */}
        {localError && (
          <div className="mb-6 p-4 bg-[#93000a]/20 border-l-4 border-[#ff3b3f] text-[#ffdad6] text-xs leading-relaxed animate-fade-in">
            <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#ffb4ab]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Authentication Error
            </div>
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] font-bold tracking-[0.15em] text-[#ede1c9] uppercase mb-2">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="athlete@picklehub.com"
              className="w-full px-4 py-3 bg-[#181305] border border-[#3b3423] focus:border-[#ff3b3f] text-[#ede1c9] placeholder-[#5d3f3d] text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] font-bold tracking-[0.15em] text-[#ede1c9] uppercase">
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] tracking-wider uppercase text-[#ad8885] hover:text-[#ede1c9] transition-colors"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#181305] border border-[#3b3423] focus:border-[#ff3b3f] text-[#ede1c9] placeholder-[#5d3f3d] text-sm focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'AUTHENTICATING...' : 'ENTER THE ARENA →'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#3b3423] text-center">
          <p className="text-xs text-[#9a8e7a]">
            New to The PickleHub?{' '}
            <Link
              to="/register"
              className="text-[#ff3b3f] font-bold hover:underline ml-1"
            >
              Claim your Player Profile
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
