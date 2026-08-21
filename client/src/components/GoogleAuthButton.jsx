/**
 * GoogleAuthButton Component
 *
 * Provides official Google OAuth authentication supporting one-click login and registration.
 * Handles credential verification with backend POST /api/auth/google.
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/useAuth';

const GoogleAuthButton = ({ text = 'signin_with', onSuccessCustom, onErrorCustom }) => {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConfigured = Boolean(clientId && !clientId.includes('dummy'));

  const from = location.state?.from?.pathname || '/dashboard';

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setErrorMsg('No Google credential returned.');
      if (onErrorCustom) onErrorCustom('No Google credential returned.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const result = await googleLogin(credentialResponse.credential);
    setLoading(false);

    if (result.success) {
      if (onSuccessCustom) {
        onSuccessCustom(result);
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setErrorMsg(result.message);
      if (onErrorCustom) onErrorCustom(result.message);
    }
  };

  const handleGoogleError = () => {
    const message = 'Google sign-in was cancelled or encountered an error.';
    setErrorMsg(message);
    if (onErrorCustom) onErrorCustom(message);
  };

  const handleUnconfiguredClick = () => {
    setErrorMsg(
      'To enable live Google Sign-In, add your Google OAuth Client ID to client/.env as VITE_GOOGLE_CLIENT_ID.'
    );
  };

  return (
    <div className="w-full flex flex-col items-center gap-2">
      {errorMsg && (
        <div className="w-full p-3 bg-[#93000a]/20 border border-[#ff3b3f]/50 text-[#ffdad6] text-xs leading-relaxed animate-fade-in flex items-start justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-[#ffb4ab] hover:text-white font-bold text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="w-full py-3 px-4 bg-[#181305] border border-[#3b3423] text-xs font-bold tracking-wider text-[#ffb3ad] flex items-center justify-center gap-3">
          <div className="w-4 h-4 border-2 border-[#3b3423] border-t-[#ff3b3f] animate-spin rounded-full" />
          VERIFYING GOOGLE CREDENTIALS...
        </div>
      ) : isConfigured ? (
        <div className="w-full flex justify-center google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            size="large"
            text={text}
            shape="rectangular"
            width="380"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleUnconfiguredClick}
          className="w-full py-3 px-4 bg-[#181305] hover:bg-[#201b0c] border border-[#3b3423] hover:border-[#ad8885] text-[#ede1c9] hover:text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm group"
        >
          {/* Google G Logo SVG */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
            />
          </svg>
          <span className="tracking-[0.15em]">CONTINUE WITH GOOGLE</span>
        </button>
      )}
    </div>
  );
};

export default GoogleAuthButton;
