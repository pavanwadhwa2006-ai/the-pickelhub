/**
 * LeaderboardPage Component
 *
 * Live, interactive, and filterable Official Club Leaderboard per PRD Section 8.
 * Features specialty leader showcase blocks (Highest Rated, Most Wins, Top Win %, Longest Streak),
 * dynamic skill category filtering, multi-sort controls, live search, and head-to-head compare engine.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TiltCard from '../components/TiltCard';
import AnimatedNumber from '../components/AnimatedNumber';

const LeaderboardPage = () => {
  // Leaderboard Data State
  const [players, setPlayers] = useState([]);
  const [specialties, setSpecialties] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Sorting
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState('rating');
  const [search, setSearch] = useState('');

  // Head-to-Head Comparison State
  const [compareP1, setCompareP1] = useState(null);
  const [compareP2, setCompareP2] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSpecialties = async () => {
      try {
        const res = await api.get('/players/leaders');
        if (isMounted && res.data.success) {
          setSpecialties(res.data.data);
        }
      } catch {
        // Non-fatal fallback
      }
    };
    fetchSpecialties();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Leaderboard Standings
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category && category !== 'ALL') params.append('category', category);
      if (sort) params.append('sort', sort);
      if (search.trim()) params.append('q', search.trim());
      params.append('limit', '50');

      const res = await api.get(`/players?${params.toString()}`);
      if (res.data.success) {
        setPlayers(res.data.data || []);
        setTotalCount(res.data.total || 0);
      }
    } catch {
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [category, sort, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeaderboard();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchLeaderboard]);

  // Execute Head-to-Head Comparison
  const handleOpenCompare = async (p1, p2 = null) => {
    setCompareP1(p1);
    setCompareP2(p2);
    setCompareModalOpen(true);

    if (p1 && p2) {
      setLoadingCompare(true);
      try {
        const res = await api.get(`/players/compare?p1=${p1.playerId}&p2=${p2.playerId}`);
        if (res.data.success) {
          setCompareData(res.data.data);
        }
      } catch {
        setCompareData(null);
      } finally {
        setLoadingCompare(false);
      }
    } else {
      setCompareData(null);
    }
  };

  const selectCompareSecondPlayer = async (p2) => {
    setCompareP2(p2);
    if (compareP1 && p2) {
      setLoadingCompare(true);
      try {
        const res = await api.get(`/players/compare?p1=${compareP1.playerId}&p2=${p2.playerId}`);
        if (res.data.success) {
          setCompareData(res.data.data);
        }
      } catch {
        setCompareData(null);
      } finally {
        setLoadingCompare(false);
      }
    }
  };

  const categories = [
    { label: 'ALL DIVISIONS', value: 'ALL' },
    { label: 'PRO (1400+)', value: 'pro' },
    { label: 'ADV. INTERMEDIATE (1200-1399)', value: 'advanced_intermediate' },
    { label: 'INTERMEDIATE (1000-1199)', value: 'intermediate' },
    { label: 'BEGINNER (0-999)', value: 'beginner' },
  ];

  return (
    <PageTransition className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="pb-8 border-b border-[#3b3423] mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase">
                LIVE STANDINGS & RATINGS
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#251f10] border border-[#ff3b3f]/40 text-[#ffb3ad] text-[10px] font-bold tracking-wider uppercase font-mono">
                <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-live-pulse" />
                {totalCount} ACTIVE PLAYERS
              </span>
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[#ede1c9]">
              Official Club Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-[#9a8e7a] mt-2 max-w-2xl leading-relaxed">
              Real-time club standings calculated using verified match results and our weighted Elo engine. Select any player to view head-to-head win probabilities.
            </p>
          </div>

          <Link
            to="/matches/submit"
            className="px-6 py-3 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.15em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)] hover:shadow-[0_0_22px_rgba(255,59,63,0.5)] self-start md:self-auto"
          >
            + SUBMIT MATCH SCORE
          </Link>
        </div>

        {/* 4 Specialty Leader Showcase Blocks (PRD Section 8.2) */}
        {specialties && (
          <div className="mb-12">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-4">
              SPECIALTY DIVISION LEADERS
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 1. Highest Rated */}
              <TiltCard className="p-6 bg-[#251f10] border-2 border-[#ff3b3f]/70 shadow-[0_0_20px_rgba(255,59,63,0.15)] hover-lift">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#ffb3ad] uppercase">
                    👑 HIGHEST RATED
                  </span>
                  <span className="w-2 h-2 bg-[#ff3b3f] rounded-full animate-ping" />
                </div>
                <div className="font-['Playfair_Display'] text-3xl font-bold text-[#ede1c9] mb-1">
                  <AnimatedNumber value={specialties.highestRated?.currentRating || 1000} duration={800} />
                  <span className="text-xs font-sans text-[#ffb3ad] ml-1">Elo</span>
                </div>
                <div className="font-bold text-sm text-[#ede1c9] truncate">
                  {specialties.highestRated?.name || 'Unclaimed'}
                </div>
                <div className="text-[10px] text-[#ad8885] font-mono mt-0.5">
                  {specialties.highestRated?.playerId} • Tier: {specialties.highestRated?.category?.toUpperCase()}
                </div>
              </TiltCard>

              {/* 2. Most Wins */}
              <TiltCard className="p-6 bg-[#201b0c] border border-[#5d3f3d] hover:border-[#ad8885] hover-lift">
                <div className="text-[10px] font-bold tracking-widest text-[#ad8885] uppercase mb-2">
                  🏆 MOST WINS
                </div>
                <div className="font-['Playfair_Display'] text-3xl font-bold text-[#ede1c9] mb-1">
                  <AnimatedNumber value={specialties.mostWins?.wins || 0} duration={800} />
                  <span className="text-xs font-sans text-[#9a8e7a] ml-1">Wins</span>
                </div>
                <div className="font-bold text-sm text-[#ede1c9] truncate">
                  {specialties.mostWins?.name || 'Unclaimed'}
                </div>
                <div className="text-[10px] text-[#ad8885] font-mono mt-0.5">
                  {specialties.mostWins?.matchesPlayed || 0} Matches ({specialties.mostWins?.winPercentage || 0}%)
                </div>
              </TiltCard>

              {/* 3. Top Win % (min 5 matches) */}
              <TiltCard className="p-6 bg-[#201b0c] border border-[#3b3423] hover:border-[#ad8885] hover-lift">
                <div className="text-[10px] font-bold tracking-widest text-[#ad8885] uppercase mb-2">
                  🎯 TOP WIN RATE (MIN 5)
                </div>
                <div className="font-['Playfair_Display'] text-3xl font-bold text-[#ede1c9] mb-1">
                  <AnimatedNumber value={specialties.highestWinRate?.winPercentage || 0} duration={800} />
                  <span className="text-xs font-sans text-[#9a8e7a] ml-1">%</span>
                </div>
                <div className="font-bold text-sm text-[#ede1c9] truncate">
                  {specialties.highestWinRate?.name || 'Pending 5 Matches'}
                </div>
                <div className="text-[10px] text-[#ad8885] font-mono mt-0.5">
                  {specialties.highestWinRate ? `${specialties.highestWinRate.wins}W - ${specialties.highestWinRate.losses}L` : 'Requires 5+ games'}
                </div>
              </TiltCard>

              {/* 4. Longest Winning Streak */}
              <TiltCard className="p-6 bg-[#201b0c] border border-[#3b3423] hover:border-[#ad8885] hover-lift">
                <div className="text-[10px] font-bold tracking-widest text-[#ad8885] uppercase mb-2">
                  🔥 ACTIVE STREAK
                </div>
                <div className="font-['Playfair_Display'] text-3xl font-bold text-[#ede1c9] mb-1">
                  <AnimatedNumber value={specialties.longestStreak?.winningStreak || 0} duration={800} />
                  <span className="text-xs font-sans text-[#9a8e7a] ml-1">Matches</span>
                </div>
                <div className="font-bold text-sm text-[#ede1c9] truncate">
                  {specialties.longestStreak?.name || 'Unclaimed'}
                </div>
                <div className="text-[10px] text-[#ad8885] font-mono mt-0.5">
                  {specialties.longestStreak?.playerId} • Current Streak
                </div>
              </TiltCard>
            </div>
          </div>
        )}

        {/* Filters, Search & Sort Control Bar */}
        <div className="p-6 bg-[#201b0c] border border-[#3b3423] mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                  category === cat.value
                    ? 'bg-[#ff3b3f] text-white border-[#ff3b3f] shadow-[0_0_12px_rgba(255,59,63,0.3)]'
                    : 'bg-[#181305] text-[#9a8e7a] border-[#3b3423] hover:border-[#ad8885] hover:text-[#ede1c9]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Dropdowns */}
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or PH-ID..."
              className="px-3.5 py-1.5 bg-[#181305] border border-[#3b3423] focus:border-[#ff3b3f] text-xs text-[#ede1c9] focus:outline-none w-56"
            />

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#ad8885] uppercase font-mono">Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-1.5 bg-[#181305] border border-[#3b3423] text-xs text-[#ede1c9] focus:outline-none cursor-pointer"
              >
                <option value="rating">Rating (Highest)</option>
                <option value="wins">Total Wins</option>
                <option value="winRate">Win Rate %</option>
                <option value="streak">Active Streak</option>
                <option value="matches">Matches Played</option>
              </select>
            </div>
          </div>
        </div>

        {/* Standings Table */}
        <div className="bg-[#201b0c] border border-[#3b3423] overflow-x-auto shadow-2xl mb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#3b3423] bg-[#181305] text-[10px] font-bold font-mono tracking-[0.2em] text-[#ad8885] uppercase">
                <th className="py-4 px-6">RANK</th>
                <th className="py-4 px-6">ATHLETE</th>
                <th className="py-4 px-6">TIER DIVISION</th>
                <th className="py-4 px-6 text-right">ELO RATING</th>
                <th className="py-4 px-6 text-center">W - L (PCT)</th>
                <th className="py-4 px-6 text-center">STREAK</th>
                <th className="py-4 px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2f2919]">
              {loading ? (
                // Shimmer Skeleton Loader
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-5 px-6"><div className="w-6 h-4 bg-[#251f10] rounded" /></td>
                    <td className="py-5 px-6"><div className="w-36 h-4 bg-[#251f10] rounded" /></td>
                    <td className="py-5 px-6"><div className="w-24 h-4 bg-[#251f10] rounded" /></td>
                    <td className="py-5 px-6"><div className="w-16 h-4 bg-[#251f10] rounded ml-auto" /></td>
                    <td className="py-5 px-6"><div className="w-20 h-4 bg-[#251f10] rounded mx-auto" /></td>
                    <td className="py-5 px-6"><div className="w-10 h-4 bg-[#251f10] rounded mx-auto" /></td>
                    <td className="py-5 px-6"><div className="w-24 h-4 bg-[#251f10] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : players.length > 0 ? (
                players.map((p, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  const rankBadge =
                    rank === 1
                      ? '🥇 #1'
                      : rank === 2
                      ? '🥈 #2'
                      : rank === 3
                      ? '🥉 #3'
                      : `#${rank}`;

                  return (
                    <tr
                      key={p.playerId}
                      className="hover:bg-[#251f10]/80 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-4 px-6 font-mono font-bold text-xs">
                        <span
                          className={`${
                            isTop3
                              ? 'text-[#ff3b3f] font-bold text-sm'
                              : 'text-[#9a8e7a]'
                          }`}
                        >
                          {rankBadge}
                        </span>
                      </td>

                      {/* Athlete Identity */}
                      <td className="py-4 px-6">
                        <Link
                          to={`/players/${p.playerId}`}
                          className="font-bold text-sm text-[#ede1c9] group-hover:text-[#ffb3ad] transition-colors block"
                        >
                          {p.name}
                        </Link>
                        <span className="text-[10px] text-[#ad8885] font-mono">
                          {p.playerId}
                        </span>
                      </td>

                      {/* Tier Division */}
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-[#181305] border border-[#3b3423] text-[10px] font-bold tracking-wider uppercase text-[#ffdad6]">
                          {p.category?.toUpperCase() || 'INTERMEDIATE'}
                        </span>
                      </td>

                      {/* Elo Rating */}
                      <td className="py-4 px-6 text-right font-mono font-bold text-base text-[#ede1c9]">
                        <span className="text-[#ff3b3f] mr-1">✦</span>
                        {p.currentRating}
                      </td>

                      {/* W - L Record */}
                      <td className="py-4 px-6 text-center text-xs">
                        <span className="text-[#ede1c9] font-mono font-bold">
                          {p.wins}W - {p.losses}L
                        </span>
                        <span className="text-[#9a8e7a] text-[11px] ml-1.5">
                          ({p.winPercentage || 0}%)
                        </span>
                      </td>

                      {/* Streak */}
                      <td className="py-4 px-6 text-center font-mono text-xs">
                        {p.winningStreak > 0 ? (
                          <span className="px-2 py-0.5 bg-[#4ade80]/10 border border-[#4ade80]/40 text-[#4ade80] font-bold">
                            {p.winningStreak}W 🔥
                          </span>
                        ) : (
                          <span className="text-[#9a8e7a]">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCompare(p)}
                            className="px-2.5 py-1 bg-[#181305] hover:bg-[#3b3423] border border-[#5d3f3d] hover:border-[#ff3b3f] text-[10px] font-bold text-[#ffb3ad] uppercase transition-colors cursor-pointer"
                          >
                            COMPARE ⚔️
                          </button>
                          <Link
                            to={`/players/${p.playerId}`}
                            className="px-2.5 py-1 bg-[#251f10] hover:bg-[#ff3b3f] text-[#ede1c9] hover:text-white border border-[#3b3423] text-[10px] font-bold uppercase transition-colors"
                          >
                            PROFILE →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#9a8e7a]">
                    No players found matching the selected division or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Head-to-Head Comparison Drawer / Modal (PRD Section 11.2) */}
        {compareModalOpen && compareP1 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-2xl bg-[#1f190a] border-2 border-[#ff3b3f] p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase block mb-1">
                    HEAD-TO-HEAD MATCHUP ENGINE
                  </span>
                  <h3 className="font-['Playfair_Display'] text-2xl font-bold text-[#ede1c9]">
                    Head-to-Head Comparison
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCompareModalOpen(false);
                    setCompareData(null);
                  }}
                  className="text-xs text-[#ad8885] hover:text-white font-bold p-1 cursor-pointer"
                >
                  ✕ CLOSE
                </button>
              </div>

              {/* Player 1 Selection Header */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-[#181305] border border-[#ff3b3f]/60">
                  <span className="text-[9px] font-bold text-[#ffb3ad] uppercase block mb-1">
                    PLAYER 1
                  </span>
                  <div className="font-bold text-sm text-[#ede1c9] truncate">{compareP1.name}</div>
                  <div className="text-xs font-mono text-[#ff3b3f] font-bold mt-1">
                    {compareP1.currentRating} Elo
                  </div>
                </div>

                <div className="p-4 bg-[#181305] border border-[#3b3423]">
                  <span className="text-[9px] font-bold text-[#ad8885] uppercase block mb-1">
                    PLAYER 2
                  </span>
                  {compareP2 ? (
                    <div>
                      <div className="font-bold text-sm text-[#ede1c9] truncate">{compareP2.name}</div>
                      <div className="text-xs font-mono text-[#ff3b3f] font-bold mt-1">
                        {compareP2.currentRating} Elo
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#9a8e7a]">Select an opponent below</div>
                  )}
                </div>
              </div>

              {/* If no Player 2 selected, show quick picker list */}
              {!compareP2 && (
                <div className="mb-6">
                  <label className="text-xs font-bold text-[#d8cdb5] uppercase block mb-2">
                    Select Second Player to Compare:
                  </label>
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#2f2919] border border-[#3b3423]">
                    {players
                      .filter((p) => p.playerId !== compareP1.playerId)
                      .map((p) => (
                        <button
                          key={p.playerId}
                          type="button"
                          onClick={() => selectCompareSecondPlayer(p)}
                          className="w-full p-3 text-left hover:bg-[#251f10] flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-xs text-[#ede1c9]">{p.name}</span>
                            <span className="text-[10px] text-[#ad8885] font-mono ml-2">
                              ({p.playerId})
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs text-[#ffb3ad]">
                            {p.currentRating} Elo
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Loading Comparison */}
              {loadingCompare && (
                <div className="py-8 text-center text-xs text-[#9a8e7a] animate-pulse">
                  Computing expected probabilities & match records...
                </div>
              )}

              {/* Comparison Analytics Results */}
              {compareData && (
                <div className="space-y-6 animate-fade-in">
                  {/* Algorithmic Win Probability Gauge */}
                  <div className="p-4 bg-[#181305] border border-[#3b3423]">
                    <div className="flex justify-between items-center text-xs font-bold mb-2">
                      <span className="text-[#ffb3ad]">
                        {compareData.player1.name}: {compareData.analytics.player1WinProbability}%
                      </span>
                      <span className="text-[10px] text-[#ad8885] uppercase font-mono">
                        ALGORITHMIC WIN PROBABILITY
                      </span>
                      <span className="text-[#ede1c9]">
                        {compareData.player2.name}: {compareData.analytics.player2WinProbability}%
                      </span>
                    </div>

                    {/* Visual Probability Bar */}
                    <div className="w-full h-3 bg-[#251f10] rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${compareData.analytics.player1WinProbability}%` }}
                        className="bg-[#ff3b3f] h-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${compareData.analytics.player2WinProbability}%` }}
                        className="bg-[#5d3f3d] h-full transition-all duration-500"
                      />
                    </div>

                    <div className="text-[10px] text-[#9a8e7a] text-center mt-2">
                      Rating Difference: <span className="font-bold text-[#ede1c9]">{Math.abs(compareData.analytics.ratingGap)} points</span> • Favored:{' '}
                      <span className="text-[#4ade80] font-bold">{compareData.analytics.higherRatedPlayer}</span>
                    </div>
                  </div>

                  {/* Side-by-Side Metric Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs border border-[#3b3423] p-4 bg-[#181305]">
                    <div className="font-mono font-bold text-[#ffb3ad]">{compareData.player1.wins}</div>
                    <div className="text-[10px] text-[#9a8e7a] uppercase">Career Wins</div>
                    <div className="font-mono font-bold text-[#ede1c9]">{compareData.player2.wins}</div>

                    <div className="font-mono font-bold text-[#ffb3ad]">{compareData.player1.winPercentage}%</div>
                    <div className="text-[10px] text-[#9a8e7a] uppercase">Win Rate</div>
                    <div className="font-mono font-bold text-[#ede1c9]">{compareData.player2.winPercentage}%</div>

                    <div className="font-mono font-bold text-[#ffb3ad]">{compareData.player1.winningStreak}W</div>
                    <div className="text-[10px] text-[#9a8e7a] uppercase">Current Streak</div>
                    <div className="font-mono font-bold text-[#ede1c9]">{compareData.player2.winningStreak}W</div>

                    <div className="font-mono font-bold text-[#ffb3ad]">{compareData.player1.tournamentWins}</div>
                    <div className="text-[10px] text-[#9a8e7a] uppercase">Tournament Titles</div>
                    <div className="font-mono font-bold text-[#ede1c9]">{compareData.player2.tournamentWins}</div>
                  </div>

                  {/* Direct Head-to-Head Encounters */}
                  <div className="p-4 bg-[#181305] border border-[#3b3423]">
                    <div className="text-[10px] font-bold tracking-widest text-[#ad8885] uppercase mb-2">
                      HISTORICAL MATCHUPS ({compareData.headToHead.totalMatches})
                    </div>
                    <div className="text-xs text-[#ede1c9]">
                      Direct Record:{' '}
                      <span className="font-bold text-[#ffb3ad] font-mono">
                        {compareData.player1.name} ({compareData.headToHead.player1Wins}) — (
                        {compareData.headToHead.player2Wins}) {compareData.player2.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default LeaderboardPage;
