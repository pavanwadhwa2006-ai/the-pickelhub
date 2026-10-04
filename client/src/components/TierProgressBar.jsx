/**
 * TierProgressBar Component
 *
 * Visual gamification widget displaying the player's current division,
 * exact Elo rating, points needed to advance to the next tier, and an animated progress bar.
 */

import TierBadge from './TierBadge';

const TierProgressBar = ({ rating = 1000, category = 'Beginner', className = '' }) => {
  let floor = 1000;
  let ceiling = 1100;
  let nextTier = 'Intermediate';
  let targetRating = 1100;
  let pointsNeeded = 0;
  let progressPercent = 0;
  let isMaxTier = false;

  if (rating < 1100) {
    floor = 1000;
    ceiling = 1100;
    targetRating = 1100;
    nextTier = 'Intermediate';
    pointsNeeded = Math.max(0, 1100 - rating);
    progressPercent = rating >= 1000
      ? Math.max(5, Math.min(100, Math.round(((rating - 1000) / 100) * 100)))
      : Math.max(5, Math.min(100, Math.round((rating / 1100) * 100)));
  } else if (rating < 1300) {
    floor = 1100;
    ceiling = 1300;
    targetRating = 1300;
    nextTier = 'Adv. Intermediate';
    pointsNeeded = 1300 - rating;
    progressPercent = Math.max(5, Math.min(100, Math.round(((rating - 1100) / 200) * 100)));
  } else if (rating < 1500) {
    floor = 1300;
    ceiling = 1500;
    targetRating = 1500;
    nextTier = 'Pro Division';
    pointsNeeded = 1500 - rating;
    progressPercent = Math.max(5, Math.min(100, Math.round(((rating - 1300) / 200) * 100)));
  } else if (rating < 1800) {
    floor = 1500;
    ceiling = 1800;
    targetRating = 1800;
    nextTier = 'God Level';
    pointsNeeded = 1800 - rating;
    progressPercent = Math.max(5, Math.min(100, Math.round(((rating - 1500) / 300) * 100)));
  } else {
    floor = 1800;
    ceiling = 2500;
    targetRating = rating;
    nextTier = 'God Level';
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
            <span className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center sm:justify-end gap-1.5 font-mono">
              <span>⚡</span>
              <span>God Level Ascendant</span>
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
