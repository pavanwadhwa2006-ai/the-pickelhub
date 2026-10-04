/**
 * ShareRatingCardModal Component
 *
 * Generates an ultra-premium, high-resolution (1200x675) digital sports trading card
 * using HTML5 Canvas that players can download or share to Instagram, WhatsApp, and Twitter.
 * Features official Elo rating, tier badge, career W/L record, and verification watermark.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';

const ShareRatingCardModal = ({ isOpen, onClose, player }) => {
  const [cardImage, setCardImage] = useState(null);
  const [generating, setGenerating] = useState(true);
  const [shared, setShared] = useState(false);

  const drawCard = useCallback(async () => {
    if (!player) return;
    setGenerating(true);

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
    bgGrad.addColorStop(0, '#120e03');
    bgGrad.addColorStop(0.5, '#1e1708');
    bgGrad.addColorStop(1, '#0d0a02');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // 2. Ambient Glow Effects
    const glow1 = ctx.createRadialGradient(250, 200, 10, 250, 200, 450);
    glow1.addColorStop(0, 'rgba(255, 59, 63, 0.22)');
    glow1.addColorStop(1, 'rgba(255, 59, 63, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1200, 675);

    const glow2 = ctx.createRadialGradient(950, 450, 10, 950, 450, 400);
    glow2.addColorStop(0, 'rgba(237, 225, 201, 0.12)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1200, 675);

    // 3. Elegant Outer Border & Accent Corner Accents
    ctx.strokeStyle = '#3b3423';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, 1128, 603);

    ctx.strokeStyle = '#ff3b3f';
    ctx.lineWidth = 6;
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(36, 100);
    ctx.lineTo(36, 36);
    ctx.lineTo(100, 36);
    ctx.stroke();
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(1100, 36);
    ctx.lineTo(1164, 36);
    ctx.lineTo(1164, 100);
    ctx.stroke();
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(36, 575);
    ctx.lineTo(36, 639);
    ctx.lineTo(100, 639);
    ctx.stroke();
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(1100, 639);
    ctx.lineTo(1164, 639);
    ctx.lineTo(1164, 575);
    ctx.stroke();

    // 4. Header Bar
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#ff3b3f';
    ctx.letterSpacing = '4px';
    ctx.fillText('THE PICKLEHUB • VERIFIED ATHLETE CARD', 80, 90);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#9a8e7a';
    ctx.fillText(`ID: ${player.playerId || 'PH-MEMBER'}`, 980, 90);

    // Divider Line
    ctx.strokeStyle = '#2f2919';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 115);
    ctx.lineTo(1120, 115);
    ctx.stroke();

    // 5. Player Identity Section (Left Side)
    ctx.font = 'bold 52px "Playfair Display", serif';
    ctx.fillStyle = '#ede1c9';
    ctx.fillText(player.name || 'Pickle Athlete', 80, 205);

    // Category / Division Badge
    const category = player.category || 'Beginner';
    const isGodLevel = category.toLowerCase().includes('god');

    ctx.font = 'bold 16px sans-serif';
    const catUpper = category.toUpperCase();
    const catTextWidth = ctx.measureText(catUpper).width;
    const catBadgeWidth = Math.max(160, catTextWidth + 36);

    if (isGodLevel) {
      const goldGrad = ctx.createLinearGradient(80, 235, 80 + catBadgeWidth, 273);
      goldGrad.addColorStop(0, '#f59e0b');
      goldGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = goldGrad;
    } else {
      ctx.fillStyle = '#ff3b3f';
    }
    ctx.beginPath();
    ctx.roundRect(80, 235, catBadgeWidth, 38, 8);
    ctx.fill();

    ctx.fillStyle = isGodLevel ? '#1c1608' : '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(catUpper, 98, 260);

    // 6. Rating Showcase
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ad8885';
    ctx.fillText('OFFICIAL ELO RATING', 80, 340);

    // Fix: Draw 105px rating and measure width BEFORE changing font to 32px so Elo does NOT overlap
    const ratingStr = `${player.currentRating || 1000}`;
    ctx.font = 'bold 105px "Playfair Display", serif';
    ctx.fillStyle = '#ede1c9';
    ctx.fillText(ratingStr, 80, 445);
    const ratingWidth = ctx.measureText(ratingStr).width;

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = isGodLevel ? '#f59e0b' : '#ff3b3f';
    ctx.fillText('Elo', 80 + ratingWidth + 18, 445);

    // 7. Stats Trio (Wins / Win Rate / Peak)
    const statsY = 540;
    const wins = player.wins || 0;
    const matches = player.matchesPlayed || 0;
    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
    const peak = player.highestRating || player.currentRating || 1000;

    // Stat 1: Career Record
    ctx.font = '13px monospace';
    ctx.fillStyle = '#9a8e7a';
    ctx.fillText('CAREER RECORD', 80, statsY);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#ede1c9';
    ctx.fillText(`${wins}W – ${(player.losses || 0)}L`, 80, statsY + 34);

    // Stat 2: Win %
    ctx.font = '13px monospace';
    ctx.fillStyle = '#9a8e7a';
    ctx.fillText('WIN RATE', 300, statsY);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`${winRate}%`, 300, statsY + 34);

    // Stat 3: Career Peak
    ctx.font = '13px monospace';
    ctx.fillStyle = '#9a8e7a';
    ctx.fillText('CAREER PEAK', 480, statsY);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${peak} Elo`, 480, statsY + 34);

    // 8. Right Side: Verification QR Code & Official Seal
    try {
      const profileUrl = `${window.location.origin}/player/${player.playerId}`;
      const qrData = await QRCode.toDataURL(profileUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#140f02', light: '#ede1c9' },
      });

      const qrImg = new Image();
      qrImg.src = qrData;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
      });

      // QR Code container frame
      ctx.fillStyle = '#1c1608';
      ctx.strokeStyle = '#5d3f3d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(870, 160, 240, 240, 16);
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(qrImg, 880, 170, 220, 220);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#ad8885';
      ctx.fillText('SCAN TO VERIFY PROFILE', 890, 435);
    } catch {
      // Non-fatal QR fallback
    }

    // Bottom Watermark
    ctx.font = '13px monospace';
    ctx.fillStyle = '#7a705e';
    ctx.fillText('THE PICKLEHUB • OFFICIAL ELO RATINGS & CLUB LEAGUE ENGINE', 870, 590);

    const dataUrl = canvas.toDataURL('image/png');
    setCardImage(dataUrl);
    setGenerating(false);
  }, [player]);

  useEffect(() => {
    if (isOpen) {
      drawCard();
    }
  }, [isOpen, drawCard]);

  if (!isOpen || !player) return null;

  const handleDownload = () => {
    if (!cardImage) return;
    const a = document.createElement('a');
    a.href = cardImage;
    const cleanName = (player.name || 'player').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `${cleanName}_PickleHub_Card.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (!cardImage) return;
    try {
      // Check if Web Share API with files is supported
      const blob = await (await fetch(cardImage)).blob();
      const file = new File([blob], `${player.name}_rating_card.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${player.name}'s Official Pickleball Rating`,
          text: `Check out my verified ${player.currentRating} Elo rating on The PickleHub!`,
          files: [file],
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else if (navigator.share) {
        await navigator.share({
          title: `${player.name}'s Official Pickleball Rating`,
          text: `Check out my verified ${player.currentRating} Elo rating on The PickleHub: ${window.location.origin}/player/${player.playerId}`,
          url: `${window.location.origin}/player/${player.playerId}`,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        // Fallback to downloading
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl bg-[var(--color-bg-card)] border-2 border-[var(--color-accent-primary)] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle)] mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎴</span>
            <div>
              <div className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary)] uppercase font-mono">
                SHAREABLE ATHLETE CARD
              </div>
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary)]">
                Export Official Rating Card
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

        {/* Card Preview */}
        <div className="relative rounded-2xl overflow-hidden border border-[#3b3423] bg-[#120e03] shadow-inner mb-6 aspect-[1200/675] flex items-center justify-center">
          {generating ? (
            <div className="flex flex-col items-center gap-2 text-xs font-mono text-[#ad8885]">
              <span className="w-6 h-6 border-2 border-[#ff3b3f] border-t-transparent rounded-full animate-spin" />
              <span>Generating HD Athlete Card...</span>
            </div>
          ) : (
            <img
              src={cardImage}
              alt="Official Athlete Card Preview"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={generating}
            className="w-full sm:flex-1 py-3.5 px-6 bg-[#ff3b3f] hover:brightness-110 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#ff3b3f]/20 disabled:opacity-50"
          >
            <span>📱</span>
            <span>{shared ? 'Shared!' : 'Share to WhatsApp / Social'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={generating}
            className="w-full sm:w-auto py-3.5 px-6 bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>💾</span>
            <span>Download HD PNG</span>
          </button>
        </div>

        <p className="text-[11px] font-mono text-[var(--color-text-muted)] text-center mt-4">
          Card formatted at 1200×675 HD resolution — perfect for Instagram stories, WhatsApp status, or club messaging.
        </p>
      </motion.div>
    </div>,
    document.body
  );
};

export default ShareRatingCardModal;
