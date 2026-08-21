/**
 * AdminPage Component
 *
 * Administrative panel with role guard (PRD Section 4.2 & Section 11.4).
 */

import { useAuth } from '../context/useAuth';

const AdminPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="pb-8 border-b border-[#3b3423] mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
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
            <p className="text-xs text-[#9a8e7a] mt-1">
              Admin Session: {user?.email} • Authority Level: Full System Administrator
            </p>
          </div>
        </div>

        {/* Core Administrative Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Match Verification Queue */}
          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl font-mono font-bold text-[#ff3b3f]">01</span>
              <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 bg-[#181305] border border-[#3b3423] text-[#ad8885] uppercase">
                SPRINT 7
              </span>
            </div>
            <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-2">
              Match Approvals Queue
            </h3>
            <p className="text-xs text-[#d8cdb5] leading-relaxed mb-6">
              Review player-submitted scores. Approving triggers atomic Elo calculations, category recomputations, and leaderboard updates.
            </p>
            <div className="text-[11px] font-bold text-[#ad8885] uppercase tracking-wider">
              ENDPOINT: /api/admin/matches/:id/approve
            </div>
          </div>

          {/* Direct Match Entry */}
          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl font-mono font-bold text-[#ff3b3f]">02</span>
              <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 bg-[#181305] border border-[#3b3423] text-[#ad8885] uppercase">
                SPRINT 7
              </span>
            </div>
            <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-2">
              Direct Official Recording
            </h3>
            <p className="text-xs text-[#d8cdb5] leading-relaxed mb-6">
              Enter official matches directly from court scoreboards. Auto-approved with mandatory audit log records per PRD Section 13.
            </p>
            <div className="text-[11px] font-bold text-[#ad8885] uppercase tracking-wider">
              ENDPOINT: /api/admin/matches/direct
            </div>
          </div>

          {/* Audit Trail & Manual Adjustment */}
          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl font-mono font-bold text-[#ff3b3f]">03</span>
              <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 bg-[#181305] border border-[#3b3423] text-[#ad8885] uppercase">
                SPRINT 9
              </span>
            </div>
            <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9] mb-2">
              Audit Logs & Adjustments
            </h3>
            <p className="text-xs text-[#d8cdb5] leading-relaxed mb-6">
              Every rating adjustment, player suspension, or match correction requires an explicit justification and creates an immutable audit entry.
            </p>
            <div className="text-[11px] font-bold text-[#ad8885] uppercase tracking-wider">
              ENDPOINT: /api/admin/audit-logs
            </div>
          </div>
        </div>

        {/* Security & Concurrency Notice */}
        <div className="p-8 bg-[#201b0c] border border-[#ff5451]/30">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-[#ff3b3f] rounded-full animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#ffb3ad] uppercase">
              SECURITY & ROLE-BASED ACCESS ENFORCED
            </span>
          </div>
          <h4 className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9] mb-1">
            Zero-Trust Administrative Route Guard
          </h4>
          <p className="text-xs text-[#d8cdb5] max-w-3xl leading-relaxed">
            Non-admin accounts navigating to this endpoint are immediately rejected at both the React Router layer and the backend Express middleware with HTTP 403 Forbidden.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
