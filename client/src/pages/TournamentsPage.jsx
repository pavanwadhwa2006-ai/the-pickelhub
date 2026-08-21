/**
 * TournamentsPage Component
 *
 * Official club tournaments hub preview.
 * Explains tournament bracket seedings, double-elimination brackets, and weighted tournament ratings.
 */

import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import TiltCard from '../components/TiltCard';
import RevealOnScroll from '../components/RevealOnScroll';

const TournamentsPage = () => {
  const formats = [
    {
      title: 'Double Elimination',
      badge: 'CHAMPIONSHIP FORMAT',
      description: 'Full winner and consolation brackets. Two match losses required before tournament elimination.',
    },
    {
      title: 'Elo Bracket Seeding',
      badge: 'FAIR SEEDING',
      description: 'Seeds are computed automatically from verified club Elo ratings to prevent stacked early rounds.',
    },
    {
      title: 'Rating Weight Multiplier',
      badge: 'HIGH STAKES',
      description: 'Official tournament matches carry a higher K-factor weighting to reward clutch tournament performances.',
    },
  ];

  return (
    <PageTransition className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="pb-8 border-b border-[#3b3423] mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase">
                COMPETITIVE TOURNAMENTS
              </span>
              <span className="px-2 py-0.5 bg-[#251f10] border border-[#ff3b3f]/40 text-[#ffb3ad] text-[10px] font-bold tracking-wider uppercase">
                BRACKET ENGINE
              </span>
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[#ede1c9]">
              Club Tournament Hub
            </h1>
            <p className="text-xs sm:text-sm text-[#9a8e7a] mt-2 max-w-2xl leading-relaxed">
              Official sanctioned club tournaments featuring automated bracket generation, real-time court scheduling, and verified championship point distribution.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="px-6 py-3 bg-[#251f10] hover:bg-[#3b3423] border border-[#3b3423] hover:border-[#ad8885] text-xs font-bold tracking-wider uppercase text-[#ede1c9] hover:text-white transition-all self-start md:self-auto"
          >
            VIEW YOUR RATING →
          </Link>
        </div>

        {/* Tournament Formats Grid */}
        <div className="mb-16">
          <div className="mb-6">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase block mb-1">
              TOURNAMENT ARCHITECTURE
            </span>
            <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#ede1c9]">
              Sanctioned Competition Standards
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {formats.map((fmt, idx) => (
              <RevealOnScroll key={fmt.title} variant="fade-rise" delay={idx * 100}>
                <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover-lift h-full flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold font-mono tracking-widest text-[#ffb3ad] uppercase block mb-3">
                      {fmt.badge}
                    </span>
                    <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-3">
                      {fmt.title}
                    </h3>
                    <p className="text-xs text-[#d8cdb5] leading-relaxed">
                      {fmt.description}
                    </p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-[#3b3423] text-[10px] font-bold tracking-widest text-[#ad8885] uppercase">
                    AUTOMATED BRACKETING
                  </div>
                </TiltCard>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        {/* Tournament Hub Coming Soon Banner */}
        <RevealOnScroll variant="fade-rise">
          <div className="p-8 sm:p-12 bg-[#201b0c] border border-[#3b3423] text-center relative overflow-hidden">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase block mb-3">
              UPCOMING EVENTS
            </span>
            <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[#ede1c9] mb-3">
              Official Club Tournament Schedule Coming Soon
            </h2>
            <p className="text-xs sm:text-sm text-[#d8cdb5] font-light max-w-xl mx-auto leading-relaxed mb-8">
              Tournament registrations, live bracket views, and championship titles will activate once the inaugural club match schedule is published.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/register"
                className="px-8 py-3.5 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)]"
              >
                JOIN THE CLUB TO QUALIFY
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </PageTransition>
  );
};

export default TournamentsPage;
