/**
 * TierProgressBar Component
 *
 * Visual gamification widget displaying the player's current division,
 * dual-gate unlocking requirements (Elo + Match Victories),
 * next tier milestone tracker, and an interactive Division Roadmap.
 *
 * Players are incentivized to push themselves to win matches to unlock
 * higher divisions!
 */

import React, { useState } from 'react';
import TierBadge from './TierBadge';

export const TIER_DEFINITIONS = [
  {
    key: 'beginner',
    name: 'Beginner',
    minElo: 0,
    minWins: 0,
    minMatches: 0,
    icon: '🏓',
    color: '#B9AE7E',
    tagline: 'Club Baseline',
    description: 'Welcome to the club. Perfect your serve, learn court dynamics, and earn your first official victories.',
    perks: ['Open club play access', 'Official Elo rating tracking', 'Social match challenges'],
  },
  {
    key: 'intermediate',
    name: 'Intermediate',
    minElo: 1100,
    minWins: 3,
    minMatches: 5,
    icon: '🔥',
    color: '#D3968C',
    tagline: 'Competitive Contender',
    description: 'Proven competitors who have pushed through adversity and secured at least 3 match victories.',
    perks: ['Unlock Intermediate Tournaments', 'Rosy Brown division crest', 'Leaderboard highlighted profile'],
  },
  {
    key: 'advanced_intermediate',
    name: 'Advanced Intermediate',
    minElo: 1300,
    minWins: 10,
    minMatches: 15,
    icon: '⚔️',
    color: '#839958',
    tagline: 'Tactical Veteran',
    description: 'Tactical masters with deep dinking prowess, sustained consistency, and 10+ sanctioned victories.',
    perks: ['Championship bracket entry', 'Moss Green veteran crest', 'Priority court reservations'],
  },
  {
    key: 'pro',
    name: 'Pro',
    minElo: 1500,
    minWins: 25,
    minMatches: 30,
    icon: '🏆',
    color: '#10586B',
    tagline: 'Elite Champion',
    description: 'The pinnacle of club performance. Proven over 25+ victories against top-tier competition.',
    perks: ['Pro Invitational Tournaments', 'Midnight Green elite badge', 'Featured in Hall of Fame'],
  },
  {
    key: 'god_level',
    name: 'God Level',
    minElo: 1800,
    minWins: 50,
    minMatches: 50,
    icon: '⚡',
    color: '#FFD700',
    tagline: 'Pinnacle Echelon',
    description: 'Legendary pickleball mastery. 1800+ Elo rating with 50+ career victories.',
    perks: ['Club Legend status', 'Gold aura & animated badge', 'Permanent club legacy banner'],
  },
];

