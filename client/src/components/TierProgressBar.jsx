/**
 * TierProgressBar Component
 *
 * Visual gamification widget displaying the player's current division,
 * exact Elo rating, points needed to advance to the next tier, and an animated progress bar.
 */

import TierBadge from './TierBadge';

const TierProgressBar = ({ rating = 1000, category = 'Intermediate', className = '' }) => {
  let floor = 1000;
  let ceiling = 1200;
  let nextTier = 'Adv. Intermediate';
  let targetRating = 1200;
  let pointsNeeded = 0;
  let progressPercent = 0;
  let isMaxTier = false;

  if (rating < 1000) {
    floor = 0;
    ceiling = 1000;
    targetRating = 1000;
    nextTier = 'Intermediate';
    pointsNeeded = 1000 - rating;
    progressPercent = Math.max(5, Math.min(100, Math.round((rating / 1000) * 100)));
  } else if (rating < 1200) {
    floor = 1000;
    ceiling = 1200;
    targetRating = 1200;
    nextTier = 'Adv. Intermediate';
    pointsNeeded = 1200 - rating;
    progressPercent = Math.max(5, Math.min(100, Math.round(((rating - 1000) / 200) * 100)));
  } else if (rating < 1400) {
    floor = 1200;
    ceiling = 1400;
    targetRating = 1400;
    nextTier = 'Pro Division';
    pointsNeeded = 1400 - rating;
    progressPercent = Math.max(5, Math.min(100, Math.round(((rating - 1200) / 200) * 100)));
  } else {
    floor = 1400;
    ceiling = 2000;
    targetRating = rating;
    nextTier = 'Peak Division';
    pointsNeeded = 0;
    progressPercent = 100;
    isMaxTier = true;
  }

  return (
    <div
      className={`p-6 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted,#ad8885)] uppercase block mb-1">
            SKILL DIVISION PROGRESSION
          </span>
          <div className="flex items-center gap-3">
            <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary,#ede1c9)]">
              {rating} <span className="text-xs font-mono font-normal text-[var(--color-text-muted,#9a8e7a)]">Elo</span>
            </h3>
            <TierBadge category={category} size="sm" />
          </div>
        </div>

        <div className="text-left sm:text-right">
          {isMaxTier ? (
            <span className="text-xs font-bold text-amber-400 flex items-center sm:justify-end gap-1 font-mono">
              <span>👑</span>
              <span>Pro Division Master</span>
            </span>
          ) : (
            <div className="text-xs font-mono text-[var(--color-text-muted,#9a8e7a)]">
              <span className="font-bold text-[var(--color-accent-primary,#ff3b3f)]">
                {pointsNeeded} Elo
              </span>{' '}
              to {nextTier} ({targetRating})
            </div>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-[var(--color-bg-base,#140f02)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--color-border-subtle,#2f2919)] shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-[var(--color-accent-primary,#ff3b3f)] to-amber-500 rounded-full transition-all duration-700 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow" />
        </div>
      </div>

      {/* Threshold Labels */}
      <div className="flex justify-between text-[10px] font-mono text-[var(--color-text-muted,#786d57)] mt-2">
        <span>{floor} Elo</span>
        <span className="text-center font-bold text-[var(--color-text-primary,#ede1c9)]">
          {progressPercent}% to next rank
        </span>
        <span>{ceiling}+ Elo</span>
      </div>
    </div>
  );
};

export default TierProgressBar;
