/**
 * BracketVisualizer Component
 *
 * Interactive visual tournament bracket tree rendering single-elimination
 * rounds, seeded player matchups, live scores, and championship podium.
 * Supports read-only player view and interactive admin scoring mode.
 */

import { motion } from 'framer-motion';

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

  return (
    <div className="space-y-8">
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
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--color-text-muted)] font-medium">
            {tournament.runnerUp && (
              <span>
                Runner-Up: <strong className="text-[var(--color-text-primary)]">{getPlayerName(tournament.runnerUp)}</strong>
              </span>
            )}
            <span>•</span>
            <span className="text-amber-500 font-bold">
              +{tournament.bonusConfig?.winnerBonus || 50} Elo Points Awarded
            </span>
          </div>
        </motion.div>
      )}

      {/* Bracket Rounds Container */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-8 min-w-[800px] items-stretch">
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
                  {matches.map((m) => {
                    const isCompleted = m.status === 'COMPLETED';
                    const isBye = m.status === 'BYE';
                    const isReady = m.status === 'READY';
                    const p1Won = isCompleted && m.winner && m.player1 && (m.winner._id || m.winner).toString() === (m.player1._id || m.player1).toString();
                    const p2Won = isCompleted && m.winner && m.player2 && (m.winner._id || m.winner).toString() === (m.player2._id || m.player2).toString();

                    return (
                      <motion.div
                        key={m.matchId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-[var(--color-bg-card)] border rounded-xl p-3 sm:p-4 shadow-sm transition-all relative ${
                          isCompleted
                            ? 'border-[var(--color-border-subtle)]'
                            : isReady
                            ? 'border-[var(--color-accent-primary)]/50 ring-1 ring-[var(--color-accent-primary)]/30'
                            : 'border-[var(--color-border-subtle)] opacity-75'
                        }`}
                      >
                        {/* Match Identifier & Status Chip */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted)] mb-2.5 pb-1.5 border-b border-[var(--color-border-subtle)]">
                          <span className="font-bold">Match #{m.matchIndex + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase ${
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
                          className={`flex items-center justify-between p-2 rounded-lg mb-1.5 transition-colors ${
                            p1Won
                              ? 'bg-emerald-500/15 text-emerald-500 font-bold'
                              : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-xs font-semibold truncate">
                              {getPlayerName(m.player1)}
                            </span>
                            {getPlayerRating(m.player1) && (
                              <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                ({getPlayerRating(m.player1)})
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-sm font-bold ml-2">
                            {m.score1 !== null ? m.score1 : '-'}
                          </div>
                        </div>

                        {/* Player 2 Row */}
                        <div
                          className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                            p2Won
                              ? 'bg-emerald-500/15 text-emerald-500 font-bold'
                              : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-xs font-semibold truncate">
                              {m.player2 ? getPlayerName(m.player2) : isBye ? 'BYE (Advances)' : 'TBD'}
                            </span>
                            {getPlayerRating(m.player2) && (
                              <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                ({getPlayerRating(m.player2)})
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-sm font-bold ml-2">
                            {m.score2 !== null ? m.score2 : '-'}
                          </div>
                        </div>

                        {/* Admin Action Button: Record Score */}
                        {isAdmin && isReady && onScoreMatch && (
                          <div className="mt-3 pt-2 border-t border-[var(--color-border-subtle)] text-right">
                            <button
                              type="button"
                              onClick={() => onScoreMatch(m)}
                              className="px-3 py-1 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm"
                            >
                              Enter Score →
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BracketVisualizer;
