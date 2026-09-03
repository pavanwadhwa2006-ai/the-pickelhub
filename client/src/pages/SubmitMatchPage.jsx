/**
 * SubmitMatchPage Component
 *
 * Fast, mobile-optimized match submission interface per PRD Section 6 and DoD #2/#3.
 * Supports:
 * - Singles & Doubles toggle
 * - Standard 2-Court facility selector (Court 1 & Court 2)
 * - In-place flexible player pickers (no bottom drawers, no page jumping)
 * - One-click "⇄ Swap Sides" team toggle
 * - Instant QR Match Challenge support (auto-fills from ?opponent=PH-XXXXX)
 * - In-app QR Scanner modal for courtside check-in
 * - Dynamic game scores with live majority-rule winner calculation
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TiltCard from '../components/TiltCard';
import InlinePlayerPicker from '../components/InlinePlayerPicker';
import QRScannerModal from '../components/QRScannerModal';

const COURTS = ['Court 1', 'Court 2'];

const SubmitMatchPage = () => {
  const { player } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Match Configuration State
  const [matchType, setMatchType] = useState('SINGLES');
  const [court, setCourt] = useState('Court 1');
  const [isTournament, setIsTournament] = useState(false);

  // Teams State
  const [teamA1Override, setTeamA1Override] = useState(null);
  const [teamA1Cleared, setTeamA1Cleared] = useState(false);
  const teamA1 = useMemo(() => {
    if (teamA1Cleared) return teamA1Override;
    return (
      teamA1Override ||
      (player
        ? {
            _id: player._id,
            playerId: player.playerId,
            name: player.name,
            currentRating: player.currentRating,
            category: player.category,
            profilePhoto: player.profilePhoto,
          }
        : null)
    );
  }, [teamA1Override, teamA1Cleared, player]);

  const [teamA2, setTeamA2] = useState(null);
  const [teamB1, setTeamB1] = useState(null);
  const [teamB2, setTeamB2] = useState(null);

  // QR Scanner Modal State
  const [scannerSlot, setScannerSlot] = useState(null); // 'teamB1' | 'teamB2' | 'teamA2' | 'teamA1'

  // Game Scores: Array of { teamAScore, teamBScore }
  const [games, setGames] = useState([
    { teamAScore: '11', teamBScore: '7' },
  ]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Auto-detect and populate opponent from URL QR parameter (?opponent=PH-XXXXX)
  const opponentParam = searchParams.get('opponent');
  useEffect(() => {
    if (opponentParam) {
      const loadChallengedOpponent = async () => {
        try {
          const res = await api.get(`/players/${opponentParam.trim().toUpperCase()}`);
          if (res.data.success && res.data.data) {
            setTeamB1(res.data.data);
            setSuccessMessage(
              `🎾 QR Challenge Accepted! You are playing against ${res.data.data.name} (${res.data.data.playerId}).`
            );
          }
        } catch {
          // Player not found by that ID
        }
      };
      loadChallengedOpponent();
    }
  }, [opponentParam]);

  // Swap Teams action (Team A <-> Team B)
  const handleSwapTeams = () => {
    const prevA1 = teamA1;
    const prevA2 = teamA2;
    const prevB1 = teamB1;
    const prevB2 = teamB2;

    setTeamA1Override(prevB1);
    setTeamA1Cleared(true);
    setTeamA2(prevB2);
    setTeamB1(prevA1);
    setTeamB2(prevA2);
  };

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

  // Live calculation of series winner
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
      setErrorMessage('Please select both Team A and Team B player participants.');
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

  const handleScannerFound = (foundPlayer) => {
    if (scannerSlot === 'teamB1') setTeamB1(foundPlayer);
    if (scannerSlot === 'teamB2') setTeamB2(foundPlayer);
    if (scannerSlot === 'teamA2') setTeamA2(foundPlayer);
    if (scannerSlot === 'teamA1') {
      setTeamA1Override(foundPlayer);
      setTeamA1Cleared(true);
    }
    setScannerSlot(null);
  };

  // Filter out IDs already selected
  const getExcludedIds = (currentSlot) => {
    const list = [];
    if (currentSlot !== 'teamA1' && teamA1?._id) list.push(teamA1._id);
    if (currentSlot !== 'teamA2' && teamA2?._id) list.push(teamA2._id);
    if (currentSlot !== 'teamB1' && teamB1?._id) list.push(teamB1._id);
    if (currentSlot !== 'teamB2' && teamB2?._id) list.push(teamB2._id);
    return list;
  };

  return (
    <PageTransition className="min-h-screen bg-[var(--color-bg-base,#181305)] text-[var(--color-text-primary,#ede1c9)] py-12 px-4 sm:px-8 md:px-16 transition-colors duration-300">
      <div className="max-w-[1080px] mx-auto">
        {/* Header */}
        <div className="pb-6 border-b border-[var(--color-border-subtle,#3b3423)] mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary,#ff3b3f)] uppercase">
                OFFICIAL MATCH RECORDING
              </span>
              <span className="px-2 py-0.5 bg-[var(--color-bg-card,#251f10)] border border-[var(--color-accent-primary,#ff3b3f)]/40 text-[var(--color-accent-primary,#ff3b3f)] text-[10px] font-bold tracking-wider uppercase rounded-full">
                COURTSIDE RAPID FLOW
              </span>
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[var(--color-text-primary,#ede1c9)]">
              Submit Match Result
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted,#9a8e7a)] mt-1">
              Select opponents, enter best-of scores, and submit directly to the verification queue.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="text-xs font-bold tracking-wider text-[var(--color-text-muted,#ad8885)] hover:text-[var(--color-text-primary,#ede1c9)] uppercase underline underline-offset-4 self-start sm:self-auto"
          >
            ← BACK TO DASHBOARD
          </Link>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between rounded-xl animate-fade-in shadow-lg">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {errorMessage}
            </span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 font-bold hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 rounded-xl animate-fade-in shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {successMessage}
          </div>
        )}

        {/* Match Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Configuration Card */}
          <TiltCard className="p-6 sm:p-8 bg-[var(--color-bg-card,#251f10)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted,#ad8885)] uppercase block mb-4">
              1. MATCH SETTINGS & FACILITY
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Match Format Toggle */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary,#d8cdb5)] uppercase block mb-2">
                  Match Format
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[var(--color-bg-base,#1a1508)] p-1 border border-[var(--color-border-subtle,#3b3423)] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMatchType('SINGLES')}
                    className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      matchType === 'SINGLES'
                        ? 'bg-[var(--color-accent-primary,#ff3b3f)] text-white shadow-md'
                        : 'text-[var(--color-text-muted,#ad8885)] hover:text-[var(--color-text-primary,#ede1c9)]'
                    }`}
                  >
                    Singles (1v1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('DOUBLES')}
                    className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      matchType === 'DOUBLES'
                        ? 'bg-[var(--color-accent-primary,#ff3b3f)] text-white shadow-md'
                        : 'text-[var(--color-text-muted,#ad8885)] hover:text-[var(--color-text-primary,#ede1c9)]'
                    }`}
                  >
                    Doubles (2v2)
                  </button>
                </div>
              </div>

              {/* Court Identifier (Standard 2 Courts) */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary,#d8cdb5)] uppercase block mb-2">
                  Facility Court
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COURTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCourt(c)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        court === c
                          ? 'bg-[var(--color-accent-primary,#ff3b3f)]/15 border-[var(--color-accent-primary,#ff3b3f)] text-[var(--color-text-primary,#ede1c9)] font-mono'
                          : 'bg-[var(--color-bg-base,#1a1508)] border-[var(--color-border-subtle,#3b3423)] text-[var(--color-text-muted,#9a8e7a)] hover:text-[var(--color-text-primary,#ede1c9)]'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tournament Match */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary,#d8cdb5)] uppercase block mb-2">
                  Competition Type
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--color-text-primary,#ede1c9)]">
                    <input
                      type="checkbox"
                      checked={isTournament}
                      onChange={(e) => setIsTournament(e.target.checked)}
                      className="accent-[var(--color-accent-primary,#ff3b3f)] w-4 h-4 cursor-pointer"
                    />
                    <span>Sanctioned Tournament Match</span>
                  </label>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Player Selection: Team A vs Team B */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted,#ad8885)] uppercase">
                2. PLAYERS & PARTICIPANTS
              </span>
              <button
                type="button"
                onClick={handleSwapTeams}
                className="px-3 py-1 bg-[var(--color-bg-card,#251f10)] hover:bg-[var(--color-bg-card-hover,#352c16)] border border-[var(--color-border-subtle,#3b3423)] rounded-lg text-xs font-bold text-[var(--color-text-primary,#ede1c9)] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Swap Team A and Team B sides"
              >
                <span>⇄</span>
                <span>Swap Sides</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TEAM A */}
              <div className="p-6 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl flex flex-col justify-between relative shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--color-border-subtle,#2f2919)]">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-accent-primary,#ff3b3f)] uppercase">
                      TEAM A (HOME)
                    </span>
                    {computedWinner === 'A' && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-[9px] font-bold uppercase rounded-full">
                        PROJECTED WINNER
                      </span>
                    )}
                  </div>

                  {/* Team A Player 1 */}
                  <InlinePlayerPicker
                    label={`Player 1 ${teamA1?._id === player?._id ? '(You)' : ''}`}
                    selectedPlayer={teamA1}
                    onSelect={(p) => {
                      setTeamA1Override(p);
                      setTeamA1Cleared(true);
                    }}
                    onClear={() => {
                      setTeamA1Override(null);
                      setTeamA1Cleared(true);
                    }}
                    onOpenScanner={() => setScannerSlot('teamA1')}
                    excludeIds={getExcludedIds('teamA1')}
                    placeholder="Choose Player 1..."
                  />

                  {/* Team A Player 2 (Doubles only) */}
                  {matchType === 'DOUBLES' && (
                    <InlinePlayerPicker
                      label="Partner (Player 2)"
                      selectedPlayer={teamA2}
                      onSelect={(p) => setTeamA2(p)}
                      onClear={() => setTeamA2(null)}
                      onOpenScanner={() => setScannerSlot('teamA2')}
                      excludeIds={getExcludedIds('teamA2')}
                      placeholder="Choose Partner..."
                    />
                  )}
                </div>

                <div className="text-[11px] text-[var(--color-text-muted,#ad8885)] pt-3 border-t border-[var(--color-border-subtle,#2f2919)] flex items-center justify-between">
                  <span>Series Games Won:</span>
                  <span className="font-bold text-[var(--color-text-primary,#ede1c9)] font-mono text-sm">
                    {teamAGamesWon}
                  </span>
                </div>
              </div>

              {/* TEAM B */}
              <div className="p-6 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl flex flex-col justify-between relative shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--color-border-subtle,#2f2919)]">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-accent-primary,#ffb3ad)] uppercase">
                      TEAM B (OPPONENTS)
                    </span>
                    {computedWinner === 'B' && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-[9px] font-bold uppercase rounded-full">
                        PROJECTED WINNER
                      </span>
                    )}
                  </div>

                  {/* Team B Player 1 */}
                  <InlinePlayerPicker
                    label="Opponent 1"
                    selectedPlayer={teamB1}
                    onSelect={(p) => setTeamB1(p)}
                    onClear={() => setTeamB1(null)}
                    onOpenScanner={() => setScannerSlot('teamB1')}
                    excludeIds={getExcludedIds('teamB1')}
                    placeholder="Choose Opponent 1 or scan QR..."
                  />

                  {/* Team B Player 2 (Doubles only) */}
                  {matchType === 'DOUBLES' && (
                    <InlinePlayerPicker
                      label="Opponent 2"
                      selectedPlayer={teamB2}
                      onSelect={(p) => setTeamB2(p)}
                      onClear={() => setTeamB2(null)}
                      onOpenScanner={() => setScannerSlot('teamB2')}
                      excludeIds={getExcludedIds('teamB2')}
                      placeholder="Choose Opponent 2..."
                    />
                  )}
                </div>

                <div className="text-[11px] text-[var(--color-text-muted,#ad8885)] pt-3 border-t border-[var(--color-border-subtle,#2f2919)] flex items-center justify-between">
                  <span>Series Games Won:</span>
                  <span className="font-bold text-[var(--color-text-primary,#ede1c9)] font-mono text-sm">
                    {teamBGamesWon}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Game-by-Game Scores */}
          <TiltCard className="p-6 sm:p-8 bg-[var(--color-bg-card,#251f10)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted,#ad8885)] uppercase block mb-1">
                  3. GAME SCORES (MAJORITY RULE)
                </span>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary,#ede1c9)]">
                  Game by Game Results
                </h3>
              </div>

              {games.length < 5 && (
                <button
                  type="button"
                  onClick={addGame}
                  className="px-4 py-2 bg-[var(--color-bg-base,#201b0c)] hover:bg-[var(--color-bg-card-hover,#3b3423)] border border-[var(--color-border-strong,#5d3f3d)] rounded-xl text-xs font-bold tracking-wider text-[var(--color-text-primary,#ffb3ad)] uppercase transition-colors cursor-pointer"
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
                    className="p-4 bg-[var(--color-bg-base,#1a1508)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-[var(--color-accent-primary,#ff3b3f)]">
                        GAME {idx + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          isTie
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500'
                            : 'bg-[var(--color-bg-card,#251f10)] text-[var(--color-text-muted,#ffb3ad)] border border-[var(--color-border-subtle,#3b3423)]'
                        }`}
                      >
                        {gameWinner}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-text-muted,#9a8e7a)] uppercase font-mono">Team A:</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={g.teamAScore}
                          onChange={(e) => handleScoreChange(idx, 'teamAScore', e.target.value)}
                          className="w-16 px-2.5 py-1.5 bg-[var(--color-bg-card,#251f10)] border border-[var(--color-border-subtle,#3b3423)] focus:border-[var(--color-accent-primary,#ff3b3f)] rounded-lg text-center font-mono font-bold text-sm text-[var(--color-text-primary,#ede1c9)] focus:outline-none"
                        />
                      </div>

                      <span className="text-[var(--color-border-strong,#5d3f3d)] font-bold">—</span>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-text-muted,#9a8e7a)] uppercase font-mono">Team B:</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={g.teamBScore}
                          onChange={(e) => handleScoreChange(idx, 'teamBScore', e.target.value)}
                          className="w-16 px-2.5 py-1.5 bg-[var(--color-bg-card,#251f10)] border border-[var(--color-border-subtle,#3b3423)] focus:border-[var(--color-accent-primary,#ff3b3f)] rounded-lg text-center font-mono font-bold text-sm text-[var(--color-text-primary,#ede1c9)] focus:outline-none"
                        />
                      </div>

                      {games.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGame(idx)}
                          className="text-xs text-rose-400 hover:text-white font-bold px-2 py-1 transition-colors cursor-pointer"
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl">
            <div className="text-xs text-[var(--color-text-muted,#9a8e7a)]">
              Series Decision:{' '}
              {computedWinner ? (
                <span className="font-bold text-emerald-400">
                  Team {computedWinner} Victorious ({Math.max(teamAGamesWon, teamBGamesWon)}-
                  {Math.min(teamAGamesWon, teamBGamesWon)})
                </span>
              ) : (
                <span className="text-rose-400">Series Undecided (Draws disallowed)</span>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || hasTiedGame || !computedWinner}
              className="w-full sm:w-auto px-10 py-4 bg-[var(--color-accent-primary,#ff3b3f)] hover:brightness-110 text-white text-xs font-bold tracking-[0.2em] uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(255,59,63,0.35)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'SUBMITTING TO VERIFICATION QUEUE...' : 'SUBMIT MATCH SCORES →'}
            </button>
          </div>
        </form>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={Boolean(scannerSlot)}
        onClose={() => setScannerSlot(null)}
        onPlayerFound={handleScannerFound}
      />
    </PageTransition>
  );
};

export default SubmitMatchPage;
