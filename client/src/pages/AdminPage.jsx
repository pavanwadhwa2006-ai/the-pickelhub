/**
 * AdminPage Component — The PickleHub Administrative Command Center
 *
 * Implements Milestone 7 Admin Approvals Queue, Direct Official Recording,
 * and Governance Audit Trail per PRD Section 4.2, 6, 10, & 12.
 *
 * Enhanced with Framer Motion animations (hover scales, exit transitions,
 * animated modals), skeleton loading states, empty queue illustrations,
 * and seamless dual-theme fidelity (Classic Dark / Garden Light).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TierBadge from '../components/TierBadge';

const COURTS = ['Court 1', 'Court 2', 'Court 3', 'Court 4', 'Court 5', 'Center Court'];

const AdminPage = () => {
  const { user } = useAuth();

  // Active Tab: 'queue' | 'direct' | 'audit'
  const [activeTab, setActiveTab] = useState('queue');

  // ----------------------------------------------------
  // Pending Queue State
  // ----------------------------------------------------
  const [pendingMatches, setPendingMatches] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null); // ID of match being approved/rejected
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // ----------------------------------------------------
  // Reject Modal State
  // ----------------------------------------------------
  const [rejectModalMatch, setRejectModalMatch] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // ----------------------------------------------------
  // Audit Logs State
  // ----------------------------------------------------
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // ----------------------------------------------------
  // Direct Entry Form State
  // ----------------------------------------------------
  const [directMatchType, setDirectMatchType] = useState('SINGLES');
  const [directCourt, setDirectCourt] = useState('Court 1');
  const [directIsTournament, setDirectIsTournament] = useState(false);
  const [directTeamA1, setDirectTeamA1] = useState(null);
  const [directTeamA2, setDirectTeamA2] = useState(null);
  const [directTeamB1, setDirectTeamB1] = useState(null);
  const [directTeamB2, setDirectTeamB2] = useState(null);
  const [directGames, setDirectGames] = useState([
    { teamAScore: '11', teamBScore: '7' },
  ]);
  const [directActiveSlot, setDirectActiveSlot] = useState(null);
  const [directSearchQuery, setDirectSearchQuery] = useState('');
  const [directSearchResults, setDirectSearchResults] = useState([]);
  const [directSearching, setDirectSearching] = useState(false);
  const [directSubmitting, setDirectSubmitting] = useState(false);
  const [directError, setDirectError] = useState(null);
  const [directSuccess, setDirectSuccess] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadQueue = async () => {
      setLoadingPending(true);
      setActionError(null);
      try {
        const res = await api.get('/admin/matches/pending?limit=50');
        if (isMounted && res.data.success) {
          setPendingMatches(res.data.data);
        }
      } catch (err) {
        if (isMounted) {
          setActionError(err.response?.data?.message || 'Failed to fetch pending matches queue.');
        }
      } finally {
        if (isMounted) {
          setLoadingPending(false);
        }
      }
    };

    loadQueue();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'audit') {
      const loadAudit = async () => {
        setLoadingAudit(true);
        try {
          const res = await api.get('/admin/audit-logs?limit=30');
          if (isMounted && res.data.success) {
            setAuditLogs(res.data.data);
          }
        } catch {
          // Non-blocking
        } finally {
          if (isMounted) {
            setLoadingAudit(false);
          }
        }
      };
      loadAudit();
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // ----------------------------------------------------
  // Approve Match Handler
  // ----------------------------------------------------
  const handleApprove = async (matchId, matchCode) => {
    setActionLoadingId(matchId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await api.post(`/admin/matches/${matchId}/approve`);
      if (res.data.success) {
        // Animate row out by filtering from state
        setPendingMatches((prev) => prev.filter((m) => m._id !== matchId && m.matchId !== matchId));
        setActionSuccess(`Match ${matchCode || ''} approved! Player Elo ratings and division standings updated.`);
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || `Failed to approve match ${matchCode || ''}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ----------------------------------------------------
  // Reject Match Handlers
  // ----------------------------------------------------
  const openRejectModal = (match) => {
    setRejectModalMatch(match);
    setRejectionReason('');
    setRejectError(null);
  };

  const closeRejectModal = () => {
    setRejectModalMatch(null);
    setRejectionReason('');
    setRejectError(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      setRejectError('Please specify a rejection reason for club records.');
      return;
    }

    setRejectSubmitting(true);
    setRejectError(null);

    try {
      const matchId = rejectModalMatch._id;
      const matchCode = rejectModalMatch.matchId;

      const res = await api.post(`/admin/matches/${matchId}/reject`, {
        reason: rejectionReason.trim(),
      });

      if (res.data.success) {
        setPendingMatches((prev) => prev.filter((m) => m._id !== matchId));
        setActionSuccess(`Match ${matchCode} rejected. Reason logged in audit records.`);
        closeRejectModal();
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject match.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Direct Match Player Search & Management
  // ----------------------------------------------------
  const searchDirectPlayers = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setDirectSearchResults([]);
      return;
    }
    setDirectSearching(true);
    try {
      const res = await api.get(`/players/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data.success) {
        const selectedIds = [
          directTeamA1?._id,
          directTeamA2?._id,
          directTeamB1?._id,
          directTeamB2?._id,
        ].filter(Boolean);
        const filtered = res.data.data.filter((p) => !selectedIds.includes(p._id));
        setDirectSearchResults(filtered);
      }
    } catch {
      setDirectSearchResults([]);
    } finally {
      setDirectSearching(false);
    }
  }, [directTeamA1, directTeamA2, directTeamB1, directTeamB2]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (directActiveSlot && directSearchQuery) {
        searchDirectPlayers(directSearchQuery);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [directSearchQuery, directActiveSlot, searchDirectPlayers]);

  const selectDirectPlayer = (slot, playerObj) => {
    if (slot === 'A1') setDirectTeamA1(playerObj);
    if (slot === 'A2') setDirectTeamA2(playerObj);
    if (slot === 'B1') setDirectTeamB1(playerObj);
    if (slot === 'B2') setDirectTeamB2(playerObj);
    setDirectActiveSlot(null);
    setDirectSearchQuery('');
    setDirectSearchResults([]);
  };

  const removeDirectPlayer = (slot) => {
    if (slot === 'A1') setDirectTeamA1(null);
    if (slot === 'A2') setDirectTeamA2(null);
    if (slot === 'B1') setDirectTeamB1(null);
    if (slot === 'B2') setDirectTeamB2(null);
  };

  const handleScoreChange = (index, field, value) => {
    const newGames = [...directGames];
    newGames[index][field] = value;
    setDirectGames(newGames);
  };

  const addGame = () => {
    if (directGames.length < 5) {
      setDirectGames([...directGames, { teamAScore: '0', teamBScore: '0' }]);
    }
  };

  const removeGame = (index) => {
    if (directGames.length > 1) {
      setDirectGames(directGames.filter((_, i) => i !== index));
    }
  };

  // Direct Entry Winner Computation Preview
  const directCalculations = useMemo(() => {
    let teamAWins = 0;
    let teamBWins = 0;
    let validGames = 0;

    for (const g of directGames) {
      const a = Number(g.teamAScore);
      const b = Number(g.teamBScore);
      if (!isNaN(a) && !isNaN(b) && a >= 0 && b >= 0 && a !== b) {
        validGames++;
        if (a > b) teamAWins++;
        else teamBWins++;
      }
    }

    let winner = null;
    if (teamAWins > teamBWins) winner = 'A';
    else if (teamBWins > teamAWins) winner = 'B';

    return { teamAWins, teamBWins, validGames, winner };
  }, [directGames]);

  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    setDirectError(null);
    setDirectSuccess(null);

    // Validate players
    if (!directTeamA1 || !directTeamB1) {
      setDirectError('Please assign at least one player to Team A and Team B.');
      return;
    }

    if (directMatchType === 'DOUBLES' && (!directTeamA2 || !directTeamB2)) {
      setDirectError('For Doubles, exactly 2 players are required on each team.');
      return;
    }

    if (!directCalculations.winner) {
      setDirectError('Game scores must produce a clear, non-tied winner.');
      return;
    }

    const teamA = directMatchType === 'SINGLES' ? [directTeamA1._id] : [directTeamA1._id, directTeamA2._id];
    const teamB = directMatchType === 'SINGLES' ? [directTeamB1._id] : [directTeamB1._id, directTeamB2._id];

    setDirectSubmitting(true);
    try {
      const payload = {
        matchType: directMatchType,
        court: directCourt,
        isTournament: directIsTournament,
        teamA,
        teamB,
        scores: directGames.map((g) => ({
          teamAScore: Number(g.teamAScore),
          teamBScore: Number(g.teamBScore),
        })),
        winnerTeam: directCalculations.winner,
      };

      const res = await api.post('/admin/matches/direct', payload);
      if (res.data.success) {
        setDirectSuccess(`Official match ${res.data.data.matchId} recorded and ratings updated immediately!`);
        // Reset form
        setDirectTeamA1(null);
        setDirectTeamA2(null);
        setDirectTeamB1(null);
        setDirectTeamB2(null);
        setDirectGames([{ teamAScore: '11', teamBScore: '7' }]);
        setTimeout(() => setDirectSuccess(null), 6000);
      }
    } catch (err) {
      setDirectError(err.response?.data?.message || 'Failed to record official match.');
    } finally {
      setDirectSubmitting(false);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] py-10 px-4 sm:px-8 md:px-16 transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto">
        {/* ==================================================== */}
        {/* Header with Live Badge & Role Credentials           */}
        {/* ==================================================== */}
        <div className="pb-6 border-b border-[var(--color-border-subtle)] mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary)] uppercase">
                GOVERNANCE & SCORE VERIFICATION
              </span>
              <span className="px-2.5 py-0.5 bg-[var(--color-accent-danger)]/15 border border-[var(--color-accent-danger)]/40 text-[var(--color-accent-danger)] text-[10px] font-bold tracking-wider uppercase rounded-full">
                ADMIN ACCESS
              </span>
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[var(--color-text-primary)]">
              Club Administration
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1.5 flex items-center gap-2">
              <span>Admin: <strong className="text-[var(--color-text-primary)]">{user?.email}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Verification Active
              </span>
            </p>
          </div>

          {/* Pending Queue Summary Pill */}
          <div className="flex items-center gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] px-4 py-2.5 rounded-xl shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30 flex items-center justify-center font-bold text-sm text-[var(--color-accent-primary)] font-mono">
              {pendingMatches.length}
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                Awaiting Approval
              </div>
              <div className="text-xs font-bold text-[var(--color-text-primary)]">
                {pendingMatches.length === 1 ? '1 match in queue' : `${pendingMatches.length} matches in queue`}
              </div>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-3 shadow-sm"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{actionSuccess}</span>
          </motion.div>
        )}

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium flex items-center gap-3 shadow-sm"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{actionError}</span>
          </motion.div>
        )}

        {/* ==================================================== */}
        {/* Navigation Tabs                                     */}
        {/* ==================================================== */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] mb-8 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'queue'
                ? 'text-[var(--color-accent-primary)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Pending Approvals</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'queue'
                  ? 'bg-[var(--color-accent-primary)] text-white'
                  : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]'
              }`}
            >
              {pendingMatches.length}
            </span>
            {activeTab === 'queue' && (
              <motion.div
                layoutId="adminTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-primary)]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('direct')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'direct'
                ? 'text-[var(--color-accent-primary)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Direct Official Entry</span>
            {activeTab === 'direct' && (
              <motion.div
                layoutId="adminTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-primary)]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'text-[var(--color-accent-primary)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Governance Audit Trail</span>
            {activeTab === 'audit' && (
              <motion.div
                layoutId="adminTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-primary)]"
              />
            )}
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: Pending Approvals Queue                      */}
        {/* ==================================================== */}
        {activeTab === 'queue' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                Score Verification Queue
              </h2>
              <button
                onClick={fetchPendingMatches}
                disabled={loadingPending}
                className="px-3.5 py-1.5 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-primary)] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${loadingPending ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh Queue</span>
              </button>
            </div>

            {/* Skeleton Loading State (PRD & Interaction Requirement) */}
            {loadingPending && (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-24 bg-[var(--color-text-muted)]/20 rounded" />
                        <div className="h-4 w-20 bg-[var(--color-text-muted)]/20 rounded-full" />
                        <div className="h-4 w-16 bg-[var(--color-text-muted)]/20 rounded" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="h-14 bg-[var(--color-text-muted)]/10 rounded-lg" />
                        <div className="h-14 bg-[var(--color-text-muted)]/10 rounded-lg" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:self-center">
                      <div className="h-10 w-28 bg-[var(--color-text-muted)]/20 rounded-lg" />
                      <div className="h-10 w-24 bg-[var(--color-text-muted)]/20 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State (PRD & Interaction Requirement) */}
            {!loadingPending && pendingMatches.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-12 text-center bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl max-w-2xl mx-auto my-8 shadow-sm"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-['Playfair_Display'] text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                  All Caught Up
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed mb-6">
                  There are currently no player-submitted matches waiting for verification. All match scores and Elo ratings are up to date.
                </p>
                <button
                  onClick={() => setActiveTab('direct')}
                  className="px-5 py-2.5 bg-[var(--color-accent-primary)] hover:opacity-90 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-md"
                >
                  Record Direct Official Match
                </button>
              </motion.div>
            )}

            {/* Animated Pending Queue List */}
            {!loadingPending && pendingMatches.length > 0 && (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {pendingMatches.map((match) => {
                    const isWinnerA = match.winnerTeam === 'A';
                    const isWinnerB = match.winnerTeam === 'B';
                    const isActing = actionLoadingId === match._id;

                    return (
                      <motion.div
                        key={match._id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          x: 40,
                          transition: { duration: 0.2, ease: 'easeOut' },
                        }}
                        className="p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)]/40 transition-all rounded-2xl shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6"
                      >
                        {/* Match Details & Players */}
                        <div className="flex-1 space-y-4">
                          {/* Top Meta Bar */}
                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--color-text-muted)]">
                            <span className="font-mono font-bold text-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 px-2.5 py-0.5 rounded border border-[var(--color-accent-primary)]/20">
                              {match.matchId}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-[10px] font-bold uppercase tracking-wider font-mono">
                              {match.matchType}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-[var(--color-text-primary)]">{match.court}</span>
                            <span>•</span>
                            <span>Submitted {new Date(match.createdAt).toLocaleString()}</span>
                            {match.submittedBy && (
                              <>
                                <span>•</span>
                                <span>by <strong className="text-[var(--color-text-primary)]">{match.submittedBy.name}</strong></span>
                              </>
                            )}
                          </div>

                          {/* Teams & Scores Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Team A */}
                            <div
                              className={`p-4 rounded-xl border transition-all ${
                                isWinnerA
                                  ? 'bg-emerald-500/10 border-emerald-500/40'
                                  : 'bg-[var(--color-bg-card-hover)] border-[var(--color-border-subtle)]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold tracking-widest uppercase font-mono text-[var(--color-text-muted)]">
                                  TEAM A {isWinnerA && '★ WINNER'}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {match.teamA?.map((p) => (
                                  <div key={p._id} className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                                      {p.name}
                                    </span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="font-mono text-xs text-[var(--color-text-muted)]">
                                        {p.currentRating} Elo
                                      </span>
                                      <TierBadge category={p.category} size="xs" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Team B */}
                            <div
                              className={`p-4 rounded-xl border transition-all ${
                                isWinnerB
                                  ? 'bg-emerald-500/10 border-emerald-500/40'
                                  : 'bg-[var(--color-bg-card-hover)] border-[var(--color-border-subtle)]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold tracking-widest uppercase font-mono text-[var(--color-text-muted)]">
                                  TEAM B {isWinnerB && '★ WINNER'}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {match.teamB?.map((p) => (
                                  <div key={p._id} className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                                      {p.name}
                                    </span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="font-mono text-xs text-[var(--color-text-muted)]">
                                        {p.currentRating} Elo
                                      </span>
                                      <TierBadge category={p.category} size="xs" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Game Scores Breakdown */}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-[10px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase font-mono mr-1">
                              GAMES:
                            </span>
                            {match.scores?.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-md bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-xs font-mono font-bold text-[var(--color-text-primary)]"
                              >
                                G{idx + 1}: <span className={s.teamAScore > s.teamBScore ? 'text-emerald-500' : ''}>{s.teamAScore}</span> - <span className={s.teamBScore > s.teamAScore ? 'text-emerald-500' : ''}>{s.teamBScore}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons (Framer Motion hover/tap transitions) */}
                        <div className="flex items-center gap-3 xl:flex-col justify-end xl:justify-center border-t xl:border-t-0 xl:border-l border-[var(--color-border-subtle)] pt-4 xl:pt-0 xl:pl-6">
                          {/* Approve Button */}
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleApprove(match._id, match.matchId)}
                            disabled={isActing}
                            className="flex-1 xl:w-36 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {isActing ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Approve</span>
                              </>
                            )}
                          </motion.button>

                          {/* Reject Button */}
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => openRejectModal(match)}
                            disabled={isActing}
                            className="flex-1 xl:w-36 py-2.5 px-4 bg-rose-600/15 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-600/40 font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Reject</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: Direct Official Entry Form                   */}
        {/* ==================================================== */}
        {activeTab === 'direct' && (
          <div className="max-w-3xl mx-auto bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-6 sm:p-10 shadow-sm">
            <div className="mb-6">
              <span className="text-[10px] font-bold font-mono tracking-widest text-[var(--color-accent-primary)] uppercase">
                INSTANT RATINGS ADJUSTMENT
              </span>
              <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mt-1">
                Direct Official Match Entry
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                Record sanctioned club matches directly. Scores are auto-approved, atomic Elo calculations apply immediately, and an audit trail entry is generated.
              </p>
            </div>

            {directSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium"
              >
                {directSuccess}
              </motion.div>
            )}

            {directError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium"
              >
                {directError}
              </motion.div>
            )}

            <form onSubmit={handleDirectSubmit} className="space-y-6">
              {/* Match Type & Court Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-2">
                    Match Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirectMatchType('SINGLES')}
                      className={`py-2.5 text-xs font-bold uppercase rounded-lg border transition-all ${
                        directMatchType === 'SINGLES'
                          ? 'bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)] shadow-sm'
                          : 'bg-[var(--color-bg-card-hover)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      Singles (1v1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectMatchType('DOUBLES')}
                      className={`py-2.5 text-xs font-bold uppercase rounded-lg border transition-all ${
                        directMatchType === 'DOUBLES'
                          ? 'bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)] shadow-sm'
                          : 'bg-[var(--color-bg-card-hover)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      Doubles (2v2)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-2">
                    Official Court
                  </label>
                  <select
                    value={directCourt}
                    onChange={(e) => setDirectCourt(e.target.value)}
                    className="w-full py-2.5 px-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)] font-medium"
                  >
                    {COURTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Player Roster Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A Roster */}
                <div className="p-4 rounded-xl bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] space-y-3">
                  <div className="text-xs font-bold tracking-wider uppercase text-[var(--color-text-muted)] font-mono">
                    Team A Roster
                  </div>

                  {/* Player A1 */}
                  <div>
                    {directTeamA1 ? (
                      <div className="flex items-center justify-between p-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg">
                        <div className="truncate">
                          <span className="font-bold text-xs text-[var(--color-text-primary)] block truncate">
                            {directTeamA1.name}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                            {directTeamA1.playerId} • {directTeamA1.currentRating} Elo
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDirectPlayer('A1')}
                          className="text-rose-500 hover:text-rose-400 text-xs font-bold px-2 py-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDirectActiveSlot('A1');
                          setDirectSearchQuery('');
                        }}
                        className="w-full py-2 px-3 border border-dashed border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)] rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-center transition-colors"
                      >
                        + Select Player A1
                      </button>
                    )}
                  </div>

                  {/* Player A2 (Doubles only) */}
                  {directMatchType === 'DOUBLES' && (
                    <div>
                      {directTeamA2 ? (
                        <div className="flex items-center justify-between p-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg">
                          <div className="truncate">
                            <span className="font-bold text-xs text-[var(--color-text-primary)] block truncate">
                              {directTeamA2.name}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                              {directTeamA2.playerId} • {directTeamA2.currentRating} Elo
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDirectPlayer('A2')}
                            className="text-rose-500 hover:text-rose-400 text-xs font-bold px-2 py-1"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDirectActiveSlot('A2');
                            setDirectSearchQuery('');
                          }}
                          className="w-full py-2 px-3 border border-dashed border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)] rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-center transition-colors"
                        >
                          + Select Player A2 (Partner)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Team B Roster */}
                <div className="p-4 rounded-xl bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] space-y-3">
                  <div className="text-xs font-bold tracking-wider uppercase text-[var(--color-text-muted)] font-mono">
                    Team B Roster
                  </div>

                  {/* Player B1 */}
                  <div>
                    {directTeamB1 ? (
                      <div className="flex items-center justify-between p-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg">
                        <div className="truncate">
                          <span className="font-bold text-xs text-[var(--color-text-primary)] block truncate">
                            {directTeamB1.name}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                            {directTeamB1.playerId} • {directTeamB1.currentRating} Elo
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDirectPlayer('B1')}
                          className="text-rose-500 hover:text-rose-400 text-xs font-bold px-2 py-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDirectActiveSlot('B1');
                          setDirectSearchQuery('');
                        }}
                        className="w-full py-2 px-3 border border-dashed border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)] rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-center transition-colors"
                      >
                        + Select Player B1
                      </button>
                    )}
                  </div>

                  {/* Player B2 (Doubles only) */}
                  {directMatchType === 'DOUBLES' && (
                    <div>
                      {directTeamB2 ? (
                        <div className="flex items-center justify-between p-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg">
                          <div className="truncate">
                            <span className="font-bold text-xs text-[var(--color-text-primary)] block truncate">
                              {directTeamB2.name}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                              {directTeamB2.playerId} • {directTeamB2.currentRating} Elo
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDirectPlayer('B2')}
                            className="text-rose-500 hover:text-rose-400 text-xs font-bold px-2 py-1"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDirectActiveSlot('B2');
                            setDirectSearchQuery('');
                          }}
                          className="w-full py-2 px-3 border border-dashed border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)] rounded-lg text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-center transition-colors"
                        >
                          + Select Player B2 (Partner)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Player Search Autocomplete Overlay/Modal */}
              {directActiveSlot && (
                <div className="p-4 bg-[var(--color-bg-card)] border-2 border-[var(--color-accent-primary)] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      Searching player for Slot {directActiveSlot}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDirectActiveSlot(null)}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-bold"
                    >
                      Close ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type player name or PH-XXXXX..."
                    value={directSearchQuery}
                    onChange={(e) => setDirectSearchQuery(e.target.value)}
                    className="w-full py-2 px-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                  />
                  {directSearching && (
                    <div className="text-xs text-[var(--color-text-muted)]">Searching club roster...</div>
                  )}
                  {directSearchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {directSearchResults.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => selectDirectPlayer(directActiveSlot, p)}
                          className="w-full p-2 text-left hover:bg-[var(--color-bg-card-hover)] rounded-lg flex items-center justify-between gap-2 transition-colors"
                        >
                          <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                            {p.name} ({p.playerId})
                          </span>
                          <span className="text-xs font-mono text-[var(--color-accent-primary)]">
                            {p.currentRating} Elo
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Game Scores Config */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                    Official Game Scores
                  </label>
                  {directGames.length < 5 && (
                    <button
                      type="button"
                      onClick={addGame}
                      className="text-xs font-bold text-[var(--color-accent-primary)] hover:underline"
                    >
                      + Add Game
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {directGames.map((game, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl"
                    >
                      <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] w-14">
                        Game {idx + 1}
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={game.teamAScore}
                          onChange={(e) => handleScoreChange(idx, 'teamAScore', e.target.value)}
                          placeholder="Team A"
                          className="w-full py-1.5 px-3 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg text-sm font-mono font-bold text-center text-[var(--color-text-primary)]"
                        />
                        <span className="text-xs text-[var(--color-text-muted)] font-bold">-</span>
                        <input
                          type="number"
                          min="0"
                          value={game.teamBScore}
                          onChange={(e) => handleScoreChange(idx, 'teamBScore', e.target.value)}
                          placeholder="Team B"
                          className="w-full py-1.5 px-3 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg text-sm font-mono font-bold text-center text-[var(--color-text-primary)]"
                        />
                      </div>
                      {directGames.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGame(idx)}
                          className="text-rose-500 hover:text-rose-400 text-xs font-bold px-2 py-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tournament Match Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="directIsTournament"
                  checked={directIsTournament}
                  onChange={(e) => setDirectIsTournament(e.target.checked)}
                  className="rounded border-[var(--color-border-subtle)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                />
                <label htmlFor="directIsTournament" className="text-xs text-[var(--color-text-muted)] cursor-pointer">
                  Sanctioned Tournament Match (Applies standard match Elo)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={directSubmitting || !directCalculations.winner}
                className="w-full py-3.5 px-6 bg-[var(--color-accent-primary)] hover:opacity-90 text-white font-bold text-xs sm:text-sm tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {directSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Record & Approve Official Match Result</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: Governance Audit Trail                       */}
        {/* ==================================================== */}
        {activeTab === 'audit' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                  System Governance Audit Trail
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Immutable record of all administrative approvals, rejections, and direct score overrides.
                </p>
              </div>
              <button
                onClick={fetchAuditLogs}
                disabled={loadingAudit}
                className="px-3.5 py-1.5 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-primary)] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh Logs</span>
              </button>
            </div>

            {loadingAudit && (
              <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                Loading audit trail records...
              </div>
            )}

            {!loadingAudit && auditLogs.length === 0 && (
              <div className="p-10 text-center bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl text-xs text-[var(--color-text-muted)]">
                No administrative audit actions recorded yet.
              </div>
            )}

            {!loadingAudit && auditLogs.length > 0 && (
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)] uppercase tracking-wider font-mono border-b border-[var(--color-border-subtle)]">
                      <tr>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Performed By</th>
                        <th className="py-3 px-4">Target Resource</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                      {auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-[var(--color-bg-card-hover)]/50 transition-colors">
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                log.action === 'MATCH_APPROVE'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                                  : log.action === 'MATCH_REJECT'
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                                  : 'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/30'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                            {log.performedBy?.email || 'Admin'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[var(--color-text-muted)]">
                            {log.targetType} ({log.metadata?.matchId || log.targetId?.slice(-6)})
                          </td>
                          <td className="py-3 px-4 text-[var(--color-text-muted)] max-w-xs truncate">
                            {log.metadata?.reason
                              ? `Reason: ${log.metadata.reason}`
                              : log.metadata?.ratingChanges
                              ? `${log.metadata.ratingChanges.length} player ratings updated`
                              : 'Admin action recorded'}
                          </td>
                          <td className="py-3 px-4 text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* Reject Modal with Framer Motion Fade + Scale         */}
        {/* ==================================================== */}
        <AnimatePresence>
          {rejectModalMatch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeRejectModal}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)]">
                      Reject Match Submission
                    </h3>
                  </div>
                  <button
                    onClick={closeRejectModal}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Rejecting match <strong className="text-[var(--color-text-primary)] font-mono">{rejectModalMatch.matchId}</strong> will flag it as <strong className="text-rose-500">REJECTED</strong>. No player ratings will change. A clear rejection reason is required for audit logs and player notification.
                </p>

                {rejectError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/40 text-rose-500 text-xs rounded-lg font-medium">
                    {rejectError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-2">
                    Mandatory Rejection Reason
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Score conflict reported by opposing player, incomplete game set..."
                    className="w-full p-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeRejectModal}
                    className="px-4 py-2.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReject}
                    disabled={rejectSubmitting || !rejectionReason.trim()}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {rejectSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Confirm Rejection</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default AdminPage;
