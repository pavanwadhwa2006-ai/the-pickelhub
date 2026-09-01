/**
 * AdminPage Component — The PickleHub Administrative Command Center
 *
 * Implements:
 * 1. Milestone 7 Admin Approvals Queue & Direct Match Entry.
 * 2. Milestone 8 Competitions & Tournament Brackets Manager (Arranging tournaments,
 *    closing registration, generating seeded brackets, scoring matches, and awarding bonus points).
 * 3. Master Plan Part A3 & Item 9 Paginated Rating History Audit Table.
 * 4. PRD Section 10.6 Governance Audit Trail.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TierBadge from '../components/TierBadge';
import BracketVisualizer from '../components/BracketVisualizer';

const COURTS = ['Court 1', 'Court 2', 'Court 3', 'Court 4', 'Court 5', 'Center Court'];
const TOURNAMENT_FORMATS = ['SINGLES', 'DOUBLES', 'MIXED_DOUBLES', 'OPEN'];
const SKILL_DIVISIONS = ['All', 'Beginner', 'Intermediate', 'Advanced Intermediate', 'Pro'];

const AdminPage = () => {
  const { user } = useAuth();

  // Active Tab: 'queue' | 'tournaments' | 'direct' | 'rating-history' | 'audit'
  const [activeTab, setActiveTab] = useState('queue');

  // ----------------------------------------------------
  // Global Notification State
  // ----------------------------------------------------
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // ----------------------------------------------------
  // Pending Queue State
  // ----------------------------------------------------
  const [pendingMatches, setPendingMatches] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Reject Modal
  const [rejectModalMatch, setRejectModalMatch] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // ----------------------------------------------------
  // Competitions & Tournaments State (Milestone 8)
  // ----------------------------------------------------
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loadingSelectedTournament, setLoadingSelectedTournament] = useState(false);
  const [tournamentActionLoading, setTournamentActionLoading] = useState(false);

  // Create Tournament Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournName, setNewTournName] = useState('');
  const [newTournDesc, setNewTournDesc] = useState('');
  const [newTournType, setNewTournType] = useState('SINGLES');
  const [newTournCategory, setNewTournCategory] = useState('All');
  const [newTournStartDate, setNewTournStartDate] = useState('');
  const [newTournDeadline, setNewTournDeadline] = useState('');
  const [newTournMaxPlayers, setNewTournMaxPlayers] = useState(16);
  const [newTournWinnerBonus, setNewTournWinnerBonus] = useState(50);
  const [newTournRunnerBonus, setNewTournRunnerBonus] = useState(25);
  const [newTournSemiBonus, setNewTournSemiBonus] = useState(10);
  const [createTournError, setCreateTournError] = useState(null);
  const [createTournSubmitting, setCreateTournSubmitting] = useState(false);

  // Score Bracket Match Modal State
  const [scoreModalMatch, setScoreModalMatch] = useState(null);
  const [score1Input, setScore1Input] = useState('');
  const [score2Input, setScore2Input] = useState('');
  const [scoreSubmitting, setScoreSubmitting] = useState(false);
  const [scoreError, setScoreError] = useState(null);

  // ----------------------------------------------------
  // Rating History Audit Table State (Master Plan A3 & Item 9)
  // ----------------------------------------------------
  const [ratingHistoryRecords, setRatingHistoryRecords] = useState([]);
  const [loadingRatingHistory, setLoadingRatingHistory] = useState(false);
  const [ratingHistoryPage, setRatingHistoryPage] = useState(1);
  const [ratingHistoryTotalPages, setRatingHistoryTotalPages] = useState(1);
  const [ratingHistoryTotal, setRatingHistoryTotal] = useState(0);
  const [ratingHistoryFilterType, setRatingHistoryFilterType] = useState('');

  // ----------------------------------------------------
  // Governance Audit Logs State
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
  const [directGames, setDirectGames] = useState([{ teamAScore: '11', teamBScore: '7' }]);
  const [directActiveSlot, setDirectActiveSlot] = useState(null);
  const [directSearchQuery, setDirectSearchQuery] = useState('');
  const [directSearchResults, setDirectSearchResults] = useState([]);
  const [directSearching, setDirectSearching] = useState(false);
  const [directSubmitting, setDirectSubmitting] = useState(false);
  const [directError, setDirectError] = useState(null);
  const [directSuccess, setDirectSuccess] = useState(null);

  // Load Pending Match Queue
  const fetchPendingQueue = useCallback(async () => {
    setLoadingPending(true);
    setActionError(null);
    try {
      const res = await api.get('/admin/matches/pending?limit=50');
      if (res.data.success) {
        setPendingMatches(res.data.data);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to fetch pending matches queue.');
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // Load Tournaments List
  const fetchTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    try {
      const res = await api.get('/tournaments');
      if (res.data.success) {
        setTournaments(res.data.data);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to load competitions list.');
    } finally {
      setLoadingTournaments(false);
    }
  }, []);

  // Load Single Tournament with Populated Bracket
  const fetchTournamentDetails = useCallback(async (id) => {
    setLoadingSelectedTournament(true);
    try {
      const res = await api.get(`/tournaments/${id}`);
      if (res.data.success) {
        setSelectedTournament(res.data.data);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to fetch tournament bracket details.');
    } finally {
      setLoadingSelectedTournament(false);
    }
  }, []);

  // Load Paginated Rating History
  const fetchRatingHistory = useCallback(async (page = 1, changeType = '') => {
    setLoadingRatingHistory(true);
    try {
      const queryParams = new URLSearchParams({ page, limit: 20 });
      if (changeType) queryParams.append('changeType', changeType);

      const res = await api.get(`/admin/rating-history?${queryParams.toString()}`);
      if (res.data.success) {
        setRatingHistoryRecords(res.data.data);
        setRatingHistoryPage(res.data.page);
        setRatingHistoryTotalPages(res.data.totalPages);
        setRatingHistoryTotal(res.data.total);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to load rating history.');
    } finally {
      setLoadingRatingHistory(false);
    }
  }, []);

  // Load Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await api.get('/admin/audit-logs?limit=50');
      if (res.data.success) {
        setAuditLogs(res.data.data);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to fetch audit logs.');
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingQueue();
  }, [fetchPendingQueue]);

  useEffect(() => {
    if (activeTab === 'tournaments') {
      fetchTournaments();
    } else if (activeTab === 'rating-history') {
      fetchRatingHistory(ratingHistoryPage, ratingHistoryFilterType);
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchTournaments, fetchRatingHistory, fetchAuditLogs, ratingHistoryPage, ratingHistoryFilterType]);

  // Handle Approve Match
  const handleApprove = async (matchId) => {
    setActionLoadingId(matchId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.post(`/admin/matches/${matchId}/approve`);
      if (res.data.success) {
        setPendingMatches((prev) => prev.filter((m) => m._id !== matchId));
        setActionSuccess(`Match #${res.data.data.matchId} approved successfully! Ratings updated atomically.`);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve match.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Modal Handlers
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
    if (!rejectionReason.trim()) {
      setRejectError('Please provide a mandatory reason for rejecting this score submission.');
      return;
    }
    setRejectSubmitting(true);
    setRejectError(null);
    try {
      const res = await api.post(`/admin/matches/${rejectModalMatch._id}/reject`, {
        reason: rejectionReason.trim(),
      });
      if (res.data.success) {
        setPendingMatches((prev) => prev.filter((m) => m._id !== rejectModalMatch._id));
        setActionSuccess(`Match #${rejectModalMatch.matchId} rejected. Reason logged for governance audit.`);
        closeRejectModal();
      }
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject match.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Tournament Action Handlers
  // ----------------------------------------------------
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setCreateTournError(null);

    if (!newTournName || !newTournStartDate || !newTournDeadline) {
      setCreateTournError('Tournament name, start date, and registration deadline are required.');
      return;
    }

    setCreateTournSubmitting(true);
    try {
      const payload = {
        name: newTournName.trim(),
        description: newTournDesc.trim(),
        tournamentType: newTournType,
        category: newTournCategory,
        startDate: new Date(newTournStartDate),
        registrationDeadline: new Date(newTournDeadline),
        maxParticipants: Number(newTournMaxPlayers),
        bonusConfig: {
          winnerBonus: Number(newTournWinnerBonus),
          runnerUpBonus: Number(newTournRunnerBonus),
          semiFinalistBonus: Number(newTournSemiBonus),
        },
      };

      const res = await api.post('/admin/tournaments', payload);
      if (res.data.success) {
        setActionSuccess(`Competition '${res.data.data.name}' arranged and registration is OPEN!`);
        setShowCreateModal(false);
        setNewTournName('');
        setNewTournDesc('');
        fetchTournaments();
        setSelectedTournament(res.data.data);
      }
    } catch (err) {
      setCreateTournError(err.response?.data?.message || 'Failed to create tournament.');
    } finally {
      setCreateTournSubmitting(false);
    }
  };

  const handleCloseRegistration = async (tournamentId) => {
    setTournamentActionLoading(true);
    try {
      const res = await api.post(`/admin/tournaments/${tournamentId}/close-registration`);
      if (res.data.success) {
        setActionSuccess('Tournament registration closed successfully.');
        fetchTournamentDetails(tournamentId);
        fetchTournaments();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to close registration.');
    } finally {
      setTournamentActionLoading(false);
    }
  };

  const handleGenerateBracket = async (tournamentId) => {
    setTournamentActionLoading(true);
    try {
      const res = await api.post(`/admin/tournaments/${tournamentId}/generate-bracket`);
      if (res.data.success) {
        setActionSuccess('Tournament bracket generated! Competition is now IN PROGRESS.');
        fetchTournamentDetails(tournamentId);
        fetchTournaments();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to generate tournament bracket.');
    } finally {
      setTournamentActionLoading(false);
    }
  };

  const openScoreModal = (match) => {
    setScoreModalMatch(match);
    setScore1Input(match.score1 !== null ? match.score1.toString() : '11');
    setScore2Input(match.score2 !== null ? match.score2.toString() : '7');
    setScoreError(null);
  };

  const handleRecordScore = async (e) => {
    e.preventDefault();
    if (Number(score1Input) === Number(score2Input)) {
      setScoreError('Draws are not permitted in tournament matches.');
      return;
    }
    setScoreSubmitting(true);
    setScoreError(null);
    try {
      const res = await api.post(`/admin/tournaments/${selectedTournament._id}/matches/score`, {
        matchId: scoreModalMatch.matchId,
        score1: Number(score1Input),
        score2: Number(score2Input),
      });
      if (res.data.success) {
        setActionSuccess('Match score recorded and bracket updated!');
        setScoreModalMatch(null);
        setSelectedTournament(res.data.data);
        fetchTournaments();
      }
    } catch (err) {
      setScoreError(err.response?.data?.message || 'Failed to record bracket match score.');
    } finally {
      setScoreSubmitting(false);
    }
  };

  const handleAwardBonuses = async (tournamentId) => {
    if (!window.confirm('Are you sure you want to award rating bonuses? This will atomically update ratings for Winner, Runner-Up, and Semifinalists.')) {
      return;
    }
    setTournamentActionLoading(true);
    try {
      const res = await api.post(`/admin/tournaments/${tournamentId}/award-bonuses`);
      if (res.data.success) {
        setActionSuccess('Tournament rating bonuses (+50 winner, +25 runner-up, +10 semi-finalists) awarded atomically!');
        fetchTournamentDetails(tournamentId);
        fetchTournaments();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to distribute tournament rating bonuses.');
    } finally {
      setTournamentActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // Direct Entry Form Search & Submit Helpers
  // ----------------------------------------------------
  const searchDirectPlayers = useCallback(async (query) => {
    if (!query || query.trim().length < 1) {
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

    if (!directTeamA1 || !directTeamB1) {
      setDirectError('Please assign at least one player to Team A and Team B.');
      return;
    }

    if (directMatchType === 'DOUBLES' && (!directTeamA2 || !directTeamB2)) {
      setDirectError('For Doubles, exactly 2 players are required on each team.');
      return;
    }

    if (!directCalculations.winner) {
      setDirectError('Games result in a tie. Official PickleHub matches must have a definitive winner.');
      return;
    }

    const scoresPayload = [];
    for (let i = 0; i < directGames.length; i++) {
      const a = parseInt(directGames[i].teamAScore, 10);
      const b = parseInt(directGames[i].teamBScore, 10);
      if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a === b) {
        setDirectError(`Game ${i + 1} has an invalid score.`);
        return;
      }
      scoresPayload.push({ gameNumber: i + 1, teamAScore: a, teamBScore: b });
    }

    const payload = {
      matchType: directMatchType,
      court: directCourt,
      isTournament: directIsTournament,
      teamA: [directTeamA1._id, directMatchType === 'DOUBLES' ? directTeamA2?._id : null].filter(Boolean),
      teamB: [directTeamB1._id, directMatchType === 'DOUBLES' ? directTeamB2?._id : null].filter(Boolean),
      scores: scoresPayload,
      winnerTeam: directCalculations.winner,
    };

    setDirectSubmitting(true);
    try {
      const res = await api.post('/admin/matches/direct', payload);
      if (res.data.success) {
        setDirectSuccess(`Official match #${res.data.data.matchId} recorded directly! Ratings updated atomically.`);
        setDirectTeamA1(null);
        setDirectTeamA2(null);
        setDirectTeamB1(null);
        setDirectTeamB2(null);
        setDirectGames([{ teamAScore: '11', teamBScore: '7' }]);
      }
    } catch (err) {
      setDirectError(err.response?.data?.message || 'Failed to record official match.');
    } finally {
      setDirectSubmitting(false);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] py-8 px-4 sm:px-8 md:px-12 transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto">
        {/* Header Bar */}
        <div className="pb-6 border-b border-[var(--color-border-subtle)] mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary)] uppercase">
                GOVERNANCE & COMPETITIONS COMMAND
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
            <span>✓ {actionSuccess}</span>
          </motion.div>
        )}

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium flex items-center gap-3 shadow-sm"
          >
            <span>⚠️ {actionError}</span>
          </motion.div>
        )}

        {/* ==================================================== */}
        {/* Navigation Tabs                                     */}
        {/* ==================================================== */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] mb-8 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'queue' ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Pending Approvals</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
              {pendingMatches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tournaments')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tournaments' ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Competitions & Tournaments</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500">
              {tournaments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('direct')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'direct' ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Direct Match Entry</span>
          </button>

          <button
            onClick={() => setActiveTab('rating-history')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rating-history' ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Rating History Table</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit' ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>Governance Audit Trail</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: PENDING MATCH APPROVAL QUEUE                  */}
        {/* ==================================================== */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {loadingPending ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl animate-pulse h-32" />
                ))}
              </div>
            ) : pendingMatches.length === 0 ? (
              <div className="p-12 text-center bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl">
                <div className="text-3xl mb-2">🎉</div>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)] mb-1">
                  Queue is Clean
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  All submitted player matches have been verified and processed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMatches.map((m) => (
                  <div
                    key={m._id}
                    className="p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-[var(--color-accent-primary)]">
                          #{m.matchId}
                        </span>
                        <span className="px-2 py-0.5 bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)] text-[10px] font-bold rounded">
                          {m.matchType}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          Court: {m.court}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm font-bold">
                        <span className={m.winnerTeam === 'A' ? 'text-emerald-500 font-bold' : ''}>
                          {m.teamA.map((p) => p.name).join(' & ')}
                        </span>
                        <span className="font-mono text-xs text-[var(--color-text-muted)]">vs</span>
                        <span className={m.winnerTeam === 'B' ? 'text-emerald-500 font-bold' : ''}>
                          {m.teamB.map((p) => p.name).join(' & ')}
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-mono text-[var(--color-text-muted)]">
                        Scores: {m.scores.map((g) => `${g.teamAScore}-${g.teamBScore}`).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <button
                        onClick={() => openRejectModal(m)}
                        disabled={actionLoadingId === m._id}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-xl border border-rose-500/30 transition-all"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(m._id)}
                        disabled={actionLoadingId === m._id}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        {actionLoadingId === m._id ? 'Processing...' : 'Approve Match ✓'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: COMPETITIONS & TOURNAMENTS (MILESTONE 8)      */}
        {/* ==================================================== */}
        {activeTab === 'tournaments' && (
          <div className="space-y-8">
            {/* Header & Arrange Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6 rounded-2xl">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)]">
                  Tournament Competitions
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Arrange sanctioned tournaments, manage seeds, advance bracket matches, and award championship Elo bonuses.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
              >
                <span>+ Arrange New Competition</span>
              </button>
            </div>

            {/* Tournaments List Grid */}
            <div>
              <h3 className="text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-4">
                Active & Upcoming Competitions
              </h3>
              {loadingTournaments ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl animate-pulse h-48" />
                  ))}
                </div>
              ) : tournaments.length === 0 ? (
                <div className="p-12 text-center bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl">
                  <div className="text-3xl mb-2">🏆</div>
                  <h4 className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary)] mb-1">
                    No Competitions Arranged
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] mb-4">
                    Get started by arranging the club&apos;s next sanctioned championship tournament.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-[var(--color-accent-primary)] text-white text-xs font-bold rounded-lg"
                  >
                    Create Competition
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tournaments.map((t) => {
                    const isSelected = selectedTournament?._id === t._id;
                    return (
                      <div
                        key={t._id}
                        onClick={() => fetchTournamentDetails(t._id)}
                        className={`p-6 bg-[var(--color-bg-card)] border rounded-2xl shadow-sm transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]/20'
                            : 'border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              t.status === 'REGISTRATION_OPEN'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-amber-500/15 text-amber-500 animate-pulse'
                                : t.status === 'COMPLETED'
                                ? 'bg-blue-500/15 text-blue-500'
                                : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                            {t.tournamentType}
                          </span>
                        </div>

                        <h4 className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary)] mb-1">
                          {t.name}
                        </h4>
                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-4">
                          {t.description || 'Official sanctioned club championship tournament.'}
                        </p>

                        <div className="flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border-subtle)]">
                          <span>Division: <strong className="text-[var(--color-text-primary)]">{t.category}</strong></span>
                          <span>
                            Slots: <strong className="text-[var(--color-text-primary)]">{t.participants?.length || 0}/{t.maxParticipants}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Tournament Management Workspace */}
            {selectedTournament && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-md"
              >
                {/* Tournament Workspace Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border-subtle)]">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] text-[10px] font-bold rounded-full uppercase">
                        {selectedTournament.tournamentType} • {selectedTournament.category} Division
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Starts: {new Date(selectedTournament.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                      {selectedTournament.name}
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      Bonus Allocation: <strong>+{selectedTournament.bonusConfig?.winnerBonus || 50}</strong> Winner,{' '}
                      <strong>+{selectedTournament.bonusConfig?.runnerUpBonus || 25}</strong> Runner-Up,{' '}
                      <strong>+{selectedTournament.bonusConfig?.semiFinalistBonus || 10}</strong> Semi-Finalists
                    </p>
                  </div>

                  {/* Administrative Workflow Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {selectedTournament.status === 'REGISTRATION_OPEN' && (
                      <button
                        type="button"
                        onClick={() => handleCloseRegistration(selectedTournament._id)}
                        disabled={tournamentActionLoading}
                        className="px-4 py-2 bg-[var(--color-bg-card-hover)] hover:bg-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs font-bold rounded-xl border border-[var(--color-border-subtle)] transition-all"
                      >
                        Close Registration
                      </button>
                    )}

                    {(selectedTournament.status === 'REGISTRATION_CLOSED' || selectedTournament.status === 'REGISTRATION_OPEN') && (
                      <button
                        type="button"
                        onClick={() => handleGenerateBracket(selectedTournament._id)}
                        disabled={tournamentActionLoading || selectedTournament.participants?.length < 2}
                        className="px-5 py-2 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        Generate Bracket & Start ⚡
                      </button>
                    )}

                    {selectedTournament.status === 'COMPLETED' && !selectedTournament.bonusesAwarded && (
                      <button
                        type="button"
                        onClick={() => handleAwardBonuses(selectedTournament._id)}
                        disabled={tournamentActionLoading}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5"
                      >
                        <span>🏆 Award Rating Bonuses</span>
                      </button>
                    )}

                    {selectedTournament.bonusesAwarded && (
                      <span className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 text-xs font-bold rounded-xl">
                        ✓ Bonuses Awarded ({new Date(selectedTournament.bonusesAwardedAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Registered Participants Preview */}
                <div>
                  <h4 className="text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-3">
                    Registered Applicants & Seeds ({selectedTournament.participants?.length || 0}/{selectedTournament.maxParticipants})
                  </h4>
                  {selectedTournament.participants?.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No players have registered for this tournament yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {selectedTournament.participants.map((p, idx) => (
                        <div key={idx} className="p-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl flex items-center justify-between">
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-[var(--color-text-primary)] block truncate">
                              {p.player?.name || 'Player'}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                              Rating: {p.seedRating || p.player?.currentRating}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded text-[10px] font-mono font-bold text-[var(--color-accent-primary)]">
                            {p.seed ? `Seed #${p.seed}` : `#${idx + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interactive Visual Bracket Tree */}
                <div className="pt-6 border-t border-[var(--color-border-subtle)]">
                  <h4 className="text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-4">
                    Live Tournament Bracket
                  </h4>
                  {loadingSelectedTournament ? (
                    <div className="p-12 text-center text-xs text-[var(--color-text-muted)] animate-pulse">
                      Loading tournament bracket tree...
                    </div>
                  ) : (
                    <BracketVisualizer
                      tournament={selectedTournament}
                      isAdmin={true}
                      onScoreMatch={openScoreModal}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: DIRECT OFFICIAL MATCH ENTRY                   */}
        {/* ==================================================== */}
        {activeTab === 'direct' && (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)]">
                Direct Official Match Recording
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Direct entry for club-organized games. Matches are auto-approved immediately and Elo ratings update in real time.
              </p>
            </div>

            {directSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 text-sm rounded-xl">
                ✓ {directSuccess}
              </div>
            )}
            {directError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/40 text-rose-500 text-sm rounded-xl">
                ⚠️ {directError}
              </div>
            )}

            <form onSubmit={handleDirectSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-2">
                    Match Format
                  </label>
                  <select
                    value={directMatchType}
                    onChange={(e) => {
                      setDirectMatchType(e.target.value);
                      if (e.target.value === 'SINGLES') {
                        setDirectTeamA2(null);
                        setDirectTeamB2(null);
                      }
                    }}
                    className="w-full p-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm"
                  >
                    <option value="SINGLES">Singles (1 vs 1)</option>
                    <option value="DOUBLES">Doubles (2 vs 2)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-2">
                    Court Location
                  </label>
                  <select
                    value={directCourt}
                    onChange={(e) => setDirectCourt(e.target.value)}
                    className="w-full p-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm"
                  >
                    {COURTS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <input
                      type="checkbox"
                      checked={directIsTournament}
                      onChange={(e) => setDirectIsTournament(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span>Sanctioned Tournament Game</span>
                  </label>
                </div>
              </div>

              {/* Player Slots Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A */}
                <div className="p-4 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold tracking-wider text-[var(--color-accent-primary)] uppercase">
                    Team A
                  </h4>
                  <div className="flex items-center justify-between p-2 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)]">
                    <span className="text-xs">{directTeamA1?.name || 'Select Player 1'}</span>
                    {directTeamA1 ? (
                      <button type="button" onClick={() => removeDirectPlayer('A1')} className="text-rose-500 text-xs font-bold">✕</button>
                    ) : (
                      <button type="button" onClick={() => setDirectActiveSlot('A1')} className="text-[var(--color-accent-primary)] text-xs font-bold">+ Assign</button>
                    )}
                  </div>
                  {directMatchType === 'DOUBLES' && (
                    <div className="flex items-center justify-between p-2 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)]">
                      <span className="text-xs">{directTeamA2?.name || 'Select Player 2'}</span>
                      {directTeamA2 ? (
                        <button type="button" onClick={() => removeDirectPlayer('A2')} className="text-rose-500 text-xs font-bold">✕</button>
                      ) : (
                        <button type="button" onClick={() => setDirectActiveSlot('A2')} className="text-[var(--color-accent-primary)] text-xs font-bold">+ Assign</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Team B */}
                <div className="p-4 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                    Team B
                  </h4>
                  <div className="flex items-center justify-between p-2 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)]">
                    <span className="text-xs">{directTeamB1?.name || 'Select Player 1'}</span>
                    {directTeamB1 ? (
                      <button type="button" onClick={() => removeDirectPlayer('B1')} className="text-rose-500 text-xs font-bold">✕</button>
                    ) : (
                      <button type="button" onClick={() => setDirectActiveSlot('B1')} className="text-[var(--color-accent-primary)] text-xs font-bold">+ Assign</button>
                    )}
                  </div>
                  {directMatchType === 'DOUBLES' && (
                    <div className="flex items-center justify-between p-2 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)]">
                      <span className="text-xs">{directTeamB2?.name || 'Select Player 2'}</span>
                      {directTeamB2 ? (
                        <button type="button" onClick={() => removeDirectPlayer('B2')} className="text-rose-500 text-xs font-bold">✕</button>
                      ) : (
                        <button type="button" onClick={() => setDirectActiveSlot('B2')} className="text-[var(--color-accent-primary)] text-xs font-bold">+ Assign</button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Player Search Autocomplete Box if active slot */}
              {directActiveSlot && (
                <div className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-accent-primary)] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[var(--color-accent-primary)]">
                      Search Player for Slot {directActiveSlot}
                    </span>
                    <button type="button" onClick={() => setDirectActiveSlot(null)} className="text-xs text-[var(--color-text-muted)]">Cancel</button>
                  </div>
                  <input
                    type="text"
                    value={directSearchQuery}
                    onChange={(e) => setDirectSearchQuery(e.target.value)}
                    placeholder="Type player name or PH-XXXXX ID..."
                    className="w-full p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-lg text-sm"
                    autoFocus
                  />
                  {directSearching ? (
                    <p className="text-xs text-[var(--color-text-muted)]">Searching players...</p>
                  ) : directSearchResults.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {directSearchResults.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => selectDirectPlayer(directActiveSlot, p)}
                          className="p-2 hover:bg-[var(--color-bg-card-hover)] rounded cursor-pointer flex items-center justify-between text-xs"
                        >
                          <span>{p.name} ({p.playerId})</span>
                          <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{p.currentRating} Elo</span>
                        </div>
                      ))}
                    </div>
                  ) : directSearchQuery.length > 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No players found.</p>
                  ) : null}
                </div>
              )}

              {/* Game Scores */}
              <div className="space-y-3">
                <label className="block text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                  Game Scores
                </label>
                {directGames.map((g, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] w-16">Game {idx + 1}</span>
                    <input
                      type="number"
                      value={g.teamAScore}
                      onChange={(e) => handleScoreChange(idx, 'teamAScore', e.target.value)}
                      className="w-20 p-2 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded text-center text-sm font-mono"
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">-</span>
                    <input
                      type="number"
                      value={g.teamBScore}
                      onChange={(e) => handleScoreChange(idx, 'teamBScore', e.target.value)}
                      className="w-20 p-2 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded text-center text-sm font-mono"
                    />
                    {directGames.length > 1 && (
                      <button type="button" onClick={() => removeGame(idx)} className="text-rose-500 text-xs font-bold">✕</button>
                    )}
                  </div>
                ))}
                {directGames.length < 5 && (
                  <button type="button" onClick={addGame} className="text-xs font-bold text-[var(--color-accent-primary)]">+ Add Another Game</button>
                )}
              </div>

              <button
                type="submit"
                disabled={directSubmitting}
                className="w-full py-3 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                {directSubmitting ? 'Recording Official Match...' : 'Record & Process Match Instantly →'}
              </button>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: PAGINATED RATING HISTORY AUDIT TABLE          */}
        {/* ==================================================== */}
        {activeTab === 'rating-history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6 rounded-2xl">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)]">
                  Rating History Audit Trail
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Full chronological log of Elo changes, match deltas, and tournament bonus payouts.
                </p>
              </div>

              {/* Filter by Change Type */}
              <div className="flex items-center gap-2">
                <select
                  value={ratingHistoryFilterType}
                  onChange={(e) => {
                    setRatingHistoryFilterType(e.target.value);
                    setRatingHistoryPage(1);
                  }}
                  className="p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-xs font-bold"
                >
                  <option value="">All Change Types</option>
                  <option value="MATCH">Matches</option>
                  <option value="TOURNAMENT_BONUS">Tournament Bonuses</option>
                  <option value="MANUAL_ADJUSTMENT">Manual Adjustments</option>
                </select>
              </div>
            </div>

            {loadingRatingHistory ? (
              <div className="p-12 text-center text-xs text-[var(--color-text-muted)] animate-pulse">
                Loading rating history records...
              </div>
            ) : ratingHistoryRecords.length === 0 ? (
              <div className="p-12 text-center bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl text-xs text-[var(--color-text-muted)]">
                No rating history records found.
              </div>
            ) : (
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)] uppercase tracking-wider font-bold border-b border-[var(--color-border-subtle)]">
                      <tr>
                        <th className="py-3.5 px-4">Player</th>
                        <th className="py-3.5 px-4">Type</th>
                        <th className="py-3.5 px-4">Rating Before</th>
                        <th className="py-3.5 px-4">Delta</th>
                        <th className="py-3.5 px-4">New Rating</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Reason / Match</th>
                        <th className="py-3.5 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                      {ratingHistoryRecords.map((r) => (
                        <tr key={r._id} className="hover:bg-[var(--color-bg-card-hover)]/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-[var(--color-text-primary)]">
                            {r.playerId?.name || 'Player'} ({r.playerId?.playerId || '-'})
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.changeType === 'TOURNAMENT_BONUS'
                                ? 'bg-amber-500/15 text-amber-500'
                                : r.changeType === 'MATCH'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-blue-500/15 text-blue-500'
                            }`}>
                              {r.changeType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">{r.ratingBefore}</td>
                          <td className="py-3 px-4 font-mono font-bold">
                            <span className={r.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                              {r.delta > 0 ? `+${r.delta}` : r.delta}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[var(--color-text-primary)]">
                            {r.ratingAfter}
                          </td>
                          <td className="py-3 px-4">
                            <TierBadge category={r.categoryAfter} size="sm" />
                          </td>
                          <td className="py-3 px-4 text-[var(--color-text-muted)] max-w-xs truncate">
                            {r.reason || (r.matchId ? `Match #${r.matchId}` : '-')}
                          </td>
                          <td className="py-3 px-4 text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 bg-[var(--color-bg-card-hover)] border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">
                    Showing page <strong>{ratingHistoryPage}</strong> of <strong>{ratingHistoryTotalPages}</strong> ({ratingHistoryTotal} records)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={ratingHistoryPage <= 1}
                      onClick={() => setRatingHistoryPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg font-bold disabled:opacity-40"
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      disabled={ratingHistoryPage >= ratingHistoryTotalPages}
                      onClick={() => setRatingHistoryPage((p) => Math.min(ratingHistoryTotalPages, p + 1))}
                      className="px-3 py-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg font-bold disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: GOVERNANCE AUDIT TRAIL                        */}
        {/* ==================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6 rounded-2xl">
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)]">
                Administrative Governance Audit Trail
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Immutable record of administrative approvals, rejections, promotions, and tournament operations per PRD Section 10.6.
              </p>
            </div>

            {loadingAudit ? (
              <div className="p-12 text-center text-xs text-[var(--color-text-muted)] animate-pulse">
                Loading audit logs...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl text-xs text-[var(--color-text-muted)]">
                No administrative actions logged yet.
              </div>
            ) : (
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)] uppercase tracking-wider font-bold border-b border-[var(--color-border-subtle)]">
                    <tr>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Admin</th>
                      <th className="py-3.5 px-4">Target</th>
                      <th className="py-3.5 px-4">Details</th>
                      <th className="py-3.5 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-[var(--color-bg-card-hover)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[var(--color-accent-primary)]">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-primary)]">
                          {log.performedBy?.email || 'Administrator'}
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-muted)] font-mono">
                          {log.targetType || 'Resource'}: {log.targetId ? log.targetId.slice(-6) : '-'}
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-muted)] max-w-xs truncate">
                          {JSON.stringify(log.metadata || {})}
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: ARRANGE NEW COMPETITION (MILESTONE 8)         */}
        {/* ==================================================== */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)]">
                      Arrange New Competition
                    </h3>
                  </div>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="text-sm font-bold text-[var(--color-text-muted)]">✕</button>
                </div>

                {createTournError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/40 text-rose-500 text-xs rounded-lg">
                    {createTournError}
                  </div>
                )}

                <form onSubmit={handleCreateTournament} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1">Tournament Title *</label>
                    <input
                      type="text"
                      required
                      value={newTournName}
                      onChange={(e) => setNewTournName(e.target.value)}
                      placeholder="e.g., PickleHub Autumn Championship 2026"
                      className="w-full p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={newTournDesc}
                      onChange={(e) => setNewTournDesc(e.target.value)}
                      placeholder="Tournament format details, venue rules, prize structure..."
                      className="w-full p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1">Format</label>
                      <select
                        value={newTournType}
                        onChange={(e) => setNewTournType(e.target.value)}
                        className="w-full p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm font-bold"
                      >
                        {TOURNAMENT_FORMATS.map((f) => (
                          <option key={f} value={f}>{f.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1">Skill Division</label>
                      <select
                        value={newTournCategory}
                        onChange={(e) => setNewTournCategory(e.target.value)}
                        className="w-full p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm font-bold"
                      >
                        {SKILL_DIVISIONS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1">Event Start Date *</label>
                      <input
                        type="date"
                        required
                        value={newTournStartDate}
                        onChange={(e) => setNewTournStartDate(e.target.value)}
                        className="w-full p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1">Registration Deadline *</label>
                      <input
                        type="date"
                        required
                        value={newTournDeadline}
                        onChange={(e) => setNewTournDeadline(e.target.value)}
                        className="w-full p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--color-text-muted)] mb-1">Max Bracket Capacity</label>
                    <select
                      value={newTournMaxPlayers}
                      onChange={(e) => setNewTournMaxPlayers(Number(e.target.value))}
                      className="w-full p-2.5 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm font-bold"
                    >
                      {[4, 8, 16, 32, 64].map((cap) => (
                        <option key={cap} value={cap}>{cap} Players / Teams</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--color-border-subtle)]">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">Winner Bonus</label>
                      <input
                        type="number"
                        min="0"
                        value={newTournWinnerBonus}
                        onChange={(e) => setNewTournWinnerBonus(e.target.value)}
                        className="w-full p-2 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-lg text-xs font-mono text-center font-bold text-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">Runner-Up</label>
                      <input
                        type="number"
                        min="0"
                        value={newTournRunnerBonus}
                        onChange={(e) => setNewTournRunnerBonus(e.target.value)}
                        className="w-full p-2 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-lg text-xs font-mono text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">Semi-Finals</label>
                      <input
                        type="number"
                        min="0"
                        value={newTournSemiBonus}
                        onChange={(e) => setNewTournSemiBonus(e.target.value)}
                        className="w-full p-2 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-lg text-xs font-mono text-center font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createTournSubmitting}
                      className="px-5 py-2.5 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm"
                    >
                      {createTournSubmitting ? 'Arranging Competition...' : 'Create & Open Registration →'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* MODAL: RECORD BRACKET MATCH SCORE                    */}
        {/* ==================================================== */}
        <AnimatePresence>
          {scoreModalMatch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setScoreModalMatch(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-6 shadow-2xl z-10 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
                  <h3 className="font-['Playfair_Display'] text-lg font-bold text-[var(--color-text-primary)]">
                    Record Bracket Score ({scoreModalMatch.matchId})
                  </h3>
                  <button type="button" onClick={() => setScoreModalMatch(null)} className="text-xs font-bold text-[var(--color-text-muted)]">✕</button>
                </div>

                {scoreError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/40 text-rose-500 text-xs rounded-lg">
                    {scoreError}
                  </div>
                )}

                <form onSubmit={handleRecordScore} className="space-y-4">
                  <div className="flex items-center justify-between gap-4 p-4 bg-[var(--color-bg-card-hover)] rounded-xl">
                    <div className="flex-1 text-center">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
                        {scoreModalMatch.player1?.name || 'Player 1'}
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={score1Input}
                        onChange={(e) => setScore1Input(e.target.value)}
                        className="w-16 p-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg text-center font-mono font-bold text-lg"
                      />
                    </div>
                    <span className="font-mono text-xs text-[var(--color-text-muted)] font-bold">vs</span>
                    <div className="flex-1 text-center">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] block mb-1">
                        {scoreModalMatch.player2?.name || 'Player 2'}
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={score2Input}
                        onChange={(e) => setScore2Input(e.target.value)}
                        className="w-16 p-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg text-center font-mono font-bold text-lg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setScoreModalMatch(null)} className="px-4 py-2 text-xs font-bold text-[var(--color-text-muted)]">Cancel</button>
                    <button
                      type="submit"
                      disabled={scoreSubmitting}
                      className="px-5 py-2.5 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl"
                    >
                      {scoreSubmitting ? 'Recording...' : 'Submit & Advance Winner →'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================================================== */}
        {/* MODAL: REJECT MATCH                                  */}
        {/* ==================================================== */}
        <AnimatePresence>
          {rejectModalMatch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeRejectModal}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
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
                  <button onClick={closeRejectModal} className="text-sm font-bold text-[var(--color-text-muted)]">✕</button>
                </div>

                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Rejecting match <strong className="text-[var(--color-text-primary)] font-mono">{rejectModalMatch.matchId}</strong> will flag it as <strong className="text-rose-500">REJECTED</strong>. No player ratings will change.
                </p>

                {rejectError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/40 text-rose-500 text-xs rounded-lg">
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
                    className="w-full p-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={closeRejectModal} className="px-4 py-2 text-xs font-bold text-[var(--color-text-muted)]">Cancel</button>
                  <button
                    type="button"
                    onClick={handleConfirmReject}
                    disabled={rejectSubmitting || !rejectionReason.trim()}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {rejectSubmitting ? 'Confirming...' : 'Confirm Rejection'}
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
