/**
 * TrustStrip Component
 *
 * Lightweight, honest social proof & ecosystem credibility strip.
 * Features theme-aware styling:
 * - Garnet vintage maroon in Garden Light (matching Navbar)
 * - Dark slate in Classic Dark
 */

const TrustStrip = ({ className = '' }) => {
  const proofItems = [
    {
      label: 'OFFICIAL STATUS',
      value: 'Club Beta',
      detail: 'Active Rating Ecosystem',
      isBadge: true,
    },
    {
      label: 'STARTING RATING',
      value: '1,000 Elo',
      detail: 'Standardized Baseline',
      isBadge: false,
    },
    {
      label: 'GOVERNANCE',
      value: '100% Verified',
      detail: 'Admin Review Before Rating Updates',
      isBadge: false,
    },
    {
      label: 'SKILL DIVISIONS',
      value: '4 Dynamic Tiers',
      detail: 'Beginner to Pro (1400+)',
      isBadge: false,
    },
  ];

  return (
    <div
      className={`w-full border-y transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: 'var(--strip-bg)',
        borderColor: 'var(--strip-border)',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 md:px-20 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {proofItems.map((item, idx) => (
          <div
            key={item.label}
            className={`flex flex-col ${
              idx > 0 ? 'border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6' : ''
            }`}
            style={{ borderColor: 'var(--strip-border)' }}
          >
            <span
              className="text-[9px] font-bold tracking-[0.25em] uppercase mb-1.5"
              style={{ color: 'var(--strip-text-label)' }}
            >
              {item.label}
            </span>

            {item.isBadge ? (
              <div className="flex items-center my-0.5">
                <span
                  className="px-2.5 py-0.5 border text-xs sm:text-sm font-bold font-['Playfair_Display'] shadow-sm tracking-wide"
                  style={{
                    backgroundColor: 'var(--strip-badge-bg)',
                    borderColor: 'var(--strip-badge-border)',
                    color: 'var(--strip-badge-text)',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ) : (
              <div
                className="text-base sm:text-lg font-bold font-['Playfair_Display'] leading-tight"
                style={{ color: 'var(--strip-text-value)' }}
              >
                {item.value}
              </div>
            )}

            <span
              className="text-[11px] font-normal mt-1 leading-snug"
              style={{ color: 'var(--strip-text-sub)' }}
            >
              {item.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustStrip;
