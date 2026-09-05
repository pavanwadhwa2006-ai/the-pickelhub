/**
 * TournamentsPage Component — Player-Facing Tournament Hub
 *
 * Official club competition showcase allowing players to discover tournaments,
 * apply/register with real-time capacity checks, track registration countdowns,
 * view live seeded brackets, and celebrate tournament champions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import PageTransition from '../components/PageTransition';
import TierBadge from '../components/TierBadge';
import BracketVisualizer from '../components/BracketVisualizer';

// Module-level in-memory cache for instant route navigation
let clientTournamentsCache = null;

const TournamentsPage = () => {
  const { user, player } = useAuth();

  const [tournaments, setTournaments] = useState(() => clientTournamentsCache || []);
  const [loading, setLoading] = useState(() => !clientTournamentsCache);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected tournament for detailed bracket view
  const [selectedTournament, setSelectedTournament] = useState(() => {
    return clientTournamentsCache && clientTournamentsCache.length > 0 ? clientTournamentsCache[0] : null;
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Application/Registration State
  const [registeringId, setRegisteringId] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [registerError, setRegisterError] = useState(null);

  // Ref to track whether we've auto-selected a tournament on first load
  const hasAutoSelected = useRef(Boolean(clientTournamentsCache && clientTournamentsCache.length > 0));

  // Tick state for countdown timer (avoids impure Date.now() during render)
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000); // update every 30s
    return () => clearInterval(interval);
  }, []);

  // Load All Tournaments — inline in effect to satisfy React Compiler
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!clientTournamentsCache) setLoading(true);
      setError(null);
      try {
        const res = await api.get('/tournaments');
        if (!cancelled && res.data.success) {
          clientTournamentsCache = res.data.data;
          setTournaments(res.data.data);
          if (res.data.data.length > 0 && !hasAutoSelected.current) {
            hasAutoSelected.current = true;
            setSelectedTournament(res.data.data[0]);
          }
        }
      } catch (err) {
        if (!cancelled && !clientTournamentsCache) {
          setError(err.response?.data?.message || 'Failed to load club tournaments.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []); // runs once on mount

  // Refetch tournaments list (used after register/withdraw actions)
  const refetchTournaments = useCallback(async () => {
    try {
      const res = await api.get('/tournaments');
      if (res.data.success) {
        setTournaments(res.data.data);
      }
    } catch { /* swallow — primary fetch handles errors */ }
  }, []);

  // Load Detailed Tournament View
  const fetchTournamentDetails = useCallback(async (id) => {
    setLoadingDetails(true);
    setRegisterError(null);
    try {
      const res = await api.get(`/tournaments/${id}`);
      if (res.data.success) {
        setSelectedTournament(res.data.data);
      }
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Failed to fetch tournament bracket.');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Check if current user is registered for a tournament
  const isUserRegistered = (tournament) => {
    if (!tournament || !Array.isArray(tournament.participants)) return false;
    const currentUserId = user?.id || user?._id;
    const currentPlayerId = player?.playerId || player?._id;

    if (!currentUserId && !currentPlayerId) return false;

    return tournament.participants.some((p) => {
      if (!p) return false;
      const participantUserId = p.player?.userId?._id || p.player?.userId;
      const participantPlayerId = p.player?.playerId || p.player?._id || (typeof p.player === 'string' ? p.player : null);
      const participantAppliedBy = p.appliedBy?._id || p.appliedBy;

      if (currentUserId) {
        const uidStr = String(currentUserId);
        if (participantUserId && String(participantUserId) === uidStr) return true;
        if (participantAppliedBy && String(participantAppliedBy) === uidStr) return true;
      }

      if (currentPlayerId) {
        const pidStr = String(currentPlayerId);
        if (participantPlayerId && String(participantPlayerId) === pidStr) return true;
      }

      return false;
    });
  };

  // One-Click Apply / Register Handler
  const handleRegister = async (tournamentId) => {
    if (!user) {
      setRegisterError('Please log in or register an account to apply for tournaments.');
      return;
    }
    setRegisteringId(tournamentId);
    setRegisterError(null);
    setRegisterSuccess(null);
    try {
      const res = await api.post(`/tournaments/${tournamentId}/register`, {});
      if (res.data.success) {
        setRegisterSuccess('Application confirmed! You are officially registered for this competition.');
        fetchTournamentDetails(tournamentId);
        refetchTournaments();
      }
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Failed to register for tournament.');
    } finally {
      setRegisteringId(null);
    }
  };

  // Withdraw Registration Handler
  const handleWithdraw = async (tournamentId) => {
    if (!window.confirm('Are you sure you want to withdraw your application from this tournament?')) {
      return;
    }
    setRegisteringId(tournamentId);
    setRegisterError(null);
    setRegisterSuccess(null);
    try {
      const res = await api.delete(`/tournaments/${tournamentId}/register`);
      if (res.data.success) {
        setRegisterSuccess('You have withdrawn from this tournament.');
        fetchTournamentDetails(tournamentId);
        refetchTournaments();
      }
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Failed to withdraw from tournament.');
    } finally {
      setRegisteringId(null);
    }
  };

  // Filtered Tournaments
  const filteredTournaments = tournaments.filter((t) => {
    if (statusFilter === 'REGISTRATION_OPEN') return t.status === 'REGISTRATION_OPEN';
    if (statusFilter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (statusFilter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  // Countdown Helper — uses `now` state (effect-driven) to avoid impure Date.now() in render
  const getDeadlineText = (deadlineStr) => {
    const diff = new Date(deadlineStr).getTime() - now;
    if (diff <= 0) return 'Registration Closed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left to apply`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left to apply`;
  };

  return (
    <PageTransition className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] py-8 px-4 sm:px-8 md:px-12 transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto space-y-8">
        {/* Header Banner */}
        <div className="pb-6 border-b border-[var(--color-border-subtle)] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[var(--color-accent-primary)] uppercase">
                SANCTIONED COMPETITIONS
              </span>
              <span className="px-2.5 py-0.5 bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] text-[10px] font-bold tracking-wider uppercase rounded-full">
                CHAMPIONSHIP BRACKET ENGINE
              </span>
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl font-bold text-[var(--color-text-primary)]">
              Club Tournament Hub
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1.5 max-w-2xl leading-relaxed">
              Official club-sanctioned pickleball championships. Seeded by Elo rating, verified round-by-round, with dedicated rating bonus payouts.
            </p>
          </div>

          {/* Tournament Bonus Info Card */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] px-5 py-3 rounded-2xl shadow-sm flex items-center gap-4 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg">
              🏆
            </div>
            <div className="text-xs">
              <div className="font-bold text-[var(--color-text-primary)]">Bonus Points Pool</div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                <span className="text-amber-500 font-bold">+50</span> Winner • <span className="font-bold">+25</span> Runner-Up • <span className="font-bold">+10</span> Semis
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Notifications */}
        {registerSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <span>✓</span>
            <span>{registerSuccess}</span>
          </motion.div>
        )}

        {registerError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <span>⚠️</span>
            <span>{registerError}</span>
          </motion.div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/40 text-rose-500 text-sm rounded-xl">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-px overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'REGISTRATION_OPEN', label: 'Registration Open' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'COMPLETED', label: 'Championship Archive' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition-all rounded-lg ${
                statusFilter === tab.id
                  ? 'bg-[var(--color-accent-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card-hover)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Competitions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl animate-pulse h-64" />
            ))}
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="p-12 text-center bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl">
            <div className="text-3xl mb-2">🎾</div>
            <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)] mb-1">
              No Competitions Found
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              No tournaments match the selected filter. Stay tuned for upcoming club announcements!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((t) => {
              const isSelected = selectedTournament?._id === t._id;
              const registered = isUserRegistered(t);
              const isOpen = t.status === 'REGISTRATION_OPEN';
              const isFull = (t.participants?.length || 0) >= t.maxParticipants;
              const deadlineText = getDeadlineText(t.registrationDeadline);

              return (
                <div
                  key={t._id}
                  onClick={() => fetchTournamentDetails(t._id)}
                  className={`p-6 bg-[var(--color-bg-card)] border rounded-2xl shadow-sm transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'border-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]/20'
                      : 'border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)]/50'
                  }`}
                >
                  <div>
                    {/* Status & Format Chips */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isOpen
                            ? 'bg-emerald-500/15 text-emerald-500 flex items-center gap-1.5'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/15 text-amber-500 animate-pulse'
                            : t.status === 'COMPLETED'
                            ? 'bg-blue-500/15 text-blue-500'
                            : 'bg-[var(--color-bg-card-hover)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)]">
                        {t.tournamentType}
                      </span>
                    </div>

                    <h3 className="font-['Playfair_Display'] text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors mb-2">
                      {t.name}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed mb-4">
                      {t.description || 'Official club championship tournament.'}
                    </p>

                    {/* Meta info */}
                    <div className="space-y-1.5 text-xs text-[var(--color-text-muted)] mb-4">
                      <div className="flex items-center justify-between">
                        <span>Division:</span>
                        <TierBadge category={t.category} size="sm" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Starts:</span>
                        <strong className="text-[var(--color-text-primary)] font-mono">
                          {new Date(t.startDate).toLocaleDateString()}
                        </strong>
                      </div>
                      {isOpen && (
                        <div className="flex items-center justify-between text-amber-500 font-mono text-[10px]">
                          <span>Deadline:</span>
                          <strong>{deadlineText}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions & Capacity Bar */}
                  <div className="pt-4 border-t border-[var(--color-border-subtle)] space-y-3">
                    {/* Capacity Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted)] mb-1">
                        <span>Registered Players</span>
                        <span>
                          <strong>{t.participants?.length || 0}</strong> / {t.maxParticipants}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--color-bg-card-hover)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-accent-primary)] transition-all"
                          style={{
                            width: `${Math.min(100, ((t.participants?.length || 0) / t.maxParticipants) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Apply Button */}
                    {isOpen && (
                      <div className="flex items-center gap-2">
                        {registered ? (
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                              ✓ Registered
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWithdraw(t._id);
                              }}
                              disabled={registeringId === t._id}
                              className="text-[10px] text-rose-500 hover:underline font-bold uppercase"
                            >
                              Withdraw
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegister(t._id);
                            }}
                            disabled={registeringId === t._id || isFull}
                            className="w-full py-2 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-sm disabled:opacity-50"
                          >
                            {registeringId === t._id
                              ? 'Applying...'
                              : isFull
                              ? 'Capacity Full'
                              : 'Apply / Register Now →'}
                          </button>
                        )}
                      </div>
                    )}

                    {t.status === 'COMPLETED' && t.winner && (
                      <div className="text-xs text-amber-500 font-bold flex items-center gap-1.5">
                        <span>🏆 Champion:</span>
                        <span className="text-[var(--color-text-primary)]">{t.winner?.name || 'Player'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Tournament Workspace View */}
        {selectedTournament && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-3xl p-6 sm:p-10 space-y-8 shadow-lg"
          >
            {/* Title & Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border-subtle)]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] text-[10px] font-bold rounded-full uppercase">
                    {selectedTournament.tournamentType} • {selectedTournament.category} Division
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Event Date: {new Date(selectedTournament.startDate).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="font-['Playfair_Display'] text-2xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
                  {selectedTournament.name}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1 max-w-2xl leading-relaxed">
                  {selectedTournament.description || 'Sanctioned club competition. Players are seeded based on current verified club Elo ratings.'}
                </p>
              </div>

              {/* Registration Action Box */}
              {selectedTournament.status === 'REGISTRATION_OPEN' && (
                <div className="bg-[var(--color-bg-card-hover)] p-4 rounded-2xl border border-[var(--color-border-subtle)] flex flex-col items-end gap-2">
                  <span className="text-[10px] font-mono text-amber-500 font-bold">
                    ⏱ {getDeadlineText(selectedTournament.registrationDeadline)}
                  </span>
                  {isUserRegistered(selectedTournament) ? (
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-emerald-500/15 text-emerald-500 text-xs font-bold rounded-lg">
                        ✓ Registered
                      </span>
                      <button
                        type="button"
                        onClick={() => handleWithdraw(selectedTournament._id)}
                        className="px-3 py-1.5 bg-rose-500/10 text-rose-500 text-xs font-bold rounded-lg hover:bg-rose-500/20"
                      >
                        Withdraw
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRegister(selectedTournament._id)}
                      disabled={registeringId === selectedTournament._id}
                      className="px-6 py-2.5 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/90 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-md"
                    >
                      {registeringId === selectedTournament._id ? 'Applying...' : 'Apply for Competition →'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Participants Grid */}
            <div>
              <h3 className="text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-4">
                Registered Competitors ({selectedTournament.participants?.length || 0} / {selectedTournament.maxParticipants})
              </h3>
              {selectedTournament.participants?.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No players registered yet. Be the first to apply!</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {selectedTournament.participants.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] rounded-xl flex items-center justify-between"
                    >
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] block truncate">
                          {p.player?.name || 'Player'}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                          {p.seedRating || p.player?.currentRating} Elo
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded text-[10px] font-mono font-bold text-[var(--color-accent-primary)]">
                        {p.seed ? `#${p.seed}` : `#${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Interactive Bracket Tree */}
            <div className="pt-6 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                  Tournament Bracket Tree
                </h3>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  Single Elimination Format
                </span>
              </div>

              {loadingDetails ? (
                <div className="p-12 text-center text-xs text-[var(--color-text-muted)] animate-pulse">
                  Loading bracket...
                </div>
              ) : (
                <BracketVisualizer
                  tournament={selectedTournament}
                  isAdmin={false}
                />
              )}
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default TournamentsPage;
