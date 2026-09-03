/**
 * RatingHistoryChart Component
 *
 * Interactive Elo trajectory chart powered by Recharts (Milestone 9 — Deliverable D1).
 * Features:
 * - Historical timeline of rating transitions from RatingHistory
 * - Smooth gradient AreaChart with animated dots on rating changes
 * - Skill division benchmark reference lines (1000, 1200, 1400)
 * - Custom interactive tooltip displaying date, rating, delta (+/-), change type, and match/reason provenance
 */

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isGain = data.delta > 0;
    const isLoss = data.delta < 0;

    return (
      <div className="p-3.5 bg-[#1a1508] border border-[#ff3b3f] rounded-xl shadow-2xl text-xs font-sans text-[#ede1c9] min-w-[200px] z-50">
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-[#3b3423]">
          <span className="text-[10px] font-mono font-bold text-[#9a8e7a]">
            {new Date(data.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-[#251f10] border border-[#3b3423] text-[#ffb3ad] rounded">
            {data.changeType?.replace('_', ' ') || 'EVENT'}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-[#9a8e7a]">Rating:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-base text-[#ede1c9]">
              {data.rating} Elo
            </span>
            {data.delta !== 0 && (
              <span
                className={`font-mono font-bold text-[11px] ${
                  isGain ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-[#9a8e7a]'
                }`}
              >
                {isGain ? `+${data.delta}` : data.delta}
              </span>
            )}
          </div>
        </div>

        {data.reason && (
          <div className="text-[10px] text-[#ad8885] italic mt-1 pt-1 border-t border-[#2f2919]">
            {data.reason}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const RatingHistoryChart = ({ history = [], currentRating = 1000, className = '' }) => {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      return [
        {
          date: new Date().toISOString(),
          rating: currentRating,
          delta: 0,
          changeType: 'INITIAL_REGISTRATION',
          reason: 'Baseline Club Starting Rating',
        },
      ];
    }
    return history.map((item, idx) => ({
      index: idx + 1,
      date: item.date || new Date().toISOString(),
      rating: item.rating,
      ratingBefore: item.ratingBefore,
      delta: item.delta || 0,
      changeType: item.changeType,
      reason: item.reason,
      category: item.category,
    }));
  }, [history, currentRating]);

  // Calculate chart boundaries with padding
  const ratings = chartData.map((d) => d.rating);
  const minRating = Math.max(800, Math.min(...ratings, 950) - 50);
  const maxRating = Math.max(...ratings, 1450) + 50;

  return (
    <div
      className={`p-6 sm:p-8 bg-[var(--color-bg-card,#201b0c)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--color-border-subtle,#2f2919)]">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary,#ff3b3f)] uppercase block mb-1">
            PERFORMANCE TRAJECTORY
          </span>
          <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary,#ede1c9)]">
            Official Elo Rating History
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[var(--color-text-muted,#9a8e7a)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#839958]" />
            <span>Adv. Int (1200)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#10586B]" />
            <span>Pro (1400)</span>
          </span>
        </div>
      </div>

      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent-primary, #ff3b3f)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-accent-primary, #ff3b3f)" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#3b3423" opacity={0.4} />

            <XAxis
              dataKey="date"
              tickFormatter={(str) =>
                new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
              stroke="#786d57"
              tick={{ fontSize: 10, fill: '#9a8e7a', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#3b3423' }}
            />

            <YAxis
              domain={[minRating, maxRating]}
              stroke="#786d57"
              tick={{ fontSize: 10, fill: '#9a8e7a', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#3b3423' }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Division Benchmarks */}
            <ReferenceLine y={1000} stroke="#b9ae7e" strokeDasharray="3 3" opacity={0.6} />
            <ReferenceLine y={1200} stroke="#839958" strokeDasharray="3 3" opacity={0.7} />
            <ReferenceLine y={1400} stroke="#10586B" strokeDasharray="3 3" opacity={0.8} />

            <Area
              type="monotone"
              dataKey="rating"
              stroke="var(--color-accent-primary, #ff3b3f)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#ratingGradient)"
              dot={{
                r: 4,
                fill: '#1a1508',
                stroke: 'var(--color-accent-primary, #ff3b3f)',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: 'var(--color-accent-primary, #ff3b3f)',
                stroke: '#ede1c9',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle,#2f2919)] flex items-center justify-between text-[11px] text-[var(--color-text-muted,#786d57)] font-mono">
        <span>Recorded data points: {chartData.length}</span>
        <span>Latest: {chartData[chartData.length - 1]?.rating} Elo</span>
      </div>
    </div>
  );
};

export default RatingHistoryChart;
