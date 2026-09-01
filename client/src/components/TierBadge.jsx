/**
 * TierBadge Component
 *
 * Renders skill tier badge with distinct, meaningful color tokens:
 * - Pro Division: Midnight Green (#10586B)
 * - Adv. Intermediate: Moss Green (#839958)
 * - Intermediate: Rosy Brown (#D3968C)
 * - Beginner: Quicksand (#B9AE7E)
 */

const getTierKey = (category = '') => {
  const cat = category.toLowerCase().replace(/[\s.-]+/g, '_');
  if (cat.includes('pro')) return 'pro';
  if (cat.includes('adv') || cat.includes('advanced')) return 'advanced_intermediate';
  if (cat.includes('beg') || cat.includes('novice')) return 'beginner';
  return 'intermediate';
};

const getTierLabel = (category = '') => {
  const key = getTierKey(category);
  switch (key) {
    case 'pro':
      return 'PRO DIVISION';
    case 'advanced_intermediate':
      return 'ADV. INTERMEDIATE';
    case 'beginner':
      return 'BEGINNER';
    default:
      return 'INTERMEDIATE';
  }
};

const TierBadge = ({ category = 'Intermediate', className = '', size = 'md' }) => {
  const tierKey = getTierKey(category);
  const label = getTierLabel(category);

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]';

  return (
    <span
      data-tier={tierKey}
      className={`tier-badge inline-flex items-center font-bold tracking-wider uppercase border font-mono ${sizeClasses} ${className}`}
    >
      {label}
    </span>
  );
};

export default TierBadge;
