/**
 * DashboardPage Component
 *
 * Authenticated Player Dashboard displaying live linked player profile stats,
 * unique Player ID (PH-XXXXX), Elo rating, skill tier, active pending matches awaiting verification,
 * and quick actions linking to match submission, leaderboard, and tournaments.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TiltCard from '../components/TiltCard';
import AnimatedNumber from '../components/AnimatedNumber';
import RevealOnScroll from '../components/RevealOnScroll';
import EmptyState from '../components/EmptyState';
import TierBadge from '../components/TierBadge';
import TierProgressBar from '../components/TierProgressBar';
import HowItWorksCard from '../components/HowItWorksCard';
import DigitalClubPassModal from '../components/DigitalClubPassModal';
import RatingHistoryChart from '../components/RatingHistoryChart';

const DashboardPage = () => {
  const { user, player, isAdmin, refreshProfile } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(player?.name || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updateMsg, setUpdateMsg] = useState(null);
  const [showClubPass, setShowClubPass] = useState(false);

  // Active Pending Matches & Rating History State
  const [pendingMatches, setPendingMatches] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [ratingHistory, setRatingHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const promises = [api.get('/matches/pending')];
        if (player?.playerId) {
          promises.push(api.get(`/players/${player.playerId}/rating-history`));
        }

        const [pendingRes, historyRes] = await Promise.allSettled(promises);
        if (isMounted) {
          if (pendingRes.status === 'fulfilled' && pendingRes.value.data.success) {
            setPendingMatches(pendingRes.value.data.data || []);
          }
          if (historyRes && historyRes.status === 'fulfilled' && historyRes.value.data.success) {
            setRatingHistory(historyRes.value.data.data.history || []);
          }
        }
      } catch {
        if (isMounted) setPendingMatches([]);
      } finally {
        if (isMounted) setLoadingPending(false);
      }
    };
    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [player?.playerId]);

  const formattedDate = player?.createdAt || user?.createdAt
    ? new Date(player?.createdAt || user?.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const handleCopyId = () => {
    if (player?.playerId) {
      navigator.clipboard.writeText(player.playerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setSaving(true);
    setUpdateMsg(null);
    try {
      const res = await api.put('/players/me', { name: nameInput.trim() });
      if (res.data.success) {
        await refreshProfile();
        setEditingName(false);
        setUpdateMsg('Profile name updated successfully.');
        setTimeout(() => setUpdateMsg(null), 3000);
      }
    } catch (err) {
      setUpdateMsg(err.response?.data?.message || 'Failed to update name.');
    } finally {
      setSaving(false);
    }
  };

  const hasPlayedMatches = (player?.matchesPlayed || 0) > 0;

  return (
    <PageTransition className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1440px] mx-auto">
        {/* Update Notification */}
        {updateMsg && (
          <div role="status" className="mb-6 p-4 bg-[#251f10] border border-[#ff3b3f] text-[#ede1c9] text-xs flex items-center justify-between animate-fade-in shadow-[0_0_15px_rgba(255,59,63,0.2)]">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full" aria-hidden="true" />
              {updateMsg}
            </span>
            <button
              type="button"
              onClick={() => setUpdateMsg(null)}
              aria-label="Dismiss notification"
              className="text-[#ad8885] hover:text-white text-xs font-bold p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Welcome & Player Identity Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#3b3423] mb-12 animate-fade-in">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center bg-[#ff3b3f] text-white font-['Playfair_Display'] font-bold text-2xl sm:text-3xl shrink-0 shadow-lg border-2 border-[#3b3423]">
              {player?.profilePhoto ? (
                <img
                  src={player.profilePhoto}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (player?.name ? player.name.slice(0, 2) : 'P').toUpperCase()
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase">
                  ATHLETE DASHBOARD
                </span>
                <span className="px-2 py-0.5 bg-[#251f10] border border-[#3b3423] text-[#ffb3ad] text-[10px] font-bold tracking-wider uppercase font-mono">
                  {player?.playerId || 'GENERATING ID...'}
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1a1508] border border-[#3b3423] text-[#4ade80] text-[10px] font-bold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-live-pulse" />
                  {player?.accountStatus || 'ACTIVE'}
                </span>
              </div>

              <div className="flex items-baseline gap-4 mt-2">
                <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[#ede1c9]">
                  {player?.name || user?.email?.split('@')[0]}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(player?.name || '');
                    setEditingName(!editingName);
                  }}
                  className="text-[11px] font-bold tracking-wider text-[#ad8885] hover:text-[#ff3b3f] uppercase underline cursor-pointer transition-colors"
                >
                  {editingName ? 'CANCEL' : 'EDIT NAME'}
                </button>
              </div>

            {editingName && (
              <form onSubmit={handleUpdateName} className="mt-4 flex items-center gap-3 animate-fade-in">
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter new display name"
                  className="px-3 py-1.5 bg-[#251f10] border border-[#ff3b3f] text-[#ede1c9] text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold uppercase disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {saving ? 'SAVING...' : 'SAVE'}
                </button>
              </form>
            )}

            <div className="flex items-center gap-4 text-xs text-[#9a8e7a] mt-2">
              <span>{user?.email}</span>
              <span>•</span>
              <span>Member since {formattedDate}</span>
            </div>
          </div>
        </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowClubPass(true)}
              className="px-4 py-2.5 bg-[var(--color-bg-card,#251f10)] hover:bg-[var(--color-bg-card-hover,#352c16)] border border-[var(--color-accent-primary,#ff3b3f)]/60 text-[var(--color-text-primary,#ede1c9)] text-xs font-bold tracking-[0.15em] uppercase transition-all rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
              title="Open Digital Club Pass with QR Code"
            >
              <span>🪪</span>
              <span>View Club Pass</span>
            </button>
            <Link
              to="/matches/submit"
              className="px-5 py-2.5 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.15em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)] hover:shadow-[0_0_22px_rgba(255,59,63,0.5)] rounded-xl"
            >
              + SUBMIT MATCH SCORES
            </Link>
            {player?.playerId && (
              <button
                type="button"
                onClick={handleCopyId}
                className={`px-4 py-2 border text-xs font-bold font-mono uppercase transition-all duration-200 cursor-pointer ${
                  copied
                    ? 'bg-[#4ade80]/20 border-[#4ade80] text-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                    : 'bg-[#251f10] hover:bg-[#3b3423] border-[#3b3423] text-[#ffb3ad]'
                }`}
              >
                {copied ? '✓ COPIED ID' : `SHARE ID: ${player.playerId}`}
              </button>
            )}
            {player?.playerId && (
              <Link
                to={`/players/${player.playerId}`}
                className="px-4 py-2 bg-[#201b0c] hover:bg-[#3f3927] border border-[#5d3f3d] hover:border-[#ad8885] text-xs font-bold tracking-wider text-[#ede1c9] hover:text-white uppercase transition-all"
              >
                PUBLIC PROFILE →
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2 bg-[#201b0c] hover:bg-[#3f3927] border border-[#ff3b3f] text-[#ffb3ad] text-xs font-bold tracking-[0.15em] uppercase transition-all"
              >
                ADMIN QUEUE →
              </Link>
            )}
          </div>
        </div>

        {/* Next Skill Tier Progression Bar */}
        <TierProgressBar
          rating={player?.currentRating || 1000}
          category={player?.category || 'Intermediate'}
          className="mb-10 animate-fade-in"
        />

        {/* Rating & Performance Metrics Grid with Tiered Elevation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Primary Stat Card 1: Elo Rating (Tiered Elevation & Glow Accent) */}
          <TiltCard className="p-8 bg-[#251f10] border-2 border-[#ff3b3f]/80 shadow-[0_0_25px_rgba(255,59,63,0.15)] hover-lift">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#ffb3ad] uppercase">
                OFFICIAL RATING
              </span>
              <span className="w-2 h-2 bg-[#ff3b3f] rounded-full animate-ping" />
            </div>
            <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-3 flex items-baseline gap-2">
              <AnimatedNumber value={player?.currentRating || 1000} duration={1000} />
              <span className="text-xs font-sans font-normal text-[#ffb3ad]">Elo</span>
            </div>
            <div>
              <TierBadge category={player?.category} />
            </div>
          </TiltCard>

          {/* Primary Stat Card 2: Win / Loss Record */}
          <TiltCard className="p-8 bg-[#251f10] border border-[#5d3f3d] hover:border-[#ad8885] transition-all hover-lift">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
              MATCH RECORD
            </div>
            <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-3 flex items-baseline gap-2">
              <AnimatedNumber value={player?.matchesPlayed || 0} duration={800} />
              <span className="text-xs font-sans font-normal text-[#9a8e7a]">Played</span>
            </div>
            <div className="text-xs text-[#9a8e7a] flex items-center gap-3">
              <span>{player?.wins || 0} Wins</span>
              <span>•</span>
              <span>{player?.losses || 0} Losses ({player?.winPercentage || 0}%)</span>
            </div>
          </TiltCard>

          {/* Secondary Stat Card: Active Winning Streak */}
          <TiltCard className="p-8 bg-[#201b0c] border border-[#3b3423] hover:border-[#ad8885] transition-all hover-lift">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
              WINNING STREAK
            </div>
            <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-3 flex items-baseline gap-2">
              <AnimatedNumber value={player?.winningStreak || 0} duration={800} />
              <span className="text-xs font-sans font-normal text-[#9a8e7a]">Matches</span>
            </div>
            <div className="text-xs text-[#9a8e7a]">
              Highest Elo: {player?.highestRating || 1000}
            </div>
          </TiltCard>

          {/* Secondary Stat Card: Tournament Record */}
          <TiltCard className="p-8 bg-[#201b0c] border border-[#3b3423] hover:border-[#ad8885] transition-all hover-lift">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
              TOURNAMENT RECORD
            </div>
            <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-3 flex items-baseline gap-2">
              <AnimatedNumber value={player?.tournamentWins || 0} duration={800} />
              <span className="text-xs font-sans font-normal text-[#9a8e7a]">Titles</span>
            </div>
            <div className="text-xs text-[#9a8e7a]">
              {player?.tournamentAppearances || 0} Appearances
            </div>
          </TiltCard>
        </div>

        {/* Official Historical Rating Trajectory Chart (Milestone 9) */}
        <RatingHistoryChart
          history={ratingHistory}
          currentRating={player?.currentRating || 1000}
          className="mb-12 animate-fade-in"
        />

        {/* How It Works Explainer Card */}
        <HowItWorksCard className="mb-12 animate-fade-in" />

        {/* Active Pending Matches Section (PRD Section 6.1.4: "Pending Admin Approval") */}
        {pendingMatches.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-live-pulse" />
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9]">
                  Active Pending Matches ({pendingMatches.length})
                </h2>
              </div>
              <span className="text-[10px] font-bold font-mono tracking-widest text-[#f59e0b] px-2.5 py-1 bg-[#251f10] border border-[#f59e0b]/40 uppercase">
                PENDING ADMIN APPROVAL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMatches.map((match) => (
                <div
                  key={match._id}
                  className="p-6 bg-[#201b0c] border border-[#f59e0b]/50 shadow-lg relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#ffb3ad] block">
                        {match.matchId} • {match.matchType}
                      </span>
                      <span className="text-xs text-[#9a8e7a]">
                        {match.court} • {new Date(match.date || match.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#f59e0b]/20 border border-[#f59e0b] text-[#f59e0b] text-[9px] font-bold uppercase font-mono">
                      AWAITING VERIFICATION
                    </span>
                  </div>

                  {/* Match Participants & Score Summary */}
                  <div className="p-3 bg-[#181305] border border-[#3b3423] mb-3">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-[#ede1c9]">
                        Team A: {match.teamA?.map((p) => p.name || p.playerId).join(' & ')}
                      </span>
                      <span className="font-mono text-[#ffb3ad]">
                        {match.scores?.map((s) => s.teamAScore).join(' - ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#ede1c9]">
                        Team B: {match.teamB?.map((p) => p.name || p.playerId).join(' & ')}
                      </span>
                      <span className="font-mono text-[#ffb3ad]">
                        {match.scores?.map((s) => s.teamBScore).join(' - ')}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#9a8e7a] flex items-center justify-between">
                    <span>
                      Declared Winner: <strong className="text-[#4ade80]">Team {match.winnerTeam}</strong>
                    </span>
                    <span className="text-[10px] text-[#ad8885]">
                      Submitted by {match.submittedBy?.name || 'Player'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real Empty State for New Players vs Active Match History */}
        {!hasPlayedMatches && pendingMatches.length === 0 && !loadingPending ? (
          <div className="mb-12">
            <EmptyState
              badgeText="NEW ATHLETE ONBOARDING"
              title="You're on the Baseline (1,000 Elo)"
              description="Play your first competitive club match to begin climbing skill tiers, unlock your rating trajectory, and establish your verified match record."
              actionLabel="+ SUBMIT YOUR FIRST MATCH →"
              actionTo="/matches/submit"
              icon="paddle"
            />
          </div>
        ) : null}

        {/* Verified Fair-Play Governance Banner */}
        <div className="p-8 bg-[#201b0c] border border-[#3b3423] mb-12 hover:border-[#5d3f3d] transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#ff3b3f] uppercase block mb-1">
                INDEPENDENT RATING GOVERNANCE
              </span>
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9]">
                Verified Match Score Pipeline
              </h2>
              <p className="text-xs sm:text-sm text-[#d8cdb5] mt-1 max-w-2xl leading-relaxed">
                Every match score submitted from the court is reviewed and verified by a club administrator before ratings and leaderboard standings are adjusted.
              </p>
            </div>
            <div className="px-4 py-2 bg-[#181305] border border-[#3b3423] text-xs font-bold font-mono text-[#ffb3ad] shrink-0 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-live-pulse" />
              STATUS: {pendingMatches.length} PENDING IN QUEUE
            </div>
          </div>
        </div>

        {/* Quick Action Navigation with Direct Routing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RevealOnScroll variant="fade-rise" delay={0}>
            <Link
              to="/matches/submit"
              className="p-6 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all hover-lift h-full flex flex-col justify-between group block"
            >
              <div>
                <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9] group-hover:text-white mb-2 transition-colors">
                  Submit Match Scores
                </h3>
                <p className="text-xs text-[#9a8e7a] mb-4 leading-relaxed">
                  Record your game scores, select court and opponents, and submit for admin review.
                </p>
              </div>
              <span className="text-xs font-bold tracking-wider text-[#ff3b3f] uppercase block">
                SUBMIT NEW MATCH →
              </span>
            </Link>
          </RevealOnScroll>

          <RevealOnScroll variant="fade-rise" delay={100}>
            <Link
              to="/leaderboard"
              className="p-6 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all hover-lift h-full flex flex-col justify-between group block"
            >
              <div>
                <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9] group-hover:text-white mb-2 transition-colors">
                  Official Leaderboard
                </h3>
                <p className="text-xs text-[#9a8e7a] mb-4 leading-relaxed">
                  Explore club player rankings, category breakdowns, and rating thresholds.
                </p>
              </div>
              <span className="text-xs font-bold tracking-wider text-[#ffb3ad] group-hover:text-[#ff3b3f] uppercase block transition-colors">
                EXPLORE TIERS & RANKINGS →
              </span>
            </Link>
          </RevealOnScroll>

          <RevealOnScroll variant="fade-rise" delay={200}>
            <Link
              to="/tournaments"
              className="p-6 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all hover-lift h-full flex flex-col justify-between group block"
            >
              <div>
                <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9] group-hover:text-white mb-2 transition-colors">
                  Tournament Hub
                </h3>
                <p className="text-xs text-[#9a8e7a] mb-4 leading-relaxed">
                  Learn about upcoming club tournament formats and seeded bracket rules.
                </p>
              </div>
              <span className="text-xs font-bold tracking-wider text-[#ffb3ad] group-hover:text-[#ff3b3f] uppercase block transition-colors">
                VIEW TOURNAMENT HUB →
              </span>
            </Link>
          </RevealOnScroll>
        </div>
      </div>

      {/* Digital Club Pass Modal with QR Challenge Link */}
      <DigitalClubPassModal
        isOpen={showClubPass}
        onClose={() => setShowClubPass(false)}
        player={player}
      />
    </PageTransition>
  );
};

export default DashboardPage;
