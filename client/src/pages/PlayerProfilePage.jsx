/**
 * PlayerProfilePage Component
 *
 * Public / shareable player profile page displaying Player ID (PH-XXXXX),
 * Elo rating, category badge, match statistics, and career metrics.
 * Enhanced with 3D tilt cards, animated number counters, and skeleton loading shimmer.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TiltCard from '../components/TiltCard';
import AnimatedNumber from '../components/AnimatedNumber';
import RevealOnScroll from '../components/RevealOnScroll';
import TierBadge from '../components/TierBadge';

const PlayerProfilePage = () => {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayer = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/players/${id}`);
        if (response.data.success) {
          setPlayer(response.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Player not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[75vh] max-w-[1440px] mx-auto py-12 px-6 sm:px-10 md:px-20 animate-fade-in">
        {/* Skeleton shimmer header */}
        <div className="p-8 sm:p-12 bg-[#251f10] border border-[#3b3423] mb-12 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 skeleton-shimmer shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="w-28 h-5 skeleton-shimmer" />
              <div className="w-64 h-10 skeleton-shimmer" />
              <div className="w-48 h-4 skeleton-shimmer" />
            </div>
            <div className="w-40 h-24 skeleton-shimmer" />
          </div>
        </div>

        {/* Skeleton stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-8 bg-[#251f10] border border-[#3b3423] h-36 skeleton-shimmer" />
          <div className="p-8 bg-[#251f10] border border-[#3b3423] h-36 skeleton-shimmer" />
          <div className="p-8 bg-[#251f10] border border-[#3b3423] h-36 skeleton-shimmer" />
          <div className="p-8 bg-[#251f10] border border-[#3b3423] h-36 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-6 bg-[#181305] text-center animate-fade-in">
        <div className="p-8 bg-[#251f10] border border-[#ff5451]/40 max-w-md w-full shadow-2xl">
          <span className="text-4xl font-mono font-bold text-[#ff3b3f] block mb-3">404</span>
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#ede1c9] mb-2">
            Player Profile Not Found
          </h2>
          <p className="text-xs text-[#9a8e7a] mb-6">
            {error || `No registered player found with identifier '${id}'.`}
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-wider uppercase inline-block shadow-[0_0_15px_rgba(255,59,63,0.3)] transition-all"
          >
            RETURN HOME
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1440px] mx-auto">
        {/* Breadcrumb Navigation with Hover Micro-Interactions */}
        <div className="flex items-center gap-2 text-xs text-[#9a8e7a] mb-8 uppercase tracking-widest font-bold">
          <Link to="/" className="hover:text-white transition-colors">
            HOME
          </Link>
          <span>/</span>
          <span className="text-[#ede1c9]">PLAYERS</span>
          <span>/</span>
          <span className="text-[#ff3b3f] font-mono">{player.playerId}</span>
        </div>

        {/* Player Profile Header Card */}
        <div className="p-8 sm:p-12 bg-[#251f10] border border-[#3b3423] mb-12 relative overflow-hidden shadow-xl animate-fade-in-up">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff3b3f]" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              {/* Profile Avatar / Initial with glow on hover */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-[#181305] border-2 border-[#5d3f3d] hover:border-[#ff3b3f] hover:shadow-[0_0_20px_rgba(255,59,63,0.4)] flex items-center justify-center text-3xl sm:text-4xl font-bold font-['Playfair_Display'] text-[#ff3b3f] shrink-0 transition-all duration-300">
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
                  <span className="text-[10px] font-bold tracking-[0.25em] text-[#ffb3ad] uppercase font-mono px-2 py-0.5 bg-[#181305] border border-[#3b3423]">
                    {player.playerId}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#4ade80] uppercase px-2 py-0.5 bg-[#181305] border border-[#3b3423]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-live-pulse" />
                    {player.accountStatus}
                  </span>
                </div>
                <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[#ede1c9]">
                  {player.name}
                </h1>
                <p className="text-xs text-[#9a8e7a] mt-1">
                  Official Member since {new Date(player.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Rating Highlight Pill */}
            <div className="p-6 bg-[#1a1508] border border-[#3b3423] hover:border-[#ff3b3f]/60 flex flex-col items-start md:items-end shrink-0 transition-colors shadow-lg">
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
          <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all hover-lift">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              MATCHES PLAYED
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              <AnimatedNumber value={player.matchesPlayed} duration={800} />
            </div>
            <span className="text-xs text-[#9a8e7a]">Total approved career games</span>
          </TiltCard>

          <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ad8885] transition-all hover-lift">
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

          <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ad8885] transition-all hover-lift">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              CURRENT WINNING STREAK
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              <AnimatedNumber value={player.winningStreak} duration={800} />
            </div>
            <span className="text-xs text-[#9a8e7a]">Consecutive victories</span>
          </TiltCard>

          <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ad8885] transition-all hover-lift">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              CAREER PEAK ELO
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              <AnimatedNumber value={player.highestRating} duration={800} />
            </div>
            <span className="text-xs text-[#9a8e7a]">All-time highest rating</span>
          </TiltCard>
        </div>

        {/* Match History & Activity Placeholder with Reveal */}
        <RevealOnScroll variant="fade-rise">
          <div className="p-8 bg-[#201b0c] border border-[#3b3423] text-center py-16">
            <span className="text-xs font-bold tracking-[0.25em] text-[#ff3b3f] uppercase block mb-2">
              OFFICIAL MATCH HISTORY
            </span>
            <h3 className="font-['Playfair_Display'] text-2xl font-bold text-[#ede1c9] mb-3">
              No Verified Matches Yet
            </h3>
            <p className="text-xs text-[#9a8e7a] max-w-md mx-auto">
              Once match submissions are approved by club administrators, verified game results and rating histories will appear here.
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </PageTransition>
  );
};

export default PlayerProfilePage;
