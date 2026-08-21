/**
 * TrustStrip Component
 *
 * Lightweight, honest social proof & ecosystem credibility strip.
 * Highlights the official rating baseline, verified match governance, and tier structure.
 */

const TrustStrip = ({ className = '' }) => {
  const proofItems = [
    {
      label: 'OFFICIAL STATUS',
      value: 'Club Beta',
      detail: 'Active Rating Ecosystem',
      accent: 'border-[#ff3b3f]/40 text-[#ffb3ad]',
    },
    {
      label: 'STARTING RATING',
      value: '1,000 Elo',
      detail: 'Standardized Baseline',
      accent: 'border-[#3b3423] text-[#ede1c9]',
    },
    {
      label: 'GOVERNANCE',
      value: '100% Verified',
      detail: 'Admin Review Before Rating Updates',
      accent: 'border-[#3b3423] text-[#ede1c9]',
    },
    {
      label: 'SKILL DIVISIONS',
      value: '4 Dynamic Tiers',
      detail: 'Beginner to Pro (1400+)',
      accent: 'border-[#3b3423] text-[#ede1c9]',
    },
  ];

  return (
    <div className={`w-full border-y border-[#3b3423] bg-[#120e03]/80 backdrop-blur-sm ${className}`}>
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 md:px-20 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#3b3423]">
        {proofItems.map((item, idx) => (
          <div key={item.label} className={`flex flex-col ${idx > 0 ? 'pt-4 md:pt-0 md:pl-6' : ''}`}>
            <span className="text-[9px] font-bold tracking-[0.25em] text-[#ad8885] uppercase mb-1">
              {item.label}
            </span>
            <div className={`text-base sm:text-lg font-bold font-['Playfair_Display'] ${item.accent.split(' ')[1]}`}>
              {item.value}
            </div>
            <span className="text-[11px] text-[#9a8e7a] font-normal mt-0.5">
              {item.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustStrip;
