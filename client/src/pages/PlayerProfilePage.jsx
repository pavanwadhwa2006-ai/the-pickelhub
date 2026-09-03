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

const PlayerProfilePage = () => {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) {
    return (
      <div className="min-h-[75vh] max-w-[1440px] mx-auto py-12 px-6 sm:px-10 md:px-20 animate-fade-in">
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
      <div className="min-h-[75vh] max-w-[1440px] mx-auto py-24 px-6 text-center animate-fade-in">
        <div className="text-4xl mb-4">🏓</div>
        <h2 className="font-['Playfair_Display'] text-3xl font-bold text-[#ede1c9] mb-2">
          Player Profile Not Found
        </h2>
        <p className="text-xs text-[#9a8e7a] max-w-md mx-auto mb-6">
          {error || `We couldn't locate an active club player profile matching "${id}".`}
        </p>
        <Link
          to="/leaderboard"
          className="inline-block px-6 py-3 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-widest uppercase transition-all rounded-xl shadow-lg"
        >
          RETURN TO LEADERBOARD
        </Link>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20 transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            to="/leaderboard"
            className="text-xs font-bold tracking-wider text-[#ad8885] hover:text-[#ede1c9] uppercase underline underline-offset-4"
          >
            ← LEADERBOARD DIRECTORY
          </Link>

          <Link
            to={`/compare?p2=${player.playerId}`}
            className="px-4 py-2 bg-[var(--color-bg-card,#251f10)] hover:bg-[var(--color-bg-card-hover,#352c16)] border border-[var(--color-accent-primary,#ff3b3f)]/50 text-[var(--color-text-primary,#ede1c9)] text-xs font-bold tracking-wider uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>⚔️</span>
            <span>Head-to-Head Compare</span>
          </Link>
        </div>

        {/* Player Header Banner */}
        <div className="p-8 sm:p-12 bg-[#251f10] border border-[#3b3423] mb-12 relative overflow-hidden rounded-3xl shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Profile Avatar / Photo */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#ff3b3f] text-white font-['Playfair_Display'] font-bold text-4xl flex items-center justify-center shrink-0 border-2 border-[#3b3423] shadow-lg">
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
                  <span className="text-[10px] font-bold tracking-[0.25em] text-[#ffb3ad] uppercase font-mono px-2 py-0.5 bg-[#181305] border border-[#3b3423] rounded">
                    {player.playerId}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#4ade80] uppercase px-2 py-0.5 bg-[#181305] border border-[#3b3423] rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                    {player.accountStatus}
                  </span>
                </div>
                <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[#ede1c9]">
                  {player.name}
                </h1>
                <p className="text-xs text-[#9a8e7a] mt-1 font-mono">
                  Official Member since {new Date(player.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Rating Highlight Pill */}
            <div className="p-6 bg-[#1a1508] border border-[#3b3423] hover:border-[#ff3b3f]/60 rounded-2xl flex flex-col items-start md:items-end shrink-0 transition-colors shadow-lg">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
                OFFICIAL RATING
              </span>
              <div className="font-['Playfair_Display'] text-4xl sm:text-5xl font-bold text-[#ede1c9] flex items-baseline gap-2">
                <AnimatedNumber value={player.currentRating} duration={1000} />
                <span className="text-xs font-sans font-normal text-[#ffb3ad]">Elo</span>
              </div>
              <div className="mt-2">
                <TierBadge category={player.category} />
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
    </PageTransition>
  );
};

export default PlayerProfilePage;
