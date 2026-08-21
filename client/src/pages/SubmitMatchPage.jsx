/**
 * SubmitMatchPage Component
 *
 * Fast, mobile-optimized match submission interface per PRD Section 6 and DoD #2/#3.
 * Supports Singles & Doubles, live player search autocomplete, dynamic game score rows,
 * live majority winner calculation, and sub-30-second match recording.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TiltCard from '../components/TiltCard';

const SubmitMatchPage = () => {
  const { player } = useAuth();
  const navigate = useNavigate();

  // Match Configuration State
  const [matchType, setMatchType] = useState('SINGLES');
  const [court, setCourt] = useState('Court 1');
  const [isTournament, setIsTournament] = useState(false);

  // Teams State (Player Objects or IDs)
  // Team A Player 1 defaults to current logged-in player
  const [teamA1Override, setTeamA1Override] = useState(null);
  const teamA1 = useMemo(
    () =>
      teamA1Override ||
      (player
        ? {
            _id: player._id,
            playerId: player.playerId,
            name: player.name,
            currentRating: player.currentRating,
          }
        : null),
    [teamA1Override, player]
  );
  const [teamA2, setTeamA2] = useState(null);
  const [teamB1, setTeamB1] = useState(null);
  const [teamB2, setTeamB2] = useState(null);

  // Game Scores: Array of { teamAScore, teamBScore }
  const [games, setGames] = useState([
    { teamAScore: '11', teamBScore: '7' },
  ]);

  // Autocomplete Search State
  const [activeSlot, setActiveSlot] = useState(null); // 'teamA2' | 'teamB1' | 'teamB2' | 'teamA1'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const selectPlayer = (slot, selectedPlayer) => {
    if (slot === 'teamA1') setTeamA1Override(selectedPlayer);
    if (slot === 'teamA2') setTeamA2(selectedPlayer);
    if (slot === 'teamB1') setTeamB1(selectedPlayer);
    if (slot === 'teamB2') setTeamB2(selectedPlayer);
    setActiveSlot(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Debounced Player Search
  const searchPlayersAPI = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/players/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data.success) {
        // Filter out already selected players
        const selectedIds = [teamA1?._id, teamA2?._id, teamB1?._id, teamB2?._id].filter(Boolean);
        const filtered = res.data.data.filter((p) => !selectedIds.includes(p._id));
        setSearchResults(filtered);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [teamA1, teamA2, teamB1, teamB2]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeSlot && searchQuery) {
        searchPlayersAPI(searchQuery);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, activeSlot, searchPlayersAPI]);

  // Score management
  const handleScoreChange = (index, team, val) => {
    const nextGames = [...games];
    nextGames[index][team] = val;
    setGames(nextGames);
  };

  const addGame = () => {
    if (games.length < 5) {
      setGames([...games, { teamAScore: '11', teamBScore: '8' }]);
    }
  };

  const removeGame = (index) => {
    if (games.length > 1) {
      setGames(games.filter((_, i) => i !== index));
    }
  };

  // Live calculation of winner
  let teamAGamesWon = 0;
  let teamBGamesWon = 0;
  let hasTiedGame = false;

  games.forEach((g) => {
    const a = Number(g.teamAScore);
    const b = Number(g.teamBScore);
    if (!isNaN(a) && !isNaN(b)) {
      if (a === b) hasTiedGame = true;
      if (a > b) teamAGamesWon++;
      if (b > a) teamBGamesWon++;
    }
  });

  const computedWinner =
    teamAGamesWon > teamBGamesWon ? 'A' : teamBGamesWon > teamAGamesWon ? 'B' : null;

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation checks
    if (!teamA1 || !teamB1) {
      setErrorMessage('Please select all required player participants.');
      return;
    }

    if (matchType === 'DOUBLES' && (!teamA2 || !teamB2)) {
      setErrorMessage('For doubles matches, both Team A and Team B must have 2 players.');
      return;
    }

    if (hasTiedGame) {
      setErrorMessage('Pickleball games cannot end in a tie. Please correct tied game scores.');
      return;
    }

    if (!computedWinner) {
      setErrorMessage('The match series is currently tied in games. A decisive series winner is required.');
      return;
    }

    const payload = {
      matchType,
      court: court.trim(),
      isTournament,
      teamA: matchType === 'SINGLES' ? [teamA1._id] : [teamA1._id, teamA2._id],
      teamB: matchType === 'SINGLES' ? [teamB1._id] : [teamB1._id, teamB2._id],
      scores: games.map((g) => ({
        teamAScore: Number(g.teamAScore),
        teamBScore: Number(g.teamBScore),
      })),
      winnerTeam: computedWinner,
    };

    setSubmitting(true);
    try {
      const res = await api.post('/matches/submit', payload);
      if (res.data.success) {
        setSuccessMessage(`Match ${res.data.data.matchId} submitted successfully! Redirecting to dashboard...`);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit match score.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1024px] mx-auto">
        {/* Header */}
        <div className="pb-8 border-b border-[#3b3423] mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase">
                OFFICIAL MATCH RECORDING
              </span>
              <span className="px-2 py-0.5 bg-[#251f10] border border-[#ff3b3f]/40 text-[#ffb3ad] text-[10px] font-bold tracking-wider uppercase">
                SUB-30s FLOW
              </span>
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[#ede1c9]">
              Submit Match Result
            </h1>
            <p className="text-xs sm:text-sm text-[#9a8e7a] mt-1">
              Submitted scores enter verification queue. Ratings update upon administrator approval.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="text-xs font-bold tracking-wider text-[#ad8885] hover:text-[#ede1c9] uppercase underline underline-offset-4 self-start sm:self-auto"
          >
            ← BACK TO DASHBOARD
          </Link>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-8 p-4 bg-[#93000a]/20 border border-[#ff5451] text-[#ffdad6] text-xs flex items-center justify-between animate-fade-in shadow-lg">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff5451]" />
              {errorMessage}
            </span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-[#ffdad6] font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-8 p-4 bg-[#4ade80]/10 border border-[#4ade80] text-[#4ade80] text-xs flex items-center gap-2 animate-fade-in shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-live-pulse" />
            {successMessage}
          </div>
        )}

        {/* Match Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Match Settings: Type, Court, Tournament */}
          <TiltCard className="p-6 sm:p-8 bg-[#251f10] border border-[#3b3423]">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-4">
              1. MATCH CONFIGURATION
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Match Type Toggle */}
              <div>
                <label className="text-xs font-bold text-[#d8cdb5] uppercase block mb-2">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchType('SINGLES');
                      setTeamA2(null);
                      setTeamB2(null);
                    }}
                    className={`py-2.5 text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                      matchType === 'SINGLES'
                        ? 'bg-[#ff3b3f] text-white border-[#ff3b3f] shadow-[0_0_12px_rgba(255,59,63,0.3)]'
                        : 'bg-[#1a1508] text-[#9a8e7a] border-[#3b3423] hover:border-[#ad8885]'
                    }`}
                  >
                    SINGLES (1v1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('DOUBLES')}
                    className={`py-2.5 text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                      matchType === 'DOUBLES'
                        ? 'bg-[#ff3b3f] text-white border-[#ff3b3f] shadow-[0_0_12px_rgba(255,59,63,0.3)]'
                        : 'bg-[#1a1508] text-[#9a8e7a] border-[#3b3423] hover:border-[#ad8885]'
                    }`}
                  >
                    DOUBLES (2v2)
                  </button>
                </div>
              </div>

              {/* Court Identifier */}
              <div>
                <label className="text-xs font-bold text-[#d8cdb5] uppercase block mb-2">
                  Court Location
                </label>
                <input
                  type="text"
                  required
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  placeholder="e.g. Court 1, Center Court"
                  className="w-full px-3.5 py-2 bg-[#1a1508] border border-[#3b3423] focus:border-[#ff3b3f] text-[#ede1c9] text-xs focus:outline-none"
                />
              </div>

              {/* Tournament Match */}
              <div>
                <label className="text-xs font-bold text-[#d8cdb5] uppercase block mb-2">
                  Match Category
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#ede1c9]">
                    <input
                      type="checkbox"
                      checked={isTournament}
                      onChange={(e) => setIsTournament(e.target.checked)}
                      className="accent-[#ff3b3f] w-4 h-4 cursor-pointer"
                    />
                    <span>Sanctioned Tournament Match</span>
                  </label>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Player Selection: Team A vs Team B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TEAM A */}
            <div className="p-6 bg-[#201b0c] border border-[#3b3423] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#ff3b3f] uppercase">
                    TEAM A (HOME)
                  </span>
                  {computedWinner === 'A' && (
                    <span className="px-2 py-0.5 bg-[#ff3b3f]/20 border border-[#ff3b3f] text-[#ffdad6] text-[9px] font-bold uppercase animate-live-pulse">
                      PROJECTED WINNER
                    </span>
                  )}
                </div>

                {/* Team A Player 1 */}
                <div className="mb-4">
                  <label className="text-[11px] text-[#9a8e7a] uppercase block mb-1">
                    Player 1 {teamA1?._id === player?._id && '(You)'}
                  </label>
                  <div className="p-3 bg-[#181305] border border-[#3b3423] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#ede1c9] block">
                        {teamA1?.name || 'Select Player'}
                      </span>
                      <span className="text-[10px] text-[#ad8885] font-mono">
                        {teamA1?.playerId} • {teamA1?.currentRating || 1000} Elo
                      </span>
                    </div>
                    {teamA1?._id !== player?._id && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlot('teamA1');
                          setSearchQuery('');
                        }}
                        className="text-[10px] text-[#ff3b3f] font-bold uppercase underline"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>

                {/* Team A Player 2 (Doubles only) */}
                {matchType === 'DOUBLES' && (
                  <div className="mb-4">
                    <label className="text-[11px] text-[#9a8e7a] uppercase block mb-1">
                      Partner (Player 2)
                    </label>
                    {teamA2 ? (
                      <div className="p-3 bg-[#181305] border border-[#3b3423] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-[#ede1c9] block">
                            {teamA2.name}
                          </span>
                          <span className="text-[10px] text-[#ad8885] font-mono">
                            {teamA2.playerId} • {teamA2.currentRating || 1000} Elo
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTeamA2(null)}
                          className="text-[10px] text-[#ff5451] font-bold uppercase underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlot('teamA2');
                          setSearchQuery('');
                        }}
                        className="w-full py-3 bg-[#181305] border border-dashed border-[#5d3f3d] hover:border-[#ff3b3f] text-[#ffb3ad] text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        + SELECT TEAMMATE
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-[#ad8885] pt-3 border-t border-[#2f2919]">
                Series Games Won: <span className="font-bold text-[#ede1c9] font-mono text-sm">{teamAGamesWon}</span>
              </div>
            </div>

            {/* TEAM B */}
            <div className="p-6 bg-[#201b0c] border border-[#3b3423] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#ffb3ad] uppercase">
                    TEAM B (OPPONENT)
                  </span>
                  {computedWinner === 'B' && (
                    <span className="px-2 py-0.5 bg-[#ff3b3f]/20 border border-[#ff3b3f] text-[#ffdad6] text-[9px] font-bold uppercase animate-live-pulse">
                      PROJECTED WINNER
                    </span>
                  )}
                </div>

                {/* Team B Player 1 */}
                <div className="mb-4">
                  <label className="text-[11px] text-[#9a8e7a] uppercase block mb-1">
                    Player 1
                  </label>
                  {teamB1 ? (
                    <div className="p-3 bg-[#181305] border border-[#3b3423] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#ede1c9] block">
                          {teamB1.name}
                        </span>
                        <span className="text-[10px] text-[#ad8885] font-mono">
                          {teamB1.playerId} • {teamB1.currentRating || 1000} Elo
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTeamB1(null)}
                        className="text-[10px] text-[#ff5451] font-bold uppercase underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlot('teamB1');
                        setSearchQuery('');
                      }}
                      className="w-full py-3 bg-[#181305] border border-dashed border-[#5d3f3d] hover:border-[#ff3b3f] text-[#ffb3ad] text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
                    >
                      + SELECT OPPONENT
                    </button>
                  )}
                </div>

                {/* Team B Player 2 (Doubles only) */}
                {matchType === 'DOUBLES' && (
                  <div className="mb-4">
                    <label className="text-[11px] text-[#9a8e7a] uppercase block mb-1">
                      Player 2
                    </label>
                    {teamB2 ? (
                      <div className="p-3 bg-[#181305] border border-[#3b3423] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-[#ede1c9] block">
                            {teamB2.name}
                          </span>
                          <span className="text-[10px] text-[#ad8885] font-mono">
                            {teamB2.playerId} • {teamB2.currentRating || 1000} Elo
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTeamB2(null)}
                          className="text-[10px] text-[#ff5451] font-bold uppercase underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlot('teamB2');
                          setSearchQuery('');
                        }}
                        className="w-full py-3 bg-[#181305] border border-dashed border-[#5d3f3d] hover:border-[#ff3b3f] text-[#ffb3ad] text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        + SELECT OPPONENT 2
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-[#ad8885] pt-3 border-t border-[#2f2919]">
                Series Games Won: <span className="font-bold text-[#ede1c9] font-mono text-sm">{teamBGamesWon}</span>
              </div>
            </div>
          </div>

          {/* Autocomplete Search Modal / Drawer */}
          {activeSlot && (
            <div className="p-6 bg-[#1f190a] border-2 border-[#ff3b3f] animate-fade-in shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold tracking-wider text-[#ffb3ad] uppercase">
                  SEARCH ACTIVE PLAYERS
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSlot(null)}
                  className="text-xs text-[#ad8885] hover:text-white font-bold cursor-pointer"
                >
                  ✕ CANCEL
                </button>
              </div>

              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type player name or Player ID (e.g. PH-00001)..."
                className="w-full px-4 py-3 bg-[#140f02] border border-[#5d3f3d] focus:border-[#ff3b3f] text-sm text-[#ede1c9] focus:outline-none mb-4"
              />

              {searching && (
                <div className="text-xs text-[#9a8e7a] py-2">Searching directory...</div>
              )}

              <div className="max-h-60 overflow-y-auto divide-y divide-[#2f2919]">
                {searchResults.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => selectPlayer(activeSlot, p)}
                    className="w-full p-3 text-left hover:bg-[#2a2211] flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#ede1c9]">{p.name}</div>
                      <div className="text-[10px] text-[#9a8e7a] font-mono">
                        {p.playerId} • Tier: {p.category}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-xs text-[#ffb3ad]">
                      {p.currentRating} Elo
                    </div>
                  </button>
                ))}
                {!searching && searchQuery && searchResults.length === 0 && (
                  <div className="text-xs text-[#9a8e7a] py-4 text-center">
                    No active players found matching "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game-by-Game Scores */}
          <TiltCard className="p-6 sm:p-8 bg-[#251f10] border border-[#3b3423]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
                  2. GAME SCORES (MAJORITY RULE)
                </span>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9]">
                  Game by Game Results
                </h3>
              </div>

              {games.length < 5 && (
                <button
                  type="button"
                  onClick={addGame}
                  className="px-4 py-2 bg-[#201b0c] hover:bg-[#3b3423] border border-[#5d3f3d] text-xs font-bold tracking-wider text-[#ffb3ad] uppercase transition-colors cursor-pointer"
                >
                  + ADD GAME
                </button>
              )}
            </div>

            <div className="space-y-4">
              {games.map((g, idx) => {
                const a = Number(g.teamAScore);
                const b = Number(g.teamBScore);
                const isTie = a === b;
                const gameWinner = a > b ? 'Team A Won' : b > a ? 'Team B Won' : 'Tied Game (Invalid)';

                return (
                  <div
                    key={idx}
                    className="p-4 bg-[#1a1508] border border-[#3b3423] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-[#ff3b3f]">
                        GAME {idx + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                          isTie
                            ? 'bg-[#93000a]/40 text-[#ffdad6] border border-[#ff5451]'
                            : 'bg-[#251f10] text-[#ffb3ad] border border-[#3b3423]'
                        }`}
                      >
                        {gameWinner}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9a8e7a] uppercase font-mono">Team A:</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={g.teamAScore}
                          onChange={(e) => handleScoreChange(idx, 'teamAScore', e.target.value)}
                          className="w-16 px-2.5 py-1.5 bg-[#251f10] border border-[#3b3423] focus:border-[#ff3b3f] text-center font-mono font-bold text-sm text-[#ede1c9] focus:outline-none"
                        />
                      </div>

                      <span className="text-[#5d3f3d] font-bold">—</span>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9a8e7a] uppercase font-mono">Team B:</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={g.teamBScore}
                          onChange={(e) => handleScoreChange(idx, 'teamBScore', e.target.value)}
                          className="w-16 px-2.5 py-1.5 bg-[#251f10] border border-[#3b3423] focus:border-[#ff3b3f] text-center font-mono font-bold text-sm text-[#ede1c9] focus:outline-none"
                        />
                      </div>

                      {games.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGame(idx)}
                          className="text-xs text-[#ff5451] hover:text-white font-bold px-2 py-1 transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TiltCard>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-[#201b0c] border border-[#3b3423]">
            <div className="text-xs text-[#9a8e7a]">
              Series Decision:{' '}
              {computedWinner ? (
                <span className="font-bold text-[#4ade80]">
                  Team {computedWinner} Victorious ({Math.max(teamAGamesWon, teamBGamesWon)}-
                  {Math.min(teamAGamesWon, teamBGamesWon)})
                </span>
              ) : (
                <span className="text-[#ff5451]">Series Undecided (Draws disallowed)</span>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || hasTiedGame || !computedWinner}
              className="w-full sm:w-auto px-10 py-4 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(255,59,63,0.35)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'SUBMITTING TO VERIFICATION QUEUE...' : 'SUBMIT MATCH SCORES →'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
};

export default SubmitMatchPage;
