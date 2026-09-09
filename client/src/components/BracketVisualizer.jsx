/**
 * BracketVisualizer Component
 *
 * Interactive visual tournament bracket tree rendering single-elimination
 * rounds, seeded player matchups, live scores, and championship podium.
 * Supports read-only player view and interactive admin scoring mode.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BracketVisualizer = ({
  tournament,
  onScoreMatch = null, // Callback for admin score entry: (match) => void
  isAdmin = false,
}) => {
  if (!tournament || !tournament.bracket || tournament.bracket.length === 0) {
    return (
      <div className="p-12 text-center bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl">
        <div className="w-16 h-16 rounded-full bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center text-2xl mx-auto mb-4 font-mono font-bold">
          🏆
        </div>
        <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)] mb-2">
          Bracket Generating Soon
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
          {tournament.status === 'REGISTRATION_OPEN'
            ? 'Registration is currently open. The bracket will be generated and seeded automatically once registration closes.'
            : 'Tournament bracket has not yet been initialized.'}
        </p>
      </div>
    );
  }

  // Group bracket matches by round
  const maxRound = Math.max(...tournament.bracket.map((m) => m.round));
  const roundsMap = {};
  for (let r = 1; r <= maxRound; r++) {
    roundsMap[r] = tournament.bracket
      .filter((m) => m.round === r)
      .sort((a, b) => a.matchIndex - b.matchIndex);
  }

  // Find active round default (earliest READY match, or final if completed)
  const defaultRound = useMemo(() => {
    const readyMatch = tournament.bracket.find((m) => m.status === 'READY');
    if (readyMatch) return readyMatch.round;
    if (tournament.status === 'COMPLETED') return maxRound;
    return 1;
  }, [tournament.bracket, tournament.status, maxRound]);

  const [activeMobileRound, setActiveMobileRound] = useState(defaultRound);
  const [mobileViewMode, setMobileViewMode] = useState('CARDS'); // 'CARDS' | 'TREE'

  const getRoundTitle = (roundNum, totalRounds) => {
    if (roundNum === totalRounds) return 'Championship Final';
    if (roundNum === totalRounds - 1) return 'Semifinals';
    if (roundNum === totalRounds - 2) return 'Quarterfinals';
    return `Round ${roundNum}`;
  };

  const getPlayerName = (p) => {
    if (!p) return 'TBD';
    return typeof p === 'object' ? p.name || p.playerId : 'Player';
  };

  const getPlayerRating = (p) => {
    if (!p || typeof p !== 'object') return null;
    return p.currentRating || null;
  };

  const renderMatchCard = (m) => {
    const isCompleted = m.status === 'COMPLETED';
    const isBye = m.status === 'BYE';
    const isReady = m.status === 'READY';
    const p1Won = isCompleted && m.winner && m.player1 && (m.winner._id || m.winner).toString() === (m.player1._id || m.player1).toString();
    const p2Won = isCompleted && m.winner && m.player2 && (m.winner._id || m.winner).toString() === (m.player2._id || m.player2).toString();

    return (
      <motion.div
        key={m.matchId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-[var(--color-bg-card)] border rounded-2xl p-4 shadow-sm transition-all relative ${
          isCompleted
            ? 'border-[var(--color-border-subtle)]'
            : isReady
            ? 'border-[var(--color-accent-primary)]/60 ring-1 ring-[var(--color-accent-primary)]/40 shadow-[0_0_12px_rgba(255,59,63,0.1)]'
            : 'border-[var(--color-border-subtle)] opacity-75'
        }`}
      >
        {/* Match Identifier & Status Chip */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)] mb-3 pb-2 border-b border-[var(--color-border-subtle)]">
          <span className="font-bold flex items-center gap-1.5">
            <span>Match #{m.matchIndex + 1}</span>
            {m.court && <span className="text-[10px] text-[var(--color-accent-primary)] font-normal">• {m.court}</span>}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
              isCompleted
                ? 'bg-emerald-500/15 text-emerald-500'
                : isBye
                ? 'bg-amber-500/15 text-amber-500'
                : isReady
                ? 'bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] animate-pulse'
                : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]'
            }`}
          >
            {m.status}
          </span>
        </div>

        {/* Player 1 Row */}
        <div
          className={`flex items-center justify-between p-2.5 rounded-xl mb-2 transition-colors ${
            p1Won
              ? 'bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30'
              : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                p1Won
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]'
              }`}
            >
              {(getPlayerName(m.player1) || 'P')[0].toUpperCase()}
            </div>
            <div className="truncate">
              <span className="text-xs sm:text-sm font-semibold truncate block">
                {getPlayerName(m.player1)}
              </span>
              {getPlayerRating(m.player1) && (
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono block">
                  {getPlayerRating(m.player1)} Elo
                </span>
              )}
            </div>
          </div>
          <div className="font-mono text-base font-bold ml-2 shrink-0">
            {m.score1 !== null ? m.score1 : '-'}
          </div>
        </div>

        {/* Player 2 Row */}
        <div
          className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
            p2Won
              ? 'bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30'
              : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                p2Won
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]'
              }`}
            >
              {(m.player2 ? getPlayerName(m.player2) : 'T')[0].toUpperCase()}
            </div>
            <div className="truncate">
              <span className="text-xs sm:text-sm font-semibold truncate block">
                {m.player2 ? getPlayerName(m.player2) : isBye ? 'BYE (Advances)' : 'TBD'}
              </span>
              {getPlayerRating(m.player2) && (
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono block">
                  {getPlayerRating(m.player2)} Elo
                </span>
              )}
            </div>
          </div>
          <div className="font-mono text-base font-bold ml-2 shrink-0">
            {m.score2 !== null ? m.score2 : '-'}
          </div>
        </div>

        {/* Admin Action Button: Record Score */}
        {isAdmin && isReady && onScoreMatch && (
          <div className="mt-3 pt-2.5 border-t border-[var(--color-border-subtle)] text-right">
            <button
              type="button"
              onClick={() => onScoreMatch(m)}
              className="w-full sm:w-auto px-4 py-2 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-sm cursor-pointer text-center"
            >
              Enter Match Score →
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Champion Podium Banner if tournament is completed */}
      {tournament.status === 'COMPLETED' && tournament.winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 sm:p-8 bg-gradient-to-r from-amber-500/10 via-[var(--color-bg-card)] to-amber-500/10 border-2 border-amber-500/50 rounded-2xl shadow-xl text-center relative overflow-hidden"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/40 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
            <span>🏆</span> Tournament Champion
          </div>
          <h2 className="font-['Playfair_Display'] text-2xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-2">
            {getPlayerName(tournament.winner)}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--color-text-muted)] font-medium">
            {tournament.runnerUp && (
              <span>
                Runner-Up: <strong className="text-[var(--color-text-primary)]">{getPlayerName(tournament.runnerUp)}</strong>
              </span>
            )}
            <span className="hidden sm:inline">•</span>
            <span className="text-amber-500 font-bold">
              +{tournament.bonusConfig?.winnerBonus || 50} Elo Points Awarded
            </span>
          </div>
        </motion.div>
      )}

      {/* Bracket Controls Bar: Title & Mobile View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-subtle)]">
        <div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-accent-primary)] uppercase block">
            {tournament.tournamentType || 'SINGLE ELIMINATION'}
          </span>
          <h3 className="font-['Playfair_Display'] text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
            Tournament Bracket Tree ({maxRound} {maxRound === 1 ? 'Round' : 'Rounds'})
          </h3>
        </div>

        {/* Mobile View Mode Switcher (Visible on mobile screens) */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl self-start sm:self-auto md:hidden">
          <button
            type="button"
            onClick={() => setMobileViewMode('CARDS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              mobileViewMode === 'CARDS'
                ? 'bg-[var(--color-accent-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>📱</span>
            <span>Round Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileViewMode('TREE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              mobileViewMode === 'TREE'
                ? 'bg-[var(--color-accent-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>🌲</span>
            <span>Full Tree</span>
          </button>
        </div>
      </div>

      {/* MOBILE ROUND-BY-ROUND CARDS VIEW (Clean & Non-Conjusted on Phones) */}
      <div className={`${mobileViewMode === 'CARDS' ? 'block md:hidden' : 'hidden'} space-y-4`}>
        {/* Round Pills Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {Object.keys(roundsMap).map((roundStr) => {
            const rNum = Number(roundStr);
            const rTitle = getRoundTitle(rNum, maxRound);
            const matchCount = roundsMap[rNum]?.length || 0;
            const isSelected = activeMobileRound === rNum;

            return (
              <button
                key={rNum}
                type="button"
                onClick={() => setActiveMobileRound(rNum)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)] shadow-md'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <span>{rNum === maxRound ? '🏆' : '🏓'}</span>
                <span>{rTitle}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/15 text-[var(--color-text-muted)]'
                  }`}
                >
                  {matchCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Current Round Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[var(--color-text-primary)]">
            {getRoundTitle(activeMobileRound, maxRound)}
          </span>
          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
            Round {activeMobileRound} of {maxRound} • {roundsMap[activeMobileRound]?.length || 0} Matches
          </span>
        </div>

        {/* Match Cards List in Current Round */}
        <div className="space-y-3.5">
          {(roundsMap[activeMobileRound] || []).map((m) => renderMatchCard(m))}
        </div>

        {/* Round Navigation Footer Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
          <button
            type="button"
            disabled={activeMobileRound <= 1}
            onClick={() => setActiveMobileRound((r) => Math.max(1, r - 1))}
            className="flex-1 py-2 px-3 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] disabled:opacity-40 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed text-center"
          >
            ← Previous Round
          </button>
          <button
            type="button"
            disabled={activeMobileRound >= maxRound}
            onClick={() => setActiveMobileRound((r) => Math.min(maxRound, r + 1))}
            className="flex-1 py-2 px-3 bg-[var(--color-accent-primary)] text-white disabled:opacity-40 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed text-center shadow-sm"
          >
            Next Round →
          </button>
        </div>
      </div>

      {/* FULL DESKTOP TREE / OPTIONAL MOBILE HORIZONTAL SWIPE VIEW */}
      <div className={`${mobileViewMode === 'TREE' ? 'block' : 'hidden md:block'}`}>
        {/* Mobile Swipe Hint Banner */}
        <div className="block md:hidden mb-3 p-2 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-center text-[11px] text-[var(--color-text-muted)]">
          👉 <strong>Tip:</strong> Swipe horizontally to browse rounds from Semifinals to Championship Final.
        </div>

        <div className="overflow-x-auto pb-6">
          <div className="flex gap-8 min-w-[720px] items-stretch">
            {Object.keys(roundsMap).map((roundStr) => {
              const roundNum = Number(roundStr);
              const matches = roundsMap[roundNum];
              const roundTitle = getRoundTitle(roundNum, maxRound);

              return (
                <div key={roundNum} className="flex-1 flex flex-col min-w-[260px] max-w-[320px]">
                  {/* Round Header */}
                  <div className="mb-4 text-center pb-2 border-b border-[var(--color-border-subtle)]">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-accent-primary)] uppercase block">
                      Round {roundNum} of {maxRound}
                    </span>
                    <h4 className="font-['Playfair_Display'] text-base font-bold text-[var(--color-text-primary)]">
                      {roundTitle}
                    </h4>
                  </div>

                  {/* Match Cards in this Round */}
                  <div className="flex flex-col justify-around flex-1 gap-6 py-2">
                    {matches.map((m) => renderMatchCard(m))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BracketVisualizer;
