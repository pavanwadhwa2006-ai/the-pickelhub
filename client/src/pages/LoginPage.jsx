/**
 * LoginPage Component
 *
 * Cinematic Editorial login page with account lockout handling,
 * loading states, magnetic submit button, and ambient glow effects.
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import PageTransition from '../components/PageTransition';
import MagneticButton from '../components/MagneticButton';
import GoogleAuthButton from '../components/GoogleAuthButton';

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
    <PageTransition className="min-h-[calc(100vh-80px)] flex items-center justify-center py-16 px-6 sm:px-10 bg-[var(--color-bg-base)] relative overflow-hidden transition-colors duration-200">
      {/* Subtle ambient light pool */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-accent-primary)]/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-8 sm:p-10 shadow-2xl relative animate-fade-in-up hover:border-[var(--color-accent-primary)]/50 transition-colors rounded-2xl">
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-accent-primary)] rounded-t-2xl shadow-[0_0_8px_rgba(255,59,63,0.8)]" />

        <div className="mb-8">
          <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary)] uppercase block mb-2">
            MEMBER AUTHENTICATION
          </span>
          <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
            Sign In
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Enter your credentials to access your player rating and match history.
          </p>
        </div>

        {/* Error / Lockout Alert Banner */}
        {localError && (
          <div className="mb-6 p-4 bg-rose-950/20 border-l-4 border-[var(--color-accent-primary)] text-rose-300 text-xs leading-relaxed animate-fade-in shadow-sm rounded-r-lg">
            <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>⚠</span> Authentication Notice
            </div>
            {localError}
          </div>
        )}

        {/* Google OAuth Quick Sign-In */}
        <GoogleAuthButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          disabled={submitting}
          text="Sign in with Google"
        />

        <div className="flex items-center gap-4 my-6">
          <span className="h-[1px] flex-1 bg-[var(--color-border-subtle)]" />
          <span className="text-[10px] font-bold font-mono tracking-widest text-[var(--color-text-muted)] uppercase">
            OR WITH EMAIL
          </span>
          <span className="h-[1px] flex-1 bg-[var(--color-border-subtle)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] font-bold tracking-[0.15em] text-[var(--color-text-primary)] uppercase mb-2">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="athlete@picklehub.com"
              className="w-full px-4 py-3 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-sm focus:outline-none transition-colors duration-200 rounded-xl"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] font-bold tracking-[0.15em] text-[var(--color-text-primary)] uppercase">
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] tracking-wider uppercase text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
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
              className="w-full px-4 py-3 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-sm focus:outline-none transition-colors duration-200 rounded-xl"
            />
          </div>

          <MagneticButton
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[var(--color-accent-primary)] hover:brightness-110 text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)] disabled:opacity-50 rounded-xl"
          >
            {submitting ? 'AUTHENTICATING...' : 'ENTER THE ARENA →'}
          </MagneticButton>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--color-border-subtle)] text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            New to The PickleHub?{' '}
            <Link
              to="/register"
              className="text-[var(--color-accent-primary)] font-bold hover:underline ml-1"
            >
              Claim your Player Profile
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default LoginPage;
