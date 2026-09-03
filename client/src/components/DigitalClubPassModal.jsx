/**
 * DigitalClubPassModal Component
 *
 * Displays a digital Club Member Pass with player identity, Elo rating,
 * tier badge, and a high-contrast scannable QR code.
 *
 * When another player scans this QR code courtside, it opens:
 * `/matches/submit?opponent=PH-XXXXX`
 * with this player pre-selected as the opponent!
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import TierBadge from './TierBadge';

const DigitalClubPassModal = ({ isOpen, onClose, player }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

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

  if (!isOpen || !player) return null;

  const challengeUrl = `${window.location.origin}/matches/submit?opponent=${player.playerId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(challengeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        className="w-full max-w-sm bg-[var(--color-bg-card,#1a1508)] border-2 border-[var(--color-accent-primary,#ff3b3f)] rounded-3xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[var(--color-accent-primary,#ff3b3f)] via-amber-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between pt-1 pb-4 border-b border-[var(--color-border-subtle,#3b3423)] mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏓</span>
            <div>
              <div className="text-[9px] font-bold tracking-[0.25em] text-[var(--color-accent-primary,#ff3b3f)] uppercase font-mono">
                OFFICIAL MEMBER PASS
              </div>
              <h3 className="font-['Playfair_Display'] text-base font-bold text-[var(--color-text-primary,#ede1c9)]">
                The PickleHub Pass
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] text-[var(--color-text-muted,#9a8e7a)] hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Member Profile Card */}
        <div className="p-4 bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#2f2919)] rounded-2xl flex items-center gap-3.5 mb-5 shadow-inner">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--color-accent-primary,#ff3b3f)]/20 border-2 border-[var(--color-accent-primary,#ff3b3f)]/40 flex items-center justify-center font-['Playfair_Display'] font-bold text-lg text-[var(--color-text-primary,#ede1c9)] shrink-0">
            {player.profilePhoto ? (
              <img src={player.profilePhoto} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              (player.name || 'P').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-['Playfair_Display'] font-bold text-base text-[var(--color-text-primary,#ede1c9)] truncate">
              {player.name}
            </div>
            <div className="text-xs font-mono font-bold text-[var(--color-accent-primary,#ff3b3f)]">
              {player.playerId}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono font-bold text-[var(--color-text-primary,#ede1c9)]">
                {player.currentRating} Elo
              </span>
              <TierBadge category={player.category} size="sm" />
            </div>
          </div>
        </div>

        {/* Scannable Challenge QR Code */}
        <div className="flex flex-col items-center justify-center p-5 bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#2f2919)] rounded-2xl mb-5 shadow-inner">
          {qrDataUrl ? (
            <div className="p-3 bg-[#ede1c9] rounded-xl shadow-lg border-2 border-[var(--color-border-strong,#5d3f3d)]">
              <img src={qrDataUrl} alt={`QR Code for ${player.name}`} className="w-48 h-48 block" />
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-[var(--color-text-muted,#9a8e7a)] font-mono">
              Generating pass...
            </div>
          )}
          <span className="text-[10px] font-mono text-[var(--color-text-muted,#ad8885)] mt-3 text-center">
            Scan courtside with any phone camera to initiate an instant match against this player.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 py-3 bg-[var(--color-bg-card-hover,#251f10)] hover:bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary,#ede1c9)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{copied ? '✓' : '🔗'}</span>
            <span>{copied ? 'Copied Link!' : 'Copy Challenge Link'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-[var(--color-accent-primary,#ff3b3f)] hover:brightness-110 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DigitalClubPassModal;
