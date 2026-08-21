/**
 * PlayerProfilePage Component
 *
 * Public / shareable player profile page displaying Player ID (PH-XXXXX),
 * Elo rating, category badge, match statistics, and career metrics.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

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
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-[#181305]">
        <div className="w-10 h-10 border-2 border-[#3b3423] border-t-[#ff3b3f] animate-spin" />
        <span className="text-xs font-bold tracking-[0.2em] text-[#ad8885] uppercase">
          LOADING PLAYER PROFILE...
        </span>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-6 bg-[#181305] text-center">
        <div className="p-8 bg-[#251f10] border border-[#ff5451]/40 max-w-md w-full">
          <span className="text-4xl font-mono font-bold text-[#ff3b3f] block mb-3">404</span>
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#ede1c9] mb-2">
            Player Profile Not Found
          </h2>
          <p className="text-xs text-[#9a8e7a] mb-6">
            {error || `No registered player found with identifier '${id}'.`}
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-wider uppercase inline-block"
          >
            RETURN HOME
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1440px] mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#9a8e7a] mb-8 uppercase tracking-widest font-bold">
          <Link to="/" className="hover:text-[#ede1c9]">
            HOME
          </Link>
          <span>/</span>
          <span className="text-[#ede1c9]">PLAYERS</span>
          <span>/</span>
          <span className="text-[#ff3b3f] font-mono">{player.playerId}</span>
        </div>

        {/* Player Profile Header Card */}
        <div className="p-8 sm:p-12 bg-[#251f10] border border-[#3b3423] mb-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff3b3f]" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              {/* Profile Avatar / Initial */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#181305] border-2 border-[#5d3f3d] flex items-center justify-center text-3xl sm:text-4xl font-bold font-['Playfair_Display'] text-[#ff3b3f] shrink-0">
                {player.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-[#ffb3ad] uppercase font-mono px-2 py-0.5 bg-[#181305] border border-[#3b3423]">
                    {player.playerId}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-[#4ade80] uppercase px-2 py-0.5 bg-[#181305] border border-[#3b3423]">
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
            <div className="p-6 bg-[#1a1508] border border-[#3b3423] flex flex-col items-start md:items-end shrink-0">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
                OFFICIAL RATING
              </span>
              <div className="font-['Playfair_Display'] text-4xl sm:text-5xl font-bold text-[#ede1c9]">
                {player.currentRating}{' '}
                <span className="text-xs font-sans font-normal text-[#ffb3ad]">Elo</span>
              </div>
              <span className="mt-2 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-[#2f2919] text-[#ede1c9] border border-[#5d3f3d]">
                {player.category.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              MATCHES PLAYED
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              {player.matchesPlayed}
            </div>
            <span className="text-xs text-[#9a8e7a]">Total approved career games</span>
          </div>

          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              WIN RECORD
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              {player.wins}{' '}
              <span className="text-sm font-sans font-normal text-[#9a8e7a]">
                ({player.winPercentage}%)
              </span>
            </div>
            <span className="text-xs text-[#9a8e7a]">{player.losses} Losses recorded</span>
          </div>

          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              CURRENT WINNING STREAK
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              {player.winningStreak}
            </div>
            <span className="text-xs text-[#9a8e7a]">Consecutive victories</span>
          </div>

          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              CAREER PEAK ELO
            </span>
            <div className="font-['Playfair_Display'] text-4xl font-bold text-[#ede1c9] mb-2">
              {player.highestRating}
            </div>
            <span className="text-xs text-[#9a8e7a]">All-time highest rating</span>
          </div>
        </div>

        {/* Match History & Activity Placeholder */}
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
      </div>
    </div>
  );
};

export default PlayerProfilePage;
