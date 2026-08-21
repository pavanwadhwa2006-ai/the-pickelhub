/**
 * EmptyState Component
 *
 * Provides clear, encouraging, athlete-centric empty states with actionable guidance
 * instead of blank or dead-looking screens.
 */

import { Link } from 'react-router-dom';

const EmptyState = ({
  title = 'No Data Recorded Yet',
  description = 'Complete your next activity to see updated statistics and rankings here.',
  actionLabel,
  actionTo,
  actionOnClick,
  badgeText = 'NEW PLAYER INITIALIZATION',
  icon = 'paddle',
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 bg-[#201b0c] border border-[#3b3423] text-center flex flex-col items-center justify-center relative overflow-hidden ${className}`}>
      {/* Subtle background glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#ff3b3f]/5 rounded-full blur-3xl pointer-events-none"
      />

      {badgeText && (
        <span className="text-[9px] font-bold tracking-[0.25em] text-[#ffb3ad] uppercase px-2.5 py-1 bg-[#181305] border border-[#3b3423] mb-4">
          {badgeText}
        </span>
      )}

      {/* Decorative Icon */}
      <div className="w-12 h-12 rounded-full bg-[#181305] border border-[#5d3f3d] flex items-center justify-center text-[#ff3b3f] mb-4 shadow-inner">
        {icon === 'paddle' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {icon === 'trophy' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      <h3 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-[#ede1c9] mb-2 max-w-md">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-[#d8cdb5] font-light max-w-lg leading-relaxed mb-6">
        {description}
      </p>

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="px-6 py-3 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.15em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)] hover:shadow-[0_0_22px_rgba(255,59,63,0.5)]"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && actionOnClick && !actionTo && (
        <button
          type="button"
          onClick={actionOnClick}
          className="px-6 py-3 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.15em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)] hover:shadow-[0_0_22px_rgba(255,59,63,0.5)] cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
