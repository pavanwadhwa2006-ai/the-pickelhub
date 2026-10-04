/**
 * DigitalClubPassModal Component
 *
 * Displays a digital Club Member Pass with player identity, Elo rating,
 * tier badge, and a high-contrast scannable QR code.
 *
 * Two tabs:
 * 1. "My Pass" — Share your QR code courtside so opponents can scan it.
 * 2. "Scan & Challenge" — Scan an opponent's QR to start a match instantly.
 *
 * When another player scans this QR code courtside, it opens:
 * `/matches/submit?opponent=PH-XXXXX`
 * with this player pre-selected as the opponent!
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import TierBadge from './TierBadge';
import QRScannerModal from './QRScannerModal';

const DigitalClubPassModal = ({ isOpen, onClose, player }) => {
  const navigate = useNavigate();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('pass'); // 'pass' | 'scan'
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (!player?.playerId) return;

    // Direct challenge URL
    const challengeUrl = `${window.location.origin}/matches/submit?opponent=${player.playerId}`;

    QRCode.toDataURL(challengeUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#140f02',
        light: '#ede1c9',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to render QR Code:', err));
  }, [player]);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('pass');
      setShowScanner(false);
    }
  }, [isOpen]);

  if (!isOpen || !player) return null;

  const challengeUrl = `${window.location.origin}/matches/submit?opponent=${player.playerId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(challengeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScanResult = (scannedPlayer) => {
    setShowScanner(false);
    onClose();
    if (scannedPlayer?.playerId) {
      navigate(`/matches/submit?opponent=${scannedPlayer.playerId}`);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm bg-[var(--color-bg-card)] border-2 border-[var(--color-accent-primary)] rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[var(--color-accent-primary)] via-amber-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between pt-1 pb-4 border-b border-[var(--color-border-subtle)] mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏓</span>
            <div>
              <div className="text-[9px] font-bold tracking-[0.25em] text-[var(--color-accent-primary)] uppercase font-mono">
                OFFICIAL MEMBER PASS
              </div>
              <h3 className="font-['Playfair_Display'] text-base font-bold text-[var(--color-text-primary)]">
                The PickleHub Pass
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-rose-500 hover:text-white hover:border-rose-500 flex items-center justify-center font-bold text-sm cursor-pointer transition-all shadow-xs"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher: My Pass / Scan & Challenge */}
        <div className="flex gap-1 p-1 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('pass'); setShowScanner(false); }}
            style={
              activeTab === 'pass'
                ? { backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }
            }
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'pass'
                ? 'shadow-md ring-1 ring-black/10'
                : 'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
            }`}
          >
            <span>🪪</span>
            <span style={{ color: activeTab === 'pass' ? '#FFFFFF' : 'inherit' }}>My Pass</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('scan'); setShowScanner(true); }}
            style={
              activeTab === 'scan'
                ? { backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }
            }
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'scan'
                ? 'shadow-md ring-1 ring-black/10'
                : 'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
            }`}
          >
            <span>📷</span>
            <span style={{ color: activeTab === 'scan' ? '#FFFFFF' : 'inherit' }}>Scan & Challenge</span>
          </button>
        </div>

        {/* ==================== TAB 1: MY PASS ==================== */}
        {activeTab === 'pass' && (
          <div className="animate-fade-in">
            {/* Member Profile Card */}
            <div className="p-4 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-2xl flex items-center gap-3.5 mb-5 shadow-inner">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--color-accent-primary)]/20 border-2 border-[var(--color-accent-primary)]/40 flex items-center justify-center font-['Playfair_Display'] font-bold text-lg text-[var(--color-text-primary)] shrink-0">
                {player.profilePhoto ? (
                  <img src={player.profilePhoto} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  (player.name || 'P').slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-['Playfair_Display'] font-bold text-base text-[var(--color-text-primary)] truncate">
                  {player.name}
                </div>
                <div className="text-xs font-mono font-bold text-[var(--color-accent-primary)]">
                  {player.playerId}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono font-bold text-[var(--color-text-primary)]">
                    {player.currentRating} Elo
                  </span>
                  <TierBadge category={player.category} size="sm" />
                </div>
              </div>
            </div>

            {/* Scannable Challenge QR Code */}
            <div className="flex flex-col items-center justify-center p-5 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-2xl mb-5 shadow-inner">
              {qrDataUrl ? (
                <div className="p-3 bg-[#ede1c9] rounded-xl shadow-lg border-2 border-[var(--color-border-strong)]">
                  <img src={qrDataUrl} alt={`QR Code for ${player.name}`} className="w-48 h-48 block" />
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-[var(--color-text-muted)] font-mono">
                  Generating pass...
                </div>
              )}
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] mt-3 text-center leading-relaxed">
                Show this QR courtside — your opponent scans it with their phone camera to start a match instantly.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-3 bg-[var(--color-bg-card-hover)] hover:bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{copied ? '✓' : '🔗'}</span>
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('scan'); setShowScanner(true); }}
                className="flex-1 py-3 bg-[var(--color-accent-primary)] hover:brightness-110 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📷</span>
                <span>Scan Opponent</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: SCAN & CHALLENGE ==================== */}
        {activeTab === 'scan' && (
          <div className="animate-fade-in">
            {/* Inline instructions */}
            <div className="p-4 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-2xl mb-5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] flex items-center justify-center text-lg">📷</span>
                <div>
                  <div className="font-bold text-sm text-[var(--color-text-primary)]">Scan Opponent's Pass</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">Point your camera at their Digital Pass QR code</div>
                </div>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                Scan your opponent's PickleHub QR code courtside. Once scanned, you'll be taken directly to the match submission page with them pre-filled as your opponent.
              </p>
            </div>

            {/* Big Scan Button */}
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              style={{ backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }}
              className="w-full py-4 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:brightness-110 mb-3"
            >
              <span className="text-lg">📷</span>
              <span className="text-white font-bold">Open Camera Scanner</span>
            </button>

            {/* Quick back to pass */}
            <button
              type="button"
              onClick={() => { setActiveTab('pass'); setShowScanner(false); }}
              className="w-full py-2.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] uppercase tracking-wider transition-colors cursor-pointer"
            >
              ← Back to My Pass
            </button>
          </div>
        )}
      </motion.div>

      {/* QR Scanner Modal (launched as overlay from within Digital Pass) */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onPlayerFound={handleScanResult}
      />
    </div>,
    document.body
  );
};

export default DigitalClubPassModal;
