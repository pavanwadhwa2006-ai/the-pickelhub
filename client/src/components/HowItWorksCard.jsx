/**
 * HowItWorksCard Component
 *
 * 3-step visual onboarding explainer designed to help new players immediately
 * understand the Elo rating system, match submission, and skill tier advancement.
 */

const HowItWorksCard = ({ className = '' }) => {
  const steps = [
    {
      step: '01',
      title: '1000 Starting Elo',
      desc: 'Every club member receives an official starting rating of 1000 in the Intermediate division.',
      icon: '🎾',
      badge: 'BASELINE RATING',
    },
    {
      step: '02',
      title: 'Play on Court 1 or 2',
      desc: 'Play singles or doubles at the club. Log scores courtside in 15 seconds or scan an opponent’s QR pass.',
      icon: '⚡',
      badge: 'COURTSIDE SPEED',
    },
    {
      step: '03',
      title: 'Verified & Level Up',
      desc: 'Club administrators verify scores with atomic rating updates. Climb from Beginner to Pro division!',
      icon: '🏆',
      badge: 'TIER PROGRESSION',
    },
  ];

  return (
    <div
      className={`p-6 sm:p-8 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[var(--color-border-subtle,#2f2919)]">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary,#ff3b3f)] uppercase block mb-1">
            NEW PLAYER GUIDE
          </span>
          <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-[var(--color-text-primary,#ede1c9)]">
            How The PickleHub Works
          </h2>
        </div>
        <span className="text-xs text-[var(--color-text-muted,#ad8885)] font-mono">
          Fair Play • Verified Ratings • Club Community
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s) => (
          <div
            key={s.step}
            className="p-5 bg-[var(--color-bg-base,#181305)] border border-[var(--color-border-subtle,#2f2919)] hover:border-[var(--color-accent-primary,#ff3b3f)]/40 rounded-xl transition-all flex flex-col justify-between relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-[10px] font-mono font-bold text-[var(--color-accent-primary,#ff3b3f)] bg-[var(--color-accent-primary,#ff3b3f)]/10 px-2 py-0.5 rounded-full border border-[var(--color-accent-primary,#ff3b3f)]/30">
                  STEP {s.step}
                </span>
              </div>
              <h3 className="font-['Playfair_Display'] text-base font-bold text-[var(--color-text-primary,#ede1c9)] mb-1.5 group-hover:text-[var(--color-accent-primary,#ff3b3f)] transition-colors">
                {s.title}
              </h3>
              <p className="text-xs text-[var(--color-text-muted,#9a8e7a)] leading-relaxed mb-4">
                {s.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--color-border-subtle,#2f2919)]">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted,#786d57)]">
                {s.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorksCard;
