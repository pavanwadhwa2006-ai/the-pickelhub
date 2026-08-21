/**
 * RegisterPage Component
 *
 * Cinematic Editorial registration form with validation,
 * role selector, and starting Elo 1000 badge.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('PLAYER');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim() || !email || !password || !confirmPassword) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    const result = await register(email, password, role, name.trim());
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setLocalError(result.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-16 px-6 sm:px-10 bg-[#181305]">
      <div className="w-full max-w-md bg-[#251f10] border border-[#3b3423] p-8 sm:p-10 shadow-2xl relative animate-fade-in-up">
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff3b3f]" />

        <div className="mb-8">
          <span className="text-[10px] font-bold tracking-[0.25em] text-[#ffb3ad] uppercase block mb-2">
            JOIN THE ECOSYSTEM
          </span>
          <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[#ede1c9]">
            Register Profile
          </h1>
          <p className="text-xs text-[#9a8e7a] mt-2">
            Create your account to start tracking matches and receiving official Elo ratings.
          </p>
        </div>

        {/* Starting Elo Pill */}
        <div className="mb-6 p-3 bg-[#1a1508] border border-[#3b3423] flex items-center justify-between">
          <div className="text-[11px] font-bold tracking-wider text-[#d8cdb5] uppercase">
            Initial Rating Base
          </div>
          <div className="text-xs font-bold font-mono px-2 py-0.5 bg-[#2f2919] text-[#ffb3ad] border border-[#5d3f3d]">
            1000 Elo
          </div>
        </div>

        {/* Error Alert */}
        {localError && (
          <div className="mb-6 p-4 bg-[#93000a]/20 border-l-4 border-[#ff3b3f] text-[#ffdad6] text-xs leading-relaxed animate-fade-in">
            <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#ffb4ab]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Registration Error
            </div>
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold tracking-[0.15em] text-[#ede1c9] uppercase mb-2">
              FULL NAME / ATHLETE HANDLE
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-4 py-3 bg-[#181305] border border-[#3b3423] focus:border-[#ff3b3f] text-[#ede1c9] placeholder-[#5d3f3d] text-sm focus:outline-none transition-colors"
            />
          </div>

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
            <label className="block text-[11px] font-bold tracking-[0.15em] text-[#ede1c9] uppercase mb-2">
              PASSWORD (MIN. 6 CHARACTERS)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#181305] border border-[#3b3423] focus:border-[#ff3b3f] text-[#ede1c9] placeholder-[#5d3f3d] text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-[0.15em] text-[#ede1c9] uppercase mb-2">
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#181305] border border-[#3b3423] focus:border-[#ff3b3f] text-[#ede1c9] placeholder-[#5d3f3d] text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-[0.15em] text-[#ede1c9] uppercase mb-2">
              ACCOUNT ROLE
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('PLAYER')}
                className={`py-2.5 px-3 text-xs font-bold tracking-wider uppercase border text-center transition-all ${
                  role === 'PLAYER'
                    ? 'bg-[#ff3b3f] text-white border-[#ff3b3f]'
                    : 'bg-[#181305] text-[#9a8e7a] border-[#3b3423] hover:text-[#ede1c9]'
                }`}
              >
                PLAYER
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`py-2.5 px-3 text-xs font-bold tracking-wider uppercase border text-center transition-all ${
                  role === 'ADMIN'
                    ? 'bg-[#ff3b3f] text-white border-[#ff3b3f]'
                    : 'bg-[#181305] text-[#9a8e7a] border-[#3b3423] hover:text-[#ede1c9]'
                }`}
              >
                CLUB ADMIN
              </button>
            </div>
            <p className="text-[10px] text-[#9a8e7a] mt-1.5">
              Admins can manage the verification queue and direct match entries.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'CREATING PROFILE...' : 'CLAIM RATING PROFILE →'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#3b3423] text-center">
          <p className="text-xs text-[#9a8e7a]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#ff3b3f] font-bold hover:underline ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
