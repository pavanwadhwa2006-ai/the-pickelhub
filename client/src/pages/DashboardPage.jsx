/**
 * DashboardPage Component
 *
 * Authenticated Player Dashboard displaying live linked player profile stats,
 * unique Player ID (PH-XXXXX), Elo rating, skill tier, and quick actions.
 */

import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';

const DashboardPage = () => {
  const { user, player, isAdmin, refreshProfile } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(player?.name || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updateMsg, setUpdateMsg] = useState(null);

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
      setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="min-h-screen bg-[#181305] text-[#ede1c9] py-12 px-6 sm:px-10 md:px-20">
      <div className="max-w-[1440px] mx-auto">
        {/* Update Notification */}
        {updateMsg && (
          <div className="mb-6 p-4 bg-[#251f10] border border-[#ff3b3f] text-[#ede1c9] text-xs flex items-center justify-between animate-fade-in">
            <span>{updateMsg}</span>
            <button
              type="button"
              onClick={() => setUpdateMsg(null)}
              className="text-[#ad8885] hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Welcome & Player Identity Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#3b3423] mb-12">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase">
                ATHLETE DASHBOARD
              </span>
              <span className="px-2 py-0.5 bg-[#251f10] border border-[#3b3423] text-[#ffb3ad] text-[10px] font-bold tracking-wider uppercase font-mono">
                {player?.playerId || 'GENERATING ID...'}
              </span>
              <span className="px-2 py-0.5 bg-[#1a1508] border border-[#3b3423] text-[#4ade80] text-[10px] font-bold tracking-wider uppercase">
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
                className="text-[11px] font-bold tracking-wider text-[#ad8885] hover:text-[#ff3b3f] uppercase underline cursor-pointer"
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
                  className="px-4 py-1.5 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold uppercase disabled:opacity-50"
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

          <div className="flex flex-wrap items-center gap-3">
            {player?.playerId && (
              <button
                type="button"
                onClick={handleCopyId}
                className="px-4 py-2 bg-[#251f10] hover:bg-[#3b3423] border border-[#3b3423] text-xs font-bold font-mono text-[#ffb3ad] uppercase transition-all cursor-pointer"
              >
                {copied ? '✓ COPIED TO CLIPBOARD' : `SHARE ID: ${player.playerId}`}
              </button>
            )}
            {player?.playerId && (
              <Link
                to={`/players/${player.playerId}`}
                className="px-4 py-2 bg-[#201b0c] hover:bg-[#3f3927] border border-[#5d3f3d] text-xs font-bold tracking-wider text-[#ede1c9] uppercase transition-all"
              >
                VIEW PUBLIC PROFILE →
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="px-5 py-2 bg-[#ff3b3f] hover:bg-[#e02b2f] text-white text-xs font-bold tracking-[0.15em] uppercase transition-all shadow-[0_0_15px_rgba(255,59,63,0.3)]"
              >
                ADMIN QUEUE →
              </Link>
            )}
          </div>
        </div>

        {/* Rating & Performance Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Elo Rating Card */}
          <div className="p-8 bg-[#251f10] border border-[#3b3423] relative group hover:border-[#ff3b3f] transition-colors">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
              CURRENT PICKLEHUB RATING
            </div>
            <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-3">
              {player?.currentRating || 1000}{' '}
              <span className="text-xs font-sans font-normal text-[#ffb3ad]">Elo</span>
            </div>
            <div className="inline-block px-2.5 py-1 bg-[#1a1508] border border-[#5d3f3d] text-[#ede1c9] text-[11px] font-bold tracking-wider uppercase">
              TIER: {player?.category?.toUpperCase() || 'INTERMEDIATE'}
            </div>
          </div>

          {/* Win / Loss Record */}
          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
              CAREER MATCH RECORD
            </div>
            <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-3">
              {player?.matchesPlayed || 0}{' '}
              <span className="text-xs font-sans font-normal text-[#9a8e7a]">Played</span>
            </div>
            <div className="text-xs text-[#9a8e7a] flex items-center gap-3">
              <span>{player?.wins || 0} Wins</span>
              <span>•</span>
              <span>{player?.losses || 0} Losses ({player?.winPercentage || 0}%)</span>
            </div>
          </div>

          {/* Active Winning Streak */}
          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
              CURRENT WINNING STREAK
            </div>
            <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-3">
              {player?.winningStreak || 0}{' '}
              <span className="text-xs font-sans font-normal text-[#9a8e7a]">Matches</span>
            </div>
            <div className="text-xs text-[#9a8e7a]">
              Highest Elo: {player?.highestRating || 1000}
            </div>
          </div>

          {/* Tournament Record */}
          <div className="p-8 bg-[#251f10] border border-[#3b3423]">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[#ad8885] uppercase mb-1">
              TOURNAMENT RECORD
            </div>
            <div className="font-['Playfair_Display'] text-5xl font-bold text-[#ede1c9] mb-3">
              {player?.tournamentWins || 0}{' '}
              <span className="text-xs font-sans font-normal text-[#9a8e7a]">Titles</span>
            </div>
            <div className="text-xs text-[#9a8e7a]">
              {player?.tournamentAppearances || 0} Appearances
            </div>
          </div>
        </div>

        {/* Verification Architecture Banner */}
        <div className="p-8 bg-[#201b0c] border border-[#3b3423] mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#ff3b3f] uppercase block mb-1">
                TRANSPARENT TWO-PHASE VERIFICATION
              </span>
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#ede1c9]">
                Match Submission & Rating Pipeline
              </h2>
              <p className="text-xs text-[#d8cdb5] mt-1 max-w-2xl">
                Matches submitted from the court enter <span className="text-[#ffb3ad] font-bold font-mono">PENDING_APPROVAL</span> state. Ratings are updated via an atomic transaction only after administrator approval.
              </p>
            </div>
            <div className="px-4 py-2 bg-[#181305] border border-[#3b3423] text-xs font-bold font-mono text-[#ffdad6] shrink-0">
              0 PENDING MATCHES
            </div>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all">
            <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9] mb-2">
              Submit Match Scores
            </h3>
            <p className="text-xs text-[#9a8e7a] mb-4">
              Enter match participants, court, and scores for admin review.
            </p>
            <span className="text-xs font-bold tracking-wider text-[#ff3b3f] uppercase block">
              COMING IN SPRINT 5 →
            </span>
          </div>

          <div className="p-6 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all">
            <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9] mb-2">
              Official Leaderboard
            </h3>
            <p className="text-xs text-[#9a8e7a] mb-4">
              Explore club player rankings, category breakdowns, and specialty stats.
            </p>
            <span className="text-xs font-bold tracking-wider text-[#ff3b3f] uppercase block">
              COMING IN SPRINT 6 →
            </span>
          </div>

          <div className="p-6 bg-[#251f10] border border-[#3b3423] hover:border-[#ff3b3f] transition-all">
            <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#ede1c9] mb-2">
              Tournament Hub
            </h3>
            <p className="text-xs text-[#9a8e7a] mb-4">
              Register for upcoming club tournaments and view bracket seedings.
            </p>
            <span className="text-xs font-bold tracking-wider text-[#ff3b3f] uppercase block">
              COMING IN SPRINT 8 →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
