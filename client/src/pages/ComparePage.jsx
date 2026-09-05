/**
 * ComparePage Component
 *
 * Dedicated, shareable Head-to-Head player comparison page (Milestone 9 — Deliverable D6).
 * Features:
 * - Public URL sharing (/compare?p1=PH-XXXXX&p2=PH-YYYYY)
 * - In-place flexible player pickers (InlinePlayerPicker)
 * - Algorithmic win probability calculation based on Elo gap
 * - Direct historical head-to-head match archive with scores
 * - One-click "Copy Comparison Link" and "⚔️ Challenge Courtside" actions
 */

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import InlinePlayerPicker from '../components/InlinePlayerPicker';
import TierBadge from '../components/TierBadge';

const ComparePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const p1Param = searchParams.get('p1') || '';
  const p2Param = searchParams.get('p2') || '';
  const samePlayerError =
    p1Param && p2Param && p1Param === p2Param
      ? 'Select two different players to compare head-to-head.'
      : null;

  const isComparing = Boolean(
    fetching ||
      (p1Param &&
        p2Param &&
        p1Param !== p2Param &&
        !error &&
        (!comparisonData ||
          comparisonData.player1?.playerId !== p1Param ||
          comparisonData.player2?.playerId !== p2Param))
  );

  // Sync with URL parameters
  useEffect(() => {
    let isCancelled = false;
    if (p1Param && p2Param && p1Param !== p2Param) {
      api
        .get(`/players/compare?p1=${p1Param}&p2=${p2Param}`)
        .then((res) => {
          if (!isCancelled && res.data.success) {
            setComparisonData(res.data.data);
            setPlayer1(res.data.data.player1);
            setPlayer2(res.data.data.player2);
          }
        })
        .catch((err) => {
          if (!isCancelled) setError(err.response?.data?.message || 'Failed to compare athletes.');
        })
        .finally(() => {
          if (!isCancelled) setFetching(false);
        });
    } else if (p1Param && !p2Param) {
      api
        .get(`/players/${p1Param}`)
        .then((res) => {
          if (!isCancelled && res.data.success) setPlayer1(res.data.data);
        })
        .catch(() => {});
    } else if (!p1Param && p2Param) {
      api
        .get(`/players/${p2Param}`)
        .then((res) => {
          if (!isCancelled && res.data.success) setPlayer2(res.data.data);
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [p1Param, p2Param]);

  const handleSelectP1 = (p) => {
    setPlayer1(p);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('p1', p.playerId);
    setSearchParams(newParams);
    if (player2?.playerId) {
      fetchComparison(p.playerId, player2.playerId);
    }
  };

  const handleSelectP2 = (p) => {
    setPlayer2(p);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('p2', p.playerId);
    setSearchParams(newParams);
    if (player1?.playerId) {
      fetchComparison(player1.playerId, p.playerId);
    }
  };

  const handleSwap = () => {
    if (!player1 && !player2) return;
    const tempP1 = player1;
    const tempP2 = player2;
    setPlayer1(tempP2);
    setPlayer2(tempP1);
    const newParams = new URLSearchParams();
    if (tempP2?.playerId) newParams.set('p1', tempP2.playerId);
    if (tempP1?.playerId) newParams.set('p2', tempP1.playerId);
    setSearchParams(newParams);
    if (tempP1?.playerId && tempP2?.playerId) {
      fetchComparison(tempP2.playerId, tempP1.playerId);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const analytics = comparisonData?.analytics;
  const headToHead = comparisonData?.headToHead;

  return (
    <PageTransition className="min-h-screen bg-[var(--color-bg-base,#181305)] text-[var(--color-text-primary,#ede1c9)] py-12 px-6 sm:px-10 md:px-20 transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto">
        {/* Header Title & Share Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-[var(--color-border-subtle,#3b3423)]">
          <div>
            <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary,#ff3b3f)] uppercase block mb-1">
              HEAD-TO-HEAD MATCHUP
            </span>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[var(--color-text-primary,#ede1c9)]">
              Athlete Comparison
            </h1>
            {isComparing && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent-primary,#ff3b3f)] font-mono animate-pulse mt-2">
                <span>⚡</span>
                <span>Calculating Elo win probability & match history...</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {player1 && player2 && (
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Share matchup comparison link"
                className="px-4 py-2.5 min-h-[44px] bg-[var(--color-bg-card,#201b0c)] hover:bg-[var(--color-bg-card-hover,#2f2814)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl text-xs font-bold tracking-wider text-[var(--color-text-primary,#ede1c9)] uppercase transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span aria-hidden="true">{copied ? '✓' : '🔗'}</span>
                <span>{copied ? 'Link Copied!' : 'Share Matchup'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSwap}
              disabled={!player1 || !player2}
              aria-label="Swap athlete positions"
              className="px-4 py-2.5 min-h-[44px] bg-[var(--color-bg-card,#201b0c)] hover:bg-[var(--color-bg-card-hover,#2f2814)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl text-xs font-bold tracking-wider text-[var(--color-text-muted,#9a8e7a)] hover:text-white uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Swap Athlete Positions"
            >
              <span aria-hidden="true">⇄</span>
              <span className="hidden sm:inline">Swap</span>
            </button>
          </div>
        </div>

        {(samePlayerError || error) && (
          <div role="alert" className="p-4 mb-8 bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs rounded-xl">
            ⚠️ {samePlayerError || error}
          </div>
        )}

        {/* Player Selection & Profile Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Player 1 Slot */}
          <div className="p-6 sm:p-8 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="mb-4">
                <InlinePlayerPicker
                  label="Select Athlete #1"
                  placeholder="Search by name or ID (PH-XXXXX)..."
                  selectedPlayer={player1}
                  onSelect={handleSelectP1}
                  onClear={() => {
                    setPlayer1(null);
                    setComparisonData(null);
                  }}
                  excludedPlayerIds={player2 ? [player2.playerId, player2._id] : []}
                  showQrScan={false}
                />
              </div>

              {player1 ? (
                <div className="pt-4 border-t border-[var(--color-border-subtle,#2f2919)]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-primary,#ff3b3f)] text-white font-['Playfair_Display'] font-bold text-2xl flex items-center justify-center shrink-0 border border-[#3b3423] shadow-md">
                      {player1.profilePhoto ? (
                        <img src={player1.profilePhoto} alt={player1.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        player1.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold text-[#ffb3ad] px-1.5 py-0.5 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded">
                          {player1.playerId}
                        </span>
                        <TierBadge category={player1.category} />
                      </div>
                      <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[var(--color-text-primary,#ede1c9)]">
                        {player1.name}
                      </h2>
                    </div>
                  </div>

                  {/* Quick Metric Bar */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl text-center">
                    <div>
                      <span className="text-[9px] font-bold text-[#ad8885] uppercase block">Rating</span>
                      <span className="font-mono font-bold text-xl text-[var(--color-text-primary,#ede1c9)]">
                        {player1.currentRating}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#ad8885] uppercase block">Win Rate</span>
                      <span className="font-mono font-bold text-xl text-[var(--color-text-primary,#ede1c9)]">
                        {player1.winPercentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#ad8885] uppercase block">Matches</span>
                      <span className="font-mono font-bold text-xl text-[var(--color-text-primary,#ede1c9)]">
                        {player1.matchesPlayed}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[var(--color-text-muted,#786d57)]">
                  Pick Athlete #1 to begin comparison
                </div>
              )}
            </div>

            {player1 && (
              <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle,#2f2919)] flex items-center justify-between text-xs">
                <Link
                  to={`/players/${player1.playerId}`}
                  className="text-[#ffb3ad] hover:text-white underline underline-offset-2 font-mono text-[11px]"
                >
                  View Full Profile →
                </Link>
                <Link
                  to={`/matches/submit?opponent=${player1.playerId}`}
                  className="px-3 py-1.5 bg-[var(--color-bg-base,#181305)] hover:bg-[#ff3b3f] text-[var(--color-text-primary,#ede1c9)] hover:text-white border border-[var(--color-border-subtle,#3b3423)] rounded-lg font-bold text-[10px] tracking-wider uppercase transition-all"
                >
                  Challenge
                </Link>
              </div>
            )}
          </div>

          {/* Player 2 Slot */}
          <div className="p-6 sm:p-8 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="mb-4">
                <InlinePlayerPicker
                  label="Select Athlete #2"
                  placeholder="Search by name or ID (PH-XXXXX)..."
                  selectedPlayer={player2}
                  onSelect={handleSelectP2}
                  onClear={() => {
                    setPlayer2(null);
                    setComparisonData(null);
                  }}
                  excludedPlayerIds={player1 ? [player1.playerId, player1._id] : []}
                  showQrScan={false}
                />
              </div>

              {player2 ? (
                <div className="pt-4 border-t border-[var(--color-border-subtle,#2f2919)]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#10586B] text-white font-['Playfair_Display'] font-bold text-2xl flex items-center justify-center shrink-0 border border-[#3b3423] shadow-md">
                      {player2.profilePhoto ? (
                        <img src={player2.profilePhoto} alt={player2.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        player2.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold text-[#ffb3ad] px-1.5 py-0.5 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded">
                          {player2.playerId}
                        </span>
                        <TierBadge category={player2.category} />
                      </div>
                      <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[var(--color-text-primary,#ede1c9)]">
                        {player2.name}
                      </h2>
                    </div>
                  </div>

                  {/* Quick Metric Bar */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl text-center">
                    <div>
                      <span className="text-[9px] font-bold text-[#ad8885] uppercase block">Rating</span>
                      <span className="font-mono font-bold text-xl text-[var(--color-text-primary,#ede1c9)]">
                        {player2.currentRating}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#ad8885] uppercase block">Win Rate</span>
                      <span className="font-mono font-bold text-xl text-[var(--color-text-primary,#ede1c9)]">
                        {player2.winPercentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#ad8885] uppercase block">Matches</span>
                      <span className="font-mono font-bold text-xl text-[var(--color-text-primary,#ede1c9)]">
                        {player2.matchesPlayed}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[var(--color-text-muted,#786d57)]">
                  Pick Athlete #2 to begin comparison
                </div>
              )}
            </div>

            {player2 && (
              <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle,#2f2919)] flex items-center justify-between text-xs">
                <Link
                  to={`/players/${player2.playerId}`}
                  className="text-[#ffb3ad] hover:text-white underline underline-offset-2 font-mono text-[11px]"
                >
                  View Full Profile →
                </Link>
                <Link
                  to={`/matches/submit?opponent=${player2.playerId}`}
                  className="px-3 py-1.5 bg-[var(--color-bg-base,#181305)] hover:bg-[#ff3b3f] text-[var(--color-text-primary,#ede1c9)] hover:text-white border border-[var(--color-border-subtle,#3b3423)] rounded-lg font-bold text-[10px] tracking-wider uppercase transition-all"
                >
                  Challenge
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Head-to-Head Win Probability Analytics */}
        {analytics && player1 && player2 && (
          <div className="p-8 sm:p-10 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-3xl shadow-xl mb-12">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary,#ff3b3f)] uppercase block mb-2">
              ALGORITHMIC MATCH PREDICTION
            </span>
            <h3 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[var(--color-text-primary,#ede1c9)] mb-6">
              Expected Win Probability
            </h3>

            {/* Probability Gauge Bar */}
            {(() => {
              const p1Prob = analytics.player1WinProbability <= 1
                ? analytics.player1WinProbability * 100
                : analytics.player1WinProbability;
              const p2Prob = analytics.player2WinProbability <= 1
                ? analytics.player2WinProbability * 100
                : analytics.player2WinProbability;

              return (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
                    <span className="text-[#ff3b3f]">
                      {player1.name}: {p1Prob.toFixed(0)}%
                    </span>
                    <span className="text-[#10586B]">
                      {player2.name}: {p2Prob.toFixed(0)}%
                    </span>
                  </div>

                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(p1Prob)}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label={`${player1.name} win probability: ${p1Prob.toFixed(0)}%`}
                      className="w-full h-4 bg-[var(--color-bg-base,#181305)] rounded-full overflow-hidden border border-[var(--color-border-subtle,#3b3423)] flex"
                    >
                      <div
                        className="bg-[#ff3b3f] h-full transition-all duration-700"
                        style={{ width: `${p1Prob}%` }}
                      />
                      <div
                        className="bg-[#10586B] h-full transition-all duration-700"
                        style={{ width: `${p2Prob}%` }}
                      />
                    </div>
                </div>
              );
            })()}

            {/* Gap Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border-subtle,#2f2919)] text-center text-xs">
              <div className="p-3 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl">
                <span className="text-[9px] font-bold text-[#ad8885] uppercase block mb-1">Rating Delta</span>
                <span className="font-mono font-bold text-base text-[var(--color-text-primary,#ede1c9)]">
                  {analytics.ratingGap > 0 ? `+${analytics.ratingGap}` : analytics.ratingGap} Elo
                </span>
              </div>
              <div className="p-3 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl">
                <span className="text-[9px] font-bold text-[#ad8885] uppercase block mb-1">Favored Athlete</span>
                <span className="font-bold text-sm text-[#4ade80]">
                  {analytics.higherRatedPlayer ? analytics.higherRatedPlayer.name : 'Evenly Matched'}
                </span>
              </div>
              <div className="p-3 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl">
                <span className="text-[9px] font-bold text-[#ad8885] uppercase block mb-1">Direct Encounters</span>
                <span className="font-mono font-bold text-base text-[var(--color-text-primary,#ede1c9)]">
                  {headToHead?.totalMatches || 0} Matches
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Historical Head-to-Head Match Archive */}
        {headToHead && player1 && player2 && (
          <div className="p-8 sm:p-10 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-3xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--color-border-subtle,#2f2919)]">
              <div>
                <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary,#ff3b3f)] uppercase block mb-1">
                  DIRECT ENCOUNTERS
                </span>
                <h3 className="font-['Playfair_Display'] text-2xl font-bold text-[var(--color-text-primary,#ede1c9)]">
                  Historical Match Archive ({headToHead.totalMatches})
                </h3>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono font-bold">
                <span className="text-[#ff3b3f]">{player1.name}: {headToHead.player1Wins} Wins</span>
                <span className="text-[#9a8e7a]">|</span>
                <span className="text-[#10586B]">{player2.name}: {headToHead.player2Wins} Wins</span>
              </div>
            </div>

            {headToHead.matches && headToHead.matches.length > 0 ? (
              <div className="space-y-3">
                {headToHead.matches.map((m) => (
                  <div
                    key={m._id}
                    className="p-4 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-bold text-[#ad8885] px-2 py-0.5 bg-[#201b0c] border border-[#3b3423] rounded">
                        {m.court}
                      </span>
                      <span className="font-mono text-[#9a8e7a]">
                        {new Date(m.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono font-bold text-sm">
                      {m.scores?.map((g, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-[#201b0c] border border-[#3b3423] rounded text-[#ede1c9]"
                        >
                          {g.teamAScore} - {g.teamBScore}
                        </span>
                      ))}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {m.winnerTeam === 'A' ? `${player1.name} Won` : `${player2.name} Won`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[var(--color-text-muted,#9a8e7a)]">
                No direct matches recorded between {player1.name} and {player2.name} yet.
                <div className="mt-3">
                  <Link
                    to={`/matches/submit?opponent=${player2.playerId}`}
                    className="text-[#ff3b3f] hover:underline font-bold"
                  >
                    Be the first to log a match →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default ComparePage;
