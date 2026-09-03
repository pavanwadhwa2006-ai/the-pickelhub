/**
 * QRScannerModal Component
 *
 * Courtside QR code scanner allowing players to challenge an opponent instantly
 * by scanning their Digital Club Pass QR or entering their unique Player ID (PH-XXXXX).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';

const QRScannerModal = ({ isOpen, onClose, onPlayerFound }) => {
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleLookup = async (idToLook) => {
    const clean = idToLook.trim().toUpperCase();
    if (!clean) {
      setError('Please provide a valid Player ID or scanned QR link.');
      return;
    }

    // Extract PH-XXXXX if a full URL was pasted/scanned
    let targetId = clean;
    const urlMatch = clean.match(/opponent=([^&]+)/i);
    if (urlMatch) {
      targetId = urlMatch[1].toUpperCase();
    } else {
      const idMatch = clean.match(/PH-\d{1,5}/i);
      if (idMatch) {
        targetId = idMatch[0].toUpperCase();
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/players/${targetId}`);
      if (res.data.success && res.data.data) {
        onPlayerFound(res.data.data);
        onClose();
      } else {
        setError(`No active player found with ID "${targetId}".`);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Player "${targetId}" not found.`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleLookup(manualId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-[var(--color-bg-card,#1a1508)] border-2 border-[var(--color-accent-primary,#ff3b3f)] rounded-2xl p-6 shadow-2xl relative"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle,#3b3423)] mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <h3 className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary,#ede1c9)]">
              Scan Opponent Pass
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted,#9a8e7a)] hover:text-white text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[var(--color-text-muted,#9a8e7a)] mb-4 leading-relaxed">
          Point at your opponent's Digital Club Pass QR code or type their Player ID to immediately lock them into the match.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* QR Scanner Target Frame */}
        <div className="relative aspect-video bg-black/40 border-2 border-dashed border-[var(--color-border-strong,#5d3f3d)] rounded-xl flex flex-col items-center justify-center p-4 mb-4 overflow-hidden">
          <div className="w-24 h-24 border-2 border-[var(--color-accent-primary,#ff3b3f)] rounded-lg relative flex items-center justify-center mb-2">
            <span className="text-3xl animate-pulse">🎯</span>
            <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--color-accent-primary,#ff3b3f)] animate-bounce" />
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-muted,#9a8e7a)] text-center">
            Scan via camera or paste QR text below
          </span>
        </div>

        {/* Manual ID Entry Form */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted,#9a8e7a)] block mb-1">
              Opponent Player ID or QR Link
            </label>
            <input
              type="text"
              autoFocus
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="e.g. PH-00002"
              className="w-full px-3.5 py-2.5 bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] focus:border-[var(--color-accent-primary,#ff3b3f)] rounded-xl text-xs font-mono text-[var(--color-text-primary,#ede1c9)] focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[var(--color-bg-card-hover,#251f10)] hover:bg-[var(--color-bg-card,#181305)] border border-[var(--color-border-subtle,#3b3423)] text-[var(--color-text-primary,#ede1c9)] text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[var(--color-accent-primary,#ff3b3f)] hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Finding...' : 'Lock Opponent'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default QRScannerModal;
