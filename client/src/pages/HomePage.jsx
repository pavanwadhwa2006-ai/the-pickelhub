/**
 * HomePage Component
 *
 * Cinematic Editorial hero landing page showcasing The PickleHub ecosystem.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-[#181305] text-[#ede1c9]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#3b3423] py-20 md:py-32 px-6 sm:px-10 md:px-20">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Main Hero Copy */}
          <div className="lg:col-span-8 flex flex-col items-start">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-[1px] w-12 bg-[#ff3b3f]" />
              <span className="text-xs font-bold tracking-[0.25em] text-[#ffb3ad] uppercase">
                OFFICIAL ELO RATING & MATCH ECOSYSTEM
              </span>
            </div>

            <h1 className="font-['Playfair_Display'] text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-[#ede1c9] mb-8">
              PLAY.<br />
              GET RATED.<br />
              <span className="text-[#ff3b3f] italic">CLIMB.</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#d8cdb5] font-light max-w-2xl leading-relaxed mb-10">
              The exclusive sports-tech platform tracking official matches, Elo-style ratings, dynamic skill tiers, and competitive tournament brackets for pickleball athletes.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="px-8 py-4 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(255,59,63,0.35)] cursor-pointer"
                >
                  GO TO DASHBOARD →
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(255,59,63,0.35)] cursor-pointer"
                  >
                    CLAIM YOUR RATING PROFILE
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 bg-[#251f10] hover:bg-[#3b3423] text-[#ede1c9] border border-[#3b3423] text-xs font-bold tracking-[0.2em] uppercase transition-all cursor-pointer"
                  >
                    MEMBER SIGN IN
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Hero Side Stat Cards / Visual */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="p-8 bg-[#251f10] border border-[#3b3423] relative">
              <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
                STARTING RATING BASE
              </div>
              <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-2">
                1000 <span className="text-xs font-sans font-normal text-[#ffb3ad]">Elo</span>
              </div>
              <p className="text-xs text-[#9a8e7a]">
                Standardized starting point for all registered players upon profile creation.
              </p>
            </div>

            <div className="p-8 bg-[#201b0c] border border-[#3b3423] relative">
              <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
                DYNAMIC SKILL TIERS
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-xs py-1 border-b border-[#2f2919]">
                  <span className="text-[#9a8e7a]">Beginner</span>
                  <span className="font-bold text-[#ede1c9]">0 – 999</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-[#2f2919]">
                  <span className="text-[#ffb3ad]">Intermediate</span>
                  <span className="font-bold text-[#ede1c9]">1000 – 1199</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-[#2f2919]">
                  <span className="text-[#ede1c9]">Adv. Intermediate</span>
                  <span className="font-bold text-[#ede1c9]">1200 – 1399</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-[#ff3b3f] font-bold">Pro Division</span>
                  <span className="font-bold text-[#ff3b3f]">1400+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Workflow Pillars */}
      <section className="py-24 px-6 sm:px-10 md:px-20 border-b border-[#3b3423]">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-[0.25em] text-[#ff3b3f] uppercase block mb-3">
              THE PROVEN PATH
            </span>
            <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[#ede1c9]">
              How The PickleHub Rating Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-[#251f10] border border-[#3b3423] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-mono font-bold text-[#ff3b3f] block mb-4">
                  01
                </span>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-3">
                  Play & Submit
                </h3>
                <p className="text-sm text-[#d8cdb5] leading-relaxed">
                  Conclude your match on court, submit game scores and opponents directly through your mobile dashboard.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#3b3423] text-[11px] font-bold tracking-widest text-[#ad8885] uppercase">
                STATUS: PENDING APPROVAL
              </div>
            </div>

            <div className="p-8 bg-[#251f10] border border-[#3b3423] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-mono font-bold text-[#ff3b3f] block mb-4">
                  02
                </span>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-3">
                  Admin Verification
                </h3>
                <p className="text-sm text-[#d8cdb5] leading-relaxed">
                  Club administrators verify scores to eliminate rating inflation and fraudulent entries before updates occur.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#3b3423] text-[11px] font-bold tracking-widest text-[#ad8885] uppercase">
                ATOMIC DB TRANSACTION
              </div>
            </div>

            <div className="p-8 bg-[#251f10] border border-[#3b3423] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-mono font-bold text-[#ff3b3f] block mb-4">
                  03
                </span>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-3">
                  Automated Elo Updates
                </h3>
                <p className="text-sm text-[#d8cdb5] leading-relaxed">
                  Ratings update dynamically based on opponent strength. Climb the club leaderboard and unlock higher divisions.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#3b3423] text-[11px] font-bold tracking-widest text-[#ad8885] uppercase">
                OFFICIAL LEADERBOARD
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 sm:px-10 md:px-20 bg-[#120e03] mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#ff3b3f] flex items-center justify-center text-white font-bold text-xs font-mono">
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
    </div>
  );
};

export default HomePage;
