/**
 * PlayerProfilePage Component
 *
 * Public / shareable player profile page displaying Player ID (PH-XXXXX),
 * Elo rating, category badge, match statistics, career metrics,
 * interactive Recharts Elo rating trajectory graph, and direct head-to-head comparison link.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TiltCard from '../components/TiltCard';
import AnimatedNumber from '../components/AnimatedNumber';
import RevealOnScroll from '../components/RevealOnScroll';
import TierBadge from '../components/TierBadge';
import RatingHistoryChart from '../components/RatingHistoryChart';
import DigitalClubPassModal from '../components/DigitalClubPassModal';
import QRCode from 'qrcode';

const PlayerProfilePage = () => {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClubPassModal, setShowClubPassModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let isCancelled = false;
    const fetchPlayerData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [playerRes, historyRes] = await Promise.allSettled([
          api.get(`/players/${id}`),
          api.get(`/players/${id}/rating-history`),
        ]);

        if (!isCancelled) {
          if (playerRes.status === 'fulfilled' && playerRes.value.data.success) {
            setPlayer(playerRes.value.data.data);
          } else {
            setError('Player not found.');
          }

          if (historyRes.status === 'fulfilled' && historyRes.value.data.success) {
            setRatingHistory(historyRes.value.data.data.history || []);
          }
        }
      } catch (err) {
        if (!isCancelled) setError(err.response?.data?.message || 'Player not found.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchPlayerData();
    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Generate scannable courtside challenge QR code URL
  useEffect(() => {
    if (!player?.playerId) return;

    const challengeUrl = `${window.location.origin}/matches/submit?opponent=${player.playerId}`;
    QRCode.toDataURL(challengeUrl, {
      width: 240,
      margin: 1.5,
      color: {
        dark: '#140f02',
        light: '#ede1c9',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate profile QR code:', err));
  }, [player?.playerId]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading player profile" className="min-h-[75vh] max-w-[1440px] mx-auto py-12 px-6 sm:px-10 md:px-20 animate-fade-in">
        {/* Skeleton shimmer header */}
        <div className="p-8 sm:p-12 bg-[#251f10] border border-[#3b3423] mb-12 relative overflow-hidden rounded-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 skeleton-shimmer shrink-0 rounded-2xl" />
            <div className="space-y-3 flex-1">
              <div className="w-28 h-5 skeleton-shimmer rounded" />
              <div className="w-64 h-10 skeleton-shimmer rounded" />
              <div className="w-48 h-4 skeleton-shimmer rounded" />
            </div>
            <div className="w-40 h-24 skeleton-shimmer rounded-2xl" />
          </div>
        </div>

        {/* Skeleton stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-8 bg-[#251f10] border border-[#3b3423] h-36 skeleton-shimmer rounded-2xl" />
          <div className="p-8 bg-[#251f10] border border-[#3b3423] h-36 skeleton-shimmer rounded-2xl" />
          <div className="p-8 bg-[#251f10] border border-[#3b3423] h-36 skeleton-shimmer rounded-2xl" />
          <div className="p-8 bg-[#251f10] border border-[#3b3423] h-36 skeleton-shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div role="alert" className="min-h-[75vh] max-w-[1440px] mx-auto py-24 px-6 text-center animate-fade-in">
        <div className="text-4xl mb-4" aria-hidden="true">🏓</div>
        <h2 className="font-['Playfair_Display'] text-3xl font-bold text-[#ede1c9] mb-2">
          Player Profile Not Found
        </h2>
        <p className="text-xs text-[#9a8e7a] max-w-md mx-auto mb-6">
          {error || `We couldn't locate an active club player profile matching "${id}".`}
        </p>
        <Link
          to="/leaderboard"
          className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-widest uppercase transition-all rounded-xl shadow-lg"
        >
          Return to Leaderboard
        </Link>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-[var(--color-bg-base,#181305)] text-[var(--color-text-primary,#ede1c9)] py-12 px-6 sm:px-10 md:px-20 transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            to="/leaderboard"
            className="text-xs font-bold tracking-wider text-[#ad8885] hover:text-[var(--color-text-primary,#ede1c9)] uppercase underline underline-offset-4 min-h-[44px] flex items-center"
          >
            ← LEADERBOARD DIRECTORY
          </Link>

          <Link
            to={`/compare?p2=${player.playerId}`}
            aria-label={`Compare ${player.name} head-to-head`}
            className="px-4 py-2 min-h-[44px] bg-[var(--color-bg-card,#251f10)] hover:bg-[var(--color-bg-card-hover,#352c16)] border border-[var(--color-accent-primary,#ff3b3f)]/50 text-[var(--color-text-primary,#ede1c9)] text-xs font-bold tracking-wider uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span aria-hidden="true">⚔️</span>
            <span>Head-to-Head Compare</span>
          </Link>
        </div>

        {/* Player Header Banner with Integrated QR Code */}
        <div className="p-8 sm:p-12 bg-[var(--color-bg-card,#251f10)] border border-[var(--color-border-subtle,#3b3423)] mb-12 relative overflow-hidden rounded-3xl shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Profile Avatar / Photo (Clickable to open QR Pass) */}
              <div
                onClick={() => setShowClubPassModal(true)}
                title="Click to view full digital pass & QR code"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#ff3b3f] text-white font-['Playfair_Display'] font-bold text-4xl flex items-center justify-center shrink-0 border-2 border-[var(--color-border-subtle,#3b3423)] hover:border-[#ff3b3f] shadow-lg cursor-pointer transition-all hover:scale-105"
              >
                {player.profilePhoto ? (
                  <img
                    src={player.profilePhoto}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  player.name.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-[#ffb3ad] uppercase font-mono px-2 py-0.5 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded">
                    {player.playerId}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#4ade80] uppercase px-2 py-0.5 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                    {player.accountStatus}
                  </span>
                </div>
                {/* Player Name — Clickable to open QR Pass */}
                <h1
                  onClick={() => setShowClubPassModal(true)}
                  title="Click to view full digital pass & QR code"
                  className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[var(--color-text-primary,#ede1c9)] hover:text-[#ff3b3f] cursor-pointer transition-colors flex items-center gap-3 group"
                >
                  <span>{player.name}</span>
                  <span className="text-base opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" title="View QR Pass">
                    🪪
                  </span>
                </h1>
                <p className="text-xs text-[var(--color-text-muted,#9a8e7a)] mt-1 font-mono">
                  Official Member since {new Date(player.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Right Side: QR Pass Card & Official Rating Card */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 w-full lg:w-auto">
              {/* Digital QR Member Pass */}
              <button
                type="button"
                onClick={() => setShowClubPassModal(true)}
                title="Click to view full digital pass & QR code"
                className="p-4 bg-[#1a1508] border border-[#3b3423] hover:border-[#ff3b3f] rounded-2xl flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.02] shadow-lg group text-left"
              >
                {qrDataUrl ? (
                  <div className="w-16 h-16 bg-[#ede1c9] p-1 rounded-xl overflow-hidden shadow shrink-0">
                    <img src={qrDataUrl} alt={`${player.name} QR Code`} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-[#251f10] rounded-xl flex items-center justify-center text-2xl shrink-0">
                    🪪
                  </div>
                )}
                <div>
                  <span className="text-[9px] font-bold tracking-[0.2em] text-[#ff3b3f] uppercase block font-mono">
                    DIGITAL PASS
                  </span>
                  <span className="text-xs font-bold text-[#ede1c9] group-hover:text-white flex items-center gap-1 mt-0.5">
                    <span>Scan QR Code</span>
                    <span className="text-[10px] text-[#ad8885]">↗</span>
                  </span>
                  <span className="text-[10px] text-[#9a8e7a] block mt-0.5">
                    Click to enlarge
                  </span>
                </div>
              </button>

              {/* Rating Highlight Pill */}
              <div className="p-5 bg-[#1a1508] border border-[#3b3423] hover:border-[#ff3b3f]/60 rounded-2xl flex flex-col items-start sm:items-end justify-center shrink-0 transition-colors shadow-lg">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
                  OFFICIAL RATING
                </span>
                <div className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[#ede1c9] flex items-baseline gap-2">
                  <AnimatedNumber value={player.currentRating} duration={1000} />
                  <span className="text-xs font-sans font-normal text-[#ffb3ad]">Elo</span>
                </div>
                <div className="mt-1.5">
                  <TierBadge category={player.category} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid with 3D Tilt Cards & Count-Ups */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all hover-lift rounded-2xl">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              MATCHES PLAYED
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              <AnimatedNumber value={player.matchesPlayed} duration={800} />
            </div>
            <span className="text-xs text-[#9a8e7a]">Total approved career games</span>
          </TiltCard>

          <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ad8885] transition-all hover-lift rounded-2xl">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              WIN RECORD
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2 flex items-baseline gap-2">
              <AnimatedNumber value={player.wins} duration={800} />
              <span className="text-sm font-sans font-normal text-[#9a8e7a]">
                ({player.winPercentage}%)
              </span>
            </div>
            <span className="text-xs text-[#9a8e7a]">{player.losses} Losses recorded</span>
          </TiltCard>

          <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ad8885] transition-all hover-lift rounded-2xl">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              CURRENT WINNING STREAK
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              <AnimatedNumber value={player.winningStreak} duration={800} />
            </div>
            <span className="text-xs text-[#9a8e7a]">Consecutive victories</span>
          </TiltCard>

          <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ad8885] transition-all hover-lift rounded-2xl">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              CAREER PEAK ELO
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              <AnimatedNumber value={player.highestRating} duration={800} />
            </div>
            <span className="text-xs text-[#9a8e7a]">All-time highest rating</span>
          </TiltCard>
        </div>

        {/* Historical Rating Trajectory Chart (Milestone 9) */}
        <RevealOnScroll variant="fade-rise">
          <RatingHistoryChart
            history={ratingHistory}
            currentRating={player.currentRating}
            className="mb-12"
          />
        </RevealOnScroll>
      </div>

      {/* Digital Club Pass Modal with QR Code */}
      <DigitalClubPassModal
        isOpen={showClubPassModal}
        onClose={() => setShowClubPassModal(false)}
        player={player}
      />
    </PageTransition>
  );
};

export default PlayerProfilePage;
