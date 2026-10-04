/**
 * QRScannerModal Component — The PickleHub
 *
 * Professional courtside QR code scanner for mobile and desktop athletes.
 * Features:
 * 1. Live Mobile Camera Stream with autofocus & environment (rear) camera selection.
 * 2. Real-time QR decoding with instant haptic vibration and targeting viewfinder.
 * 3. File upload scanner fallback ("Scan from Photo / Screenshot") for blocked permissions.
 * 4. Manual Player ID fallback (PH-XXXXX).
 * 5. High-contrast theme compliance across Garden Light and Classic Dark.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';

const QR_READER_ID = 'picklehub-qr-scanner-view';

const QRScannerModal = ({ isOpen, onClose, onPlayerFound }) => {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'upload' | 'manual'
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState(null);
  const [scannedSuccess, setScannedSuccess] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isStoppingRef = useRef(false);

  // Helper to extract Player ID from scanned text or URL
  const extractPlayerId = (rawText) => {
    if (!rawText) return null;
    const clean = rawText.trim();

    // Check if it's a URL with opponent parameter
    const urlMatch = clean.match(/opponent=([^&#]+)/i);
    if (urlMatch) return urlMatch[1].toUpperCase();

    // Check if it contains a standard PH-XXXXX ID
    const idMatch = clean.match(/PH-\d{1,5}/i);
    if (idMatch) return idMatch[0].toUpperCase();

    return clean.toUpperCase();
  };

  // Resolve player profile from API
  const handleLookup = useCallback(async (rawInput) => {
    const targetId = extractPlayerId(rawInput);
    if (!targetId) {
      setError('Please provide a valid Player ID or scanned QR link.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/players/${targetId}`);
      if (res.data.success && res.data.data) {
        setScannedSuccess(true);

        // Haptic feedback on mobile devices
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([60, 40, 80]);
          } catch {
            // Ignore vibration error
          }
        }

        setTimeout(() => {
          onPlayerFound(res.data.data);
          onClose();
        }, 600);
      } else {
        setError(`No active club player found with ID "${targetId}".`);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Player "${targetId}" could not be verified.`);
    } finally {
      setLoading(false);
    }
  }, [onPlayerFound, onClose]);

  // Safely stop the camera scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      } finally {
        scannerRef.current = null;
        isStoppingRef.current = false;
        setCameraActive(false);
      }
    }
  }, []);

  // Initialize camera scanner when in camera mode
  useEffect(() => {
    if (!isOpen || activeMode !== 'camera') {
      stopScanner();
      return;
    }

    let isMounted = true;
    setCameraPermissionError(null);
    setError(null);

    const startCamera = async () => {
      // Delay slightly to ensure DOM element is rendered
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (!isMounted) return;

      const element = document.getElementById(QR_READER_ID);
      if (!element) return;

      try {
        const html5QrCode = new Html5Qrcode(QR_READER_ID);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' }, // Default to rear mobile camera
          config,
          (decodedText) => {
            // Successfully detected QR
            stopScanner();
            handleLookup(decodedText);
          },
          () => {
            // Frame parsing failure (ignorable while aiming camera)
          }
        );

        if (isMounted) {
          setCameraActive(true);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Camera initialization error:', err);
          setCameraPermissionError(
            err.message?.includes('Permission') || err.name === 'NotAllowedError'
              ? 'Camera permission denied. Enable camera access in your browser or upload a photo instead.'
              : 'Could not access mobile camera. Please use Photo Upload or type the Player ID.'
          );
          setCameraActive(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, activeMode, stopScanner, handleLookup]);

  // Handle uploaded image scan
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const html5QrCode = new Html5Qrcode('picklehub-qr-file-dummy');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      await handleLookup(decodedText);
    } catch {
      setError('Could not detect a clear QR code in this photo. Try another image or enter Player ID manually.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleLookup(manualId);
  };

  const handleModalClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={handleModalClose} />

      {/* Hidden dummy element for file uploads */}
      <div id="picklehub-qr-file-dummy" className="hidden" />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-[var(--color-bg-card,#1a1508)] border-2 border-[var(--color-accent-primary,#ff3b3f)] rounded-3xl p-6 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle,#3b3423)] mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] flex items-center justify-center text-lg">
              📷
            </span>
            <div>
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary)]">
                Scan Opponent Pass
              </h3>
              <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
                Courtside Fast-Match Setup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs"
          >
            ✕
          </button>
        </div>

        {/* Scan Mode Switcher */}
        <div className="flex items-center p-1 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl mb-4 gap-1">
          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            style={
              activeMode === 'camera'
                ? { backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }
            }
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'camera'
                ? 'shadow-md ring-1 ring-black/10'
                : 'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
            }`}
          >
            <span>📹</span>
            <span style={{ color: activeMode === 'camera' ? '#FFFFFF' : 'inherit' }}>Live Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            style={
              activeMode === 'upload'
                ? { backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }
            }
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'upload'
                ? 'shadow-md ring-1 ring-black/10'
                : 'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
            }`}
          >
            <span>📁</span>
            <span style={{ color: activeMode === 'upload' ? '#FFFFFF' : 'inherit' }}>Upload Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            style={
              activeMode === 'manual'
                ? { backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }
            }
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'manual'
                ? 'shadow-md ring-1 ring-black/10'
                : 'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
            }`}
          >
            <span>⌨️</span>
            <span style={{ color: activeMode === 'manual' ? '#FFFFFF' : 'inherit' }}>Type ID</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Success Overlay */}
        <AnimatePresence>
          {scannedSuccess && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mb-4 p-3.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>✓ Athlete Verified! Locking Opponent...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. CAMERA VIEW */}
        {activeMode === 'camera' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black/90 border-2 border-dashed border-[var(--color-border-strong)] aspect-square flex flex-col items-center justify-center">
              {/* HTML5 QR Container */}
              <div id={QR_READER_ID} className="w-full h-full" />

              {/* Viewfinder Target Frame Overlay */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-[var(--color-accent-primary)] rounded-2xl relative shadow-[0_0_20px_rgba(255,59,63,0.3)]">
                    {/* Corner Accent Brackets */}
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-white" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-white" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-white" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-white" />

                    {/* Animated Scanning Beam */}
                    <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-accent-primary)] to-transparent animate-bounce shadow-sm" />
                  </div>
                </div>
              )}

              {/* Camera Loading / Permission Fallback */}
              {!cameraActive && !cameraPermissionError && (
                <div className="p-6 text-center text-xs text-white/80 space-y-2">
                  <span className="w-8 h-8 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin inline-block" />
                  <p className="font-mono">Initializing rear mobile camera...</p>
                </div>
              )}

              {cameraPermissionError && (
                <div className="p-6 text-center text-xs text-rose-300 space-y-3">
                  <span className="text-3xl block">🚫</span>
                  <p className="font-semibold text-rose-200">{cameraPermissionError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveMode('upload')}
                    style={{ backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }}
                    className="px-4 py-2 text-white font-bold rounded-xl text-xs uppercase shadow-sm cursor-pointer"
                  >
                    Upload QR Photo Instead →
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-center text-[var(--color-text-muted)] leading-relaxed">
              Align your opponent&apos;s Digital Club Pass QR code inside the frame to lock them in automatically.
            </p>
          </div>
        )}

        {/* 2. PHOTO UPLOAD VIEW */}
        {activeMode === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent-primary)] bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-card-hover)] rounded-2xl text-center cursor-pointer transition-all space-y-3 shadow-inner"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-primary)]/15 border border-[var(--color-accent-primary)]/30 text-[var(--color-accent-primary)] flex items-center justify-center text-3xl mx-auto shadow-xs">
                📸
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[var(--color-text-primary)]">
                  Choose Photo or Screenshot
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto">
                  Tap to select an image from your camera roll or screenshot gallery
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileScan}
                className="hidden"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                style={{ backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-bold rounded-xl uppercase shadow-md hover:brightness-110 cursor-pointer transition-all"
              >
                <span>📂</span>
                <span className="text-white font-bold">Select Photo</span>
              </button>
            </div>

            {loading && (
              <div className="p-3 text-center text-xs text-[var(--color-text-primary)] font-mono animate-pulse bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin inline-block" />
                <span>Analyzing QR code from image...</span>
              </div>
            )}
          </div>
        )}

        {/* 3. MANUAL PLAYER ID ENTRY */}
        {activeMode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">
                Opponent Player ID or Scanned Link
              </label>
              <input
                type="text"
                autoFocus
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="e.g. PH-00002"
                className="w-full px-4 py-3 bg-[var(--color-bg-base)] border border-[var(--color-border-strong)] focus:border-[var(--color-accent-primary)] rounded-xl text-sm font-mono text-[var(--color-text-primary)] focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                className="flex-1 py-3 bg-[var(--color-bg-card-hover)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-[var(--color-border-subtle)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !manualId.trim()}
                style={{ backgroundColor: 'var(--color-accent-primary)', color: '#FFFFFF' }}
                className="flex-1 py-3 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md hover:brightness-110"
              >
                {loading ? 'Verifying...' : 'Lock Opponent →'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default QRScannerModal;
