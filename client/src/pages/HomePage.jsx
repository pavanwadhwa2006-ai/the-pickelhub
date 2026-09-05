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
    <PageTransition className="flex flex-col min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] transition-colors duration-200">
      {/* Hero Section with Ambient Particles & Choreographed Reveals */}
      <section className="relative overflow-hidden border-b border-[var(--color-border-subtle)] py-20 md:py-28 px-6 sm:px-10 md:px-20">
        {/* Ambient floating particle field */}
        <ParticleCanvas count={22} color="rgba(255, 179, 173, 0.14)" speed={0.4} />

        {/* Ambient subtle background glow */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-32 w-96 h-96 bg-[var(--color-accent-primary)]/10 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-[var(--color-accent-secondary)]/5 rounded-full blur-3xl pointer-events-none"
        />

        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Main Hero Copy */}
          <div className="lg:col-span-8 flex flex-col items-start">
            {/* Preheader with line reveal */}
            <div className="flex items-center gap-3 mb-6 animate-slide-in-down">
              <span className="h-[1.5px] w-12 bg-[var(--color-accent-primary)] shadow-[0_0_8px_rgba(255,59,63,0.8)]" />
              <span className="text-xs font-bold tracking-[0.25em] text-[var(--color-accent-primary)] uppercase">
                OFFICIAL CLUB RATING & COMPETITIVE LEAGUE
              </span>
            </div>

            {/* Headline with cinematic presence */}
            <h1 className="font-['Playfair_Display'] text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-[var(--color-text-primary)] mb-8 animate-fade-in-up">
              PLAY.<br />
              GET RATED.<br />
              <span className="text-[var(--color-accent-primary)] italic underline decoration-[var(--color-accent-primary)]/30 underline-offset-8">
                CLIMB.
              </span>
            </h1>

            {/* Athlete-Voiced Copy */}
            <p
              style={{ animationDelay: '150ms' }}
              className="text-lg sm:text-xl text-[var(--color-text-secondary)] font-light max-w-2xl leading-relaxed mb-10 animate-fade-in-up"
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
                  className="px-9 py-4 bg-[var(--color-accent-primary)] hover:brightness-110 text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(255,59,63,0.35)] animate-glow-pulse"
                >
                  GO TO ATHLETE DASHBOARD →
                </MagneticButton>
              ) : (
                <>
                  <MagneticButton
                    to="/register"
                    className="px-9 py-4 bg-[var(--color-accent-primary)] hover:brightness-110 text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(255,59,63,0.35)] animate-glow-pulse"
                  >
                    CLAIM YOUR RATING PROFILE →
                  </MagneticButton>
                  <Link
                    to="/login"
                    className="text-xs font-bold tracking-[0.15em] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] uppercase underline underline-offset-4 transition-colors min-h-[44px] flex items-center"
                  >
                    MEMBER SIGN IN
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Hero Side 3D Interactive Tilt Cards */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <TiltCard className="p-8 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)]/60 transition-colors shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted)] uppercase">
                  STARTING RATING BASE
                </span>
                <span className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-ping" />
              </div>
              <div className="font-['Playfair_Display'] text-5xl font-bold text-[var(--color-text-primary)] mb-2 flex items-baseline gap-2">
                <AnimatedNumber value={1000} duration={1100} />
                <span className="text-xs font-sans font-normal text-[var(--color-accent-primary)]">Elo</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Standardized baseline for all registered club athletes upon profile creation.
              </p>
            </TiltCard>

            <TiltCard className="p-8 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)]/60 transition-colors shadow-xl">
              <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted)] uppercase mb-1">
                DYNAMIC SKILL TIERS
              </div>
              <div className="space-y-2.5 mt-3">
                <div className="flex justify-between text-xs py-1.5 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-card-hover)] px-1 transition-colors">
                  <span className="text-[var(--color-text-muted)]">Beginner</span>
                  <span className="font-bold text-[var(--color-text-primary)]">0 – 999</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-card-hover)] px-1 transition-colors">
                  <span className="text-[var(--color-accent-primary)]">Intermediate</span>
                  <span className="font-bold text-[var(--color-text-primary)]">1000 – 1199</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-card-hover)] px-1 transition-colors">
                  <span className="text-[var(--color-text-primary)]">Adv. Intermediate</span>
                  <span className="font-bold text-[var(--color-text-primary)]">1200 – 1399</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 hover:bg-[var(--color-bg-card-hover)] px-1 transition-colors">
                  <span className="text-[var(--color-accent-primary)] font-bold">Pro Division</span>
                  <span className="font-bold text-[var(--color-accent-primary)]">1400+</span>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Social Proof & Credibility Trust Strip */}
      <TrustStrip />

      {/* Core Workflow Pillars with Clean Trust Copy */}
      <section className="py-24 px-6 sm:px-10 md:px-20 border-b border-[var(--color-border-subtle)] relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto">
          <RevealOnScroll variant="fade-rise" className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-[0.25em] text-[var(--color-accent-primary)] uppercase block mb-3">
              THE PROVEN PATH
            </span>
            <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
              How The PickleHub Rating Works
            </h2>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealOnScroll variant="fade-rise" delay={0}>
              <TiltCard className="p-8 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex flex-col justify-between h-full hover-lift">
                <div>
                  <span className="text-3xl font-mono font-bold text-[var(--color-accent-primary)] block mb-4">
                    01
                  </span>
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)] mb-3">
                    Play & Record Scores
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    Wrap up your game on court, enter match participants, and submit game scores directly from your mobile dashboard.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[var(--color-border-subtle)] text-[11px] font-bold tracking-widest text-[var(--color-text-muted)] uppercase flex items-center justify-between">
                  <span>STEP 1: MATCH ENTRY</span>
                  <span className="text-[var(--color-accent-primary)]">→</span>
                </div>
              </TiltCard>
            </RevealOnScroll>

            <RevealOnScroll variant="fade-rise" delay={120}>
              <TiltCard className="p-8 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex flex-col justify-between h-full hover-lift">
                <div>
                  <span className="text-3xl font-mono font-bold text-[var(--color-accent-primary)] block mb-4">
                    02
                  </span>
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)] mb-3">
                    Fair-Play Verification
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    Club administrators verify scores to ensure fair play, prevent fraudulent score entries, and maintain rating integrity.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[var(--color-border-subtle)] text-[11px] font-bold tracking-widest text-[var(--color-text-muted)] uppercase flex items-center justify-between">
                  <span>STEP 2: ADMIN REVIEW</span>
                  <span className="text-[var(--color-accent-primary)]">→</span>
                </div>
              </TiltCard>
            </RevealOnScroll>

            <RevealOnScroll variant="fade-rise" delay={240}>
              <TiltCard className="p-8 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex flex-col justify-between h-full hover-lift">
                <div>
                  <span className="text-3xl font-mono font-bold text-[var(--color-accent-primary)] block mb-4">
                    03
                  </span>
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)] mb-3">
                    Dynamic Elo Updates
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    Ratings adjust dynamically based on opponent strength and partner ratings. Climb official club leaderboards and earn your division rank.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-[var(--color-border-subtle)] text-[11px] font-bold tracking-widest text-[var(--color-text-muted)] uppercase flex items-center justify-between">
                  <span>STEP 3: RANKING UPDATE</span>
                  <span className="text-[var(--color-accent-primary)]">✓</span>
                </div>
              </TiltCard>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* Footer with subtle micro-interactions */}
      <footer className="py-12 px-6 sm:px-10 md:px-20 bg-[var(--color-bg-base)] mt-auto border-t border-[var(--color-border-subtle)]">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-6 h-6 bg-[var(--color-accent-primary)] flex items-center justify-center text-white font-bold text-xs font-mono group-hover:rotate-12 transition-transform duration-300">
              P
            </div>
            <span className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary)]">
              THE PICKLEHUB
            </span>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} The PickleHub. All rights reserved. Competitive Sports-Tech Architecture.
          </span>
        </div>
      </footer>
    </PageTransition>
  );
};

export default HomePage;