const TierProgressBar = ({
  rating = 1000,
  category = 'Beginner',
  wins = 0,
  matchesPlayed = 0,
  playerId = null,
  className = '',
}) => {
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  const r = typeof rating === 'number' ? rating : 1000;
  const w = typeof wins === 'number' ? wins : 0;
  const m = typeof matchesPlayed === 'number' ? matchesPlayed : 0;

  // Determine current active tier index based on rating AND wins
  let currentTierIndex = 0;
  for (let i = TIER_DEFINITIONS.length - 1; i >= 0; i--) {
    const tier = TIER_DEFINITIONS[i];
    if (r >= tier.minElo && w >= tier.minWins && m >= tier.minMatches) {
      currentTierIndex = i;
      break;
    }
  }

  const currentTier = TIER_DEFINITIONS[currentTierIndex];
  const isMaxTier = currentTierIndex >= TIER_DEFINITIONS.length - 1;
  const nextTier = !isMaxTier ? TIER_DEFINITIONS[currentTierIndex + 1] : null;

  // Calculate gaps to next tier
  const eloNeeded = nextTier ? Math.max(0, nextTier.minElo - r) : 0;
  const winsNeeded = nextTier ? Math.max(0, nextTier.minWins - w) : 0;
  const matchesNeeded = nextTier ? Math.max(0, nextTier.minMatches - m) : 0;

  const eloMet = nextTier ? r >= nextTier.minElo : true;
  const winsMet = nextTier ? w >= nextTier.minWins : true;

  // Progress percentages
  const eloFloor = currentTier.minElo;
  const eloCeil = nextTier ? nextTier.minElo : 2500;
  const eloProgress = nextTier
    ? Math.max(5, Math.min(100, Math.round(((r - eloFloor) / Math.max(1, eloCeil - eloFloor)) * 100)))
    : 100;

  const winsProgress = nextTier
    ? Math.max(0, Math.min(100, Math.round((w / Math.max(1, nextTier.minWins)) * 100)))
    : 100;

  // Overall combined progress toward unlocking next tier (average of elo + wins progress)
  const combinedProgress = Math.round((eloProgress + winsProgress) / 2);

  return (
    <>
      <div
        className={`p-6 sm:p-7 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] hover:border-[var(--color-accent-primary)]/40 rounded-2xl shadow-md transition-all ${className}`}
      >
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-accent-primary,#ff3b3f)] uppercase">
                DIVISION PROGRESSION & TIER UNLOCK
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary,#ff3b3f)] animate-pulse" />
            </div>
            <div className="flex items-center flex-wrap gap-3">
              <h3 className="font-['Playfair_Display'] text-2xl font-bold text-[var(--color-text-primary,#ede1c9)] flex items-baseline gap-2">
                <span>{r}</span>
                <span className="text-xs font-mono font-normal text-[var(--color-text-muted,#9a8e7a)]">Elo</span>
              </h3>
              <TierBadge category={currentTier.name} size="md" />
              <span className="text-xs font-mono text-[var(--color-text-muted,#9a8e7a)] bg-[var(--color-bg-base,#140f02)] px-2.5 py-1 rounded-lg border border-[var(--color-border-subtle,#2f2919)]">
                🏆 {w} {w === 1 ? 'Win' : 'Wins'} • {m} {m === 1 ? 'Match' : 'Matches'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="view-division-roadmap-btn"
              onClick={() => setShowRoadmapModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-[var(--color-text-primary,#ede1c9)] bg-[var(--color-bg-base,#140f02)] hover:bg-[var(--color-accent-primary)] hover:text-white border border-[var(--color-border-subtle,#2f2919)] hover:border-transparent rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Click to view full division ladder & requirements"
            >
              <span>🗺️</span>
              <span>Division Roadmap</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-mono px-1.5 py-0.5 rounded">
                5 Tiers
              </span>
            </button>
          </div>
        </div>

        {/* Motivational Call-to-Action Banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[var(--color-bg-base,#140f02)] to-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-2xl p-2 bg-[var(--color-bg-card,#201b0c)] rounded-xl border border-[var(--color-border-subtle,#3b3423)] shrink-0">
              {isMaxTier ? '👑' : nextTier?.icon || '🎯'}
            </span>
            <div>
              {isMaxTier ? (
                <div>
                  <h4 className="text-sm font-bold text-amber-400 font-mono flex items-center gap-2">
                    <span>⚡ Pinnacle Reached: God Level Legend</span>
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted,#ad8885)] mt-0.5">
                    You have unlocked all division tiers. Continue dominating matches to defend your legacy!
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary,#ede1c9)] flex items-center gap-2">
                    <span>Next Milestone:</span>
                    <span className="text-amber-400 font-bold">{nextTier?.name} Division</span>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted,#9a8e7a)] font-normal">
                      ({nextTier?.minElo} Elo & {nextTier?.minWins} Wins)
                    </span>
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted,#ad8885)] mt-0.5">
                    {eloMet && !winsMet ? (
                      <span className="text-amber-300 font-semibold">
                        🎯 Elo threshold crossed! Now push yourself to win{' '}
                        <strong className="text-white underline">{winsNeeded} more {winsNeeded === 1 ? 'match' : 'matches'}</strong>{' '}
                        to unlock {nextTier?.name}!
                      </span>
                    ) : !eloMet && winsMet ? (
                      <span className="text-emerald-300 font-semibold">
                        🏆 Victory quota satisfied ({w}/{nextTier?.minWins} wins)! Push your rating{' '}
                        <strong className="text-white">+{eloNeeded} Elo</strong> to unlock {nextTier?.name}!
                      </span>
                    ) : (
                      <span>
                        Push for victory! Win <strong className="text-white font-bold">{winsNeeded} more {winsNeeded === 1 ? 'match' : 'matches'}</strong> and gain{' '}
                        <strong className="text-white font-bold">{eloNeeded} Elo</strong> to rank up.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {!isMaxTier && (
            <div className="shrink-0 font-mono text-right sm:border-l sm:border-[var(--color-border-subtle,#3b3423)] sm:pl-4">
              <span className="text-[10px] text-[var(--color-text-muted,#9a8e7a)] uppercase block">Unlock Progress</span>
              <span className="text-lg font-bold text-amber-400">{combinedProgress}%</span>
            </div>
          )}
        </div>

        {/* Dual Progress Bars: Victories + Elo Rating */}
        {!isMaxTier && nextTier && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Gate 1: Match Victories Progress */}
            <div className="p-4 bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#2f2919)] rounded-xl">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-[var(--color-text-primary,#ede1c9)] flex items-center gap-1.5">
                  <span>🏆</span>
                  <span>Match Victories Gate</span>
                </span>
                <span className={`font-mono font-bold ${winsMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {w} / {nextTier.minWins} Wins {winsMet ? '✓' : `(${winsNeeded} needed)`}
                </span>
              </div>

              {/* Victories Track */}
              <div className="w-full bg-[var(--color-bg-card,#201b0c)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--color-border-subtle,#2f2919)] shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 relative ${
                    winsMet
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-amber-600 to-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, winsProgress))}%` }}
                >
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow" />
                </div>
              </div>

              {/* Pips display for upcoming wins */}
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted,#786d57)] mt-2">
                <span>0 Wins</span>
                <span className="text-[var(--color-text-primary,#ede1c9)] font-medium">
                  {winsMet ? 'Gate Cleared 🎉' : `${winsNeeded} more victories required to unlock`}
                </span>
                <span>{nextTier.minWins} Wins</span>
              </div>
            </div>

            {/* Gate 2: Elo Rating Progress */}
            <div className="p-4 bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#2f2919)] rounded-xl">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-[var(--color-text-primary,#ede1c9)] flex items-center gap-1.5">
                  <span>📈</span>
                  <span>Skill Rating Gate</span>
                </span>
                <span className={`font-mono font-bold ${eloMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {r} / {nextTier.minElo} Elo {eloMet ? '✓' : `(+${eloNeeded} pts)`}
                </span>
              </div>

              {/* Elo Track */}
              <div className="w-full bg-[var(--color-bg-card,#201b0c)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--color-border-subtle,#2f2919)] shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 relative ${
                    eloMet
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-[var(--color-accent-primary,#ff3b3f)] to-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, eloProgress))}%` }}
                >
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow" />
                </div>
              </div>

              {/* Threshold Labels */}
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted,#786d57)] mt-2">
                <span>{eloFloor} Elo</span>
                <span className="text-[var(--color-text-primary,#ede1c9)] font-medium">
                  {eloMet ? 'Target Crossed 🎯' : `${eloNeeded} Elo to ${nextTier.name}`}
                </span>
                <span>{nextTier.minElo} Elo</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Division Roadmap Modal */}
      {showRoadmapModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowRoadmapModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-[var(--color-bg-card,#1a1508)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--color-border-subtle,#3b3423)] flex items-center justify-between sticky top-0 bg-[var(--color-bg-card,#1a1508)]/95 backdrop-blur z-10">
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-accent-primary,#ff3b3f)] uppercase block mb-1">
                  PICKLEHUB SKILL TIERS & UNLOCK ROADMAP
                </span>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary,#ede1c9)]">
                  Push to Win • Unlock Every Division
                </h3>
              </div>
              <button
                type="button"
                id="close-division-roadmap-btn"
                onClick={() => setShowRoadmapModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--color-bg-base,#140f02)] hover:bg-[var(--color-accent-primary)] text-[var(--color-text-primary,#ede1c9)] hover:text-white border border-[var(--color-border-subtle,#3b3423)] transition-all font-bold text-lg"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Content: Tier Ladder */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--color-text-muted,#ad8885)] mb-4">
                To advance in The PickleHub, players must achieve{' '}
                <strong className="text-[var(--color-text-primary,#ede1c9)]">BOTH the Elo rating threshold AND the required match victories</strong>.
                Lucky rating jumps alone will not promote you — you must prove your mastery on court by winning matches!
              </p>

              <div className="space-y-4">
                {TIER_DEFINITIONS.map((tier, idx) => {
                  const isCurrent = tier.name === currentTier.name;
                  const isUnlocked = idx <= currentTierIndex;
                  const isNext = !isUnlocked && idx === currentTierIndex + 1;

                  const tierEloMet = r >= tier.minElo;
                  const tierWinsMet = w >= tier.minWins;

                  return (
                    <div
                      key={tier.key}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-[var(--color-bg-base,#140f02)] border-2 border-amber-500/80 shadow-lg'
                          : isUnlocked
                          ? 'bg-[var(--color-bg-card,#201b0c)] border-emerald-500/30'
                          : isNext
                          ? 'bg-[var(--color-bg-base,#140f02)] border-[var(--color-accent-primary,#ff3b3f)]/60'
                          : 'bg-[var(--color-bg-card,#201b0c)]/50 border-[var(--color-border-subtle,#2f2919)] opacity-70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-2.5 rounded-xl bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)]">
                            {tier.icon}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary,#ede1c9)]">
                                {tier.name} Division
                              </h4>
                              <TierBadge category={tier.name} size="sm" />
                              {isCurrent && (
                                <span className="text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  ★ Current Active Rank
                                </span>
                              )}
                              {isNext && (
                                <span className="text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--color-accent-primary)]/20 text-rose-300 border border-[var(--color-accent-primary)]/40">
                                  🎯 Next Target
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--color-text-muted,#ad8885)] mt-0.5 font-medium">
                              {tier.tagline} • {tier.description}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 text-left sm:text-right">
                          {isUnlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                              <span>✓</span>
                              <span>UNLOCKED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                              <span>🔒</span>
                              <span>LOCKED</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Criteria Checklist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border-subtle,#2f2919)]">
                        <div className="flex items-center justify-between text-xs bg-[var(--color-bg-base,#140f02)] p-2.5 rounded-lg border border-[var(--color-border-subtle,#2f2919)]">
                          <span className="text-[var(--color-text-muted,#9a8e7a)]">Elo Requirement:</span>
                          <span className={`font-mono font-bold ${tierEloMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {tier.minElo === 0 ? 'Baseline (1000)' : `${tier.minElo}+ Elo`} {tierEloMet ? '✓' : `(${Math.max(0, tier.minElo - r)} needed)`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs bg-[var(--color-bg-base,#140f02)] p-2.5 rounded-lg border border-[var(--color-border-subtle,#2f2919)]">
                          <span className="text-[var(--color-text-muted,#9a8e7a)]">Victory Requirement:</span>
                          <span className={`font-mono font-bold ${tierWinsMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {tier.minWins === 0 ? 'No wins required' : `${tier.minWins}+ Match Wins`} {tierWinsMet ? '✓' : `(${Math.max(0, tier.minWins - w)} wins needed)`}
                          </span>
                        </div>
                      </div>

                      {/* Perks */}
                      <div className="mt-3 flex items-center flex-wrap gap-2">
                        <span className="text-[10px] font-bold text-[var(--color-text-muted,#786d57)] uppercase">Division Perks:</span>
                        {tier.perks.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="text-[10px] font-mono text-[var(--color-text-primary,#ede1c9)] bg-[var(--color-bg-card,#201b0c)] px-2 py-0.5 rounded border border-[var(--color-border-subtle,#2f2919)]"
                          >
                            • {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--color-border-subtle,#3b3423)] flex items-center justify-between bg-[var(--color-bg-card,#1a1508)]">
              <span className="text-xs text-[var(--color-text-muted,#ad8885)]">
                The PickleHub Official Gamification Engine
              </span>
              <button
                type="button"
                onClick={() => setShowRoadmapModal(false)}
                className="px-5 py-2 bg-[var(--color-accent-primary)] hover:brightness-110 text-white text-xs font-bold rounded-xl transition-all shadow"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TierProgressBar;
