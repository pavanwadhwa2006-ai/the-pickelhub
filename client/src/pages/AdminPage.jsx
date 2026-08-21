/**
 * AdminPage Component
 *
 * Administrative panel with role guard (PRD Section 4.2 & Section 11.4).
 * Enhanced with tiered visual hierarchy, live security pulse, and clear workflow badges.
 */

import { useAuth } from '../context/useAuth';
import PageTransition from '../components/PageTransition';
import TiltCard from '../components/TiltCard';
import RevealOnScroll from '../components/RevealOnScroll';

const AdminPage = () => {
  const { user } = useAuth();

  return (
    <PageTransition className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="pb-8 border-b border-[#3b3423] mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase">
                ADMINISTRATION & GOVERNANCE
              </span>
              <span className="px-2 py-0.5 bg-[#93000a]/30 border border-[#ff5451] text-[#ffdad6] text-[10px] font-bold tracking-wider uppercase">
                AUTHORIZED PERSONNEL
              </span>
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[#ede1c9]">
              Club Admin Control
            </h1>
            <p className="text-xs sm:text-sm text-[#9a8e7a] mt-1">
              Active Admin: <span className="text-[#ede1c9] font-semibold">{user?.email}</span> • Authority Level: Full System Administrator
            </p>
          </div>
        </div>

        {/* Core Administrative Pillars Grid with 3D Tilt & Staggered Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Match Verification Queue */}
          <RevealOnScroll variant="fade-rise" delay={0}>
            <TiltCard className="p-8 bg-[#251f10] border border-[#5d3f3d] hover:border-[#ff3b3f] transition-all hover-lift h-full flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl font-mono font-bold text-[#ff3b3f]">01</span>
                  <span className="text-[10px] font-bold font-mono tracking-widest px-2.5 py-1 bg-[#181305] border border-[#ff3b3f]/40 text-[#ffb3ad] uppercase">
                    APPROVAL QUEUE
                  </span>
                </div>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-2">
                  Match Verification Queue
                </h3>
                <p className="text-xs sm:text-sm text-[#d8cdb5] leading-relaxed mb-6">
                  Review and verify player-submitted match scores from the court. Approving updates athlete Elo ratings and dynamic division standings.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#4ade80] uppercase tracking-wider pt-4 border-t border-[#3b3423] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-live-pulse" />
                PIPELINE READY
              </div>
            </TiltCard>
          </RevealOnScroll>

          {/* Direct Official Recording */}
          <RevealOnScroll variant="fade-rise" delay={120}>
            <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all hover-lift h-full flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl font-mono font-bold text-[#ff3b3f]">02</span>
                  <span className="text-[10px] font-bold font-mono tracking-widest px-2.5 py-1 bg-[#181305] border border-[#3b3423] text-[#ad8885] uppercase">
                    OFFICIAL RECORDING
                  </span>
                </div>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-2">
                  Direct Match Recording
                </h3>
                <p className="text-xs sm:text-sm text-[#d8cdb5] leading-relaxed mb-6">
                  Direct official match entry from sanctioned tournament scoreboards and club events, auto-verified with immutable audit entries.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#ffb3ad] uppercase tracking-wider pt-4 border-t border-[#3b3423]">
                ADMIN DIRECT ENTRY
              </div>
            </TiltCard>
          </RevealOnScroll>

          {/* Audit Trail & Governance */}
          <RevealOnScroll variant="fade-rise" delay={240}>
            <TiltCard className="p-8 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all hover-lift h-full flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl font-mono font-bold text-[#ff3b3f]">03</span>
                  <span className="text-[10px] font-bold font-mono tracking-widest px-2.5 py-1 bg-[#181305] border border-[#3b3423] text-[#ad8885] uppercase">
                    SYSTEM AUDIT
                  </span>
                </div>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-2">
                  Audit Logs & Governance
                </h3>
                <p className="text-xs sm:text-sm text-[#d8cdb5] leading-relaxed mb-6">
                  Every match correction, rating dispute resolution, and administrative action creates a tamper-proof audit log for total club transparency.
                </p>
              </div>
              <div className="text-[11px] font-bold text-[#ffb3ad] uppercase tracking-wider pt-4 border-t border-[#3b3423]">
                IMMUTABLE AUDIT LOG
              </div>
            </TiltCard>
          </RevealOnScroll>
        </div>

        {/* Security & Concurrency Notice with Pulsing Indicator */}
        <RevealOnScroll variant="fade-rise">
          <div className="p-8 bg-[#201b0c] border border-[#ff5451]/30 shadow-lg hover:border-[#ff5451]/60 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2.5 h-2.5 bg-[#ff3b3f] rounded-full animate-live-pulse" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#ffb3ad] uppercase">
                ZERO-TRUST ROLE-BASED ACCESS CONTROL
              </span>
            </div>
            <h4 className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9] mb-1">
              Administrative Security & Session Verification
            </h4>
            <p className="text-xs sm:text-sm text-[#d8cdb5] max-w-3xl leading-relaxed">
              Administrative operations require verified cryptographic JWT credentials with elevated privileges. Non-admin accounts attempting access are blocked at both client router and API gateway levels.
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </PageTransition>
  );
};

export default AdminPage;
