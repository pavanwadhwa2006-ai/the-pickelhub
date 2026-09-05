/**
 * HomePage Component
 *
 * Cinematic Editorial hero landing page showcasing The PickleHub ecosystem.
 * Enhanced with athlete-voiced copy, trust social proof strip, 3D cursor tilt cards,
 * animated number counters, and single primary CTA hierarchy.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import PageTransition from '../components/PageTransition';
import ParticleCanvas from '../components/ParticleCanvas';
import TiltCard from '../components/TiltCard';
import AnimatedNumber from '../components/AnimatedNumber';
import RevealOnScroll from '../components/RevealOnScroll';
import MagneticButton from '../components/MagneticButton';
import TrustStrip from '../components/TrustStrip';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <PageTransition className="flex flex-col min-h-screen bg-[#181305] text-[#ede1c9]">
      {/* Hero Section with Ambient Particles & Choreographed Reveals */}
      <section className="relative overflow-hidden border-b border-[#3b3423] py-20 md:py-28 px-6 sm:px-10 md:px-20">
        {/* Ambient floating particle field */}
        <ParticleCanvas count={22} color="rgba(255, 179, 173, 0.14)" speed={0.4} />

        {/* Ambient subtle background glow */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-32 w-96 h-96 bg-[#ff3b3f]/10 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#ffb3ad]/5 rounded-full blur-3xl pointer-events-none"
        />

        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Main Hero Copy */}
          <div className="lg:col-span-8 flex flex-col items-start">
            {/* Preheader with line reveal */}
            <div className="flex items-center gap-3 mb-6 animate-slide-in-down">
              <span className="h-[1.5px] w-12 bg-[#ff3b3f] shadow-[0_0_8px_rgba(255,59,63,0.8)]" />
              <span className="text-xs font-bold tracking-[0.25em] text-[#ffb3ad] uppercase">
                OFFICIAL CLUB RATING & COMPETITIVE LEAGUE
              </span>
            </div>

            {/* Headline with cinematic presence */}
            <h1 className="font-['Playfair_Display'] text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-[#ede1c9] mb-8 animate-fade-in-up">
              PLAY.<br />
              GET RATED.<br />
              <span className="text-[#ff3b3f] italic underline decoration-[#ff3b3f]/30 underline-offset-8">
                CLIMB.
              </span>
            </h1>

            {/* Athlete-Voiced Copy */}
            <p
              style={{ animationDelay: '150ms' }}
              className="text-lg sm:text-xl text-[#d8cdb5] font-light max-w-2xl leading-relaxed mb-10 animate-fade-in-up"
            >
              The competitive rating standard for pickleball. Track verified match results, earn dynamic skill ratings from 1,000 to Pro Division, and climb your club's official leaderboard.
            </p>

            {/* Clear Single Primary CTA Hierarchy */}
            <div
              style={{ animationDelay: '300ms' }}
              className="flex flex-wrap items-center gap-6 animate-fade-in-up"
            >
              {isAuthenticated ? (
                <MagneticButton
                  to="/dashboard"
                  className="px-9 py-4 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(255,59,63,0.35)] animate-glow-pulse"
                >
                  GO TO DASHBOARD →
                </MagneticButton>
              ) : (
                <>
                  <MagneticButton
                    to="/register"
                    className="px-9 py-4 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(255,59,63,0.35)] animate-glow-pulse"
                  >
                    CLAIM YOUR RATING PROFILE →
                  </MagneticButton>
                  <Link
                    to="/login"
                    className="text-xs font-bold tracking-[0.15em] text-[#ad8885] hover:text-[#ede1c9] uppercase underline underline-offset-4 transition-colors min-h-[44px] flex items-center"
                  >
                    MEMBER SIGN IN
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Hero Side 3D Interactive Tilt Cards */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f]/60 transition-colors shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase">
                  STARTING RATING BASE
                </span>
                <span className="w-2 h-2 bg-[#ff3b3f] rounded-full animate-ping" />
              </div>
              <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-2 flex items-baseline gap-2">
                <AnimatedNumber value={1000} duration={1100} />
                <span className="text-xs font-sans font-normal text-[#ffb3ad]">Elo</span>
              </div>
              <p className="text-xs text-[#9a8e7a] leading-relaxed">
                Standardized baseline for all registered club athletes upon profile creation.
              </p>
            </TiltCard>

            <TiltCard className="p-8 bg-[#201b0c] border border-[#3b3423] hover:border-[#ff3b3f]/60 transition-colors shadow-xl">
              <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
                DYNAMIC SKILL TIERS
              </div>
              <div className="space-y-2.5 mt-3">
                <div className="flex justify-between text-xs py-1.5 border-b border-[#2f2919] hover:bg-[#251f10]/60 px-1 transition-colors">
                  <span className="text-[#9a8e7a]">Beginner</span>
                  <span className="font-bold text-[#ede1c9]">0 – 999</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-[#2f2919] hover:bg-[#251f10]/60 px-1 transition-colors">
                  <span className="text-[#ffb3ad]">Intermediate</span>
                  <span className="font-bold text-[#ede1c9]">1000 – 1199</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-[#2f2919] hover:bg-[#251f10]/60 px-1 transition-colors">
                  <span className="text-[#ede1c9]">Adv. Intermediate</span>
                  <span className="font-bold text-[#ede1c9]">1200 – 1399</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 hover:bg-[#251f10]/60 px-1 transition-colors">
                  <span className="text-[#ff3b3f] font-bold">Pro Division</span>
                  <span className="font-bold text-[#ff3b3f]">1400+</span>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Social Proof & Credibility Trust Strip */}
      <TrustStrip />

      {/* Core Workflow Pillars with Clean Trust Copy */}
      <section className="py-24 px-6 sm:px-10 md:px-20 border-b border-[#3b3423] relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto">
          <RevealOnScroll variant="fade-rise" className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-[0.25em] text-[#ff3b3f] uppercase block mb-3">
              THE PROVEN PATH
            </span>
            <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[#ede1c9]">
              How The PickleHub Rating Works
            </h2>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealOnScroll variant="fade-rise" delay={0}>
              <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] flex flex-col justify-between h-full hover-lift">
                <div>
                  <span className="text-3xl font-mono font-bold text-[#ff3b3f] block mb-4">
                    01
                  </span>
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-3">
                    Play & Record Scores
                  </h3>
                  <p className="text-sm text-[#d8cdb5] leading-relaxed">
                    Wrap up your game on court, enter match participants, and submit game scores directly from your mobile dashboard.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[#3b3423] text-[11px] font-bold tracking-widest text-[#ad8885] uppercase flex items-center justify-between">
                  <span>STEP 1: MATCH ENTRY</span>
                  <span className="text-[#ff3b3f]">→</span>
                </div>
              </TiltCard>
            </RevealOnScroll>

            <RevealOnScroll variant="fade-rise" delay={120}>
              <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] flex flex-col justify-between h-full hover-lift">
                <div>
                  <span className="text-3xl font-mono font-bold text-[#ff3b3f] block mb-4">
                    02
                  </span>
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-3">
                    Fair-Play Verification
                  </h3>
                  <p className="text-sm text-[#d8cdb5] leading-relaxed">
                    Club administrators verify scores to ensure fair play, prevent fraudulent score entries, and maintain rating integrity.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[#3b3423] text-[11px] font-bold tracking-widest text-[#ad8885] uppercase flex items-center justify-between">
                  <span>STEP 2: ADMIN REVIEW</span>
                  <span className="text-[#ff3b3f]">→</span>
                </div>
              </TiltCard>
            </RevealOnScroll>

            <RevealOnScroll variant="fade-rise" delay={240}>
              <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] flex flex-col justify-between h-full hover-lift">
                <div>
                  <span className="text-3xl font-mono font-bold text-[#ff3b3f] block mb-4">
                    03
                  </span>
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-3">
                    Dynamic Elo Updates
                  </h3>
                  <p className="text-sm text-[#d8cdb5] leading-relaxed">
                    Ratings adjust dynamically based on opponent strength and partner ratings. Climb official club leaderboards and earn your division rank.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[#3b3423] text-[11px] font-bold tracking-widest text-[#ad8885] uppercase flex items-center justify-between">
                  <span>STEP 3: RANKING UPDATE</span>
                  <span className="text-[#ff3b3f]">✓</span>
                </div>
              </TiltCard>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* Footer with subtle micro-interactions */}
      <footer className="py-12 px-6 sm:px-10 md:px-20 bg-[#120e03] mt-auto border-t border-[#251f10]">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-6 h-6 bg-[#ff3b3f] flex items-center justify-center text-white font-bold text-xs font-mono group-hover:rotate-12 transition-transform duration-300">
              P
            </div>
            <span className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9]">
              THE PICKLEHUB
            </span>
          </div>
          <span className="text-xs text-[#9a8e7a]">
            © {new Date().getFullYear()} The PickleHub. All rights reserved. Competitive Sports-Tech Architecture.
          </span>
        </div>
      </footer>
    </PageTransition>
  );
};

export default HomePage;
