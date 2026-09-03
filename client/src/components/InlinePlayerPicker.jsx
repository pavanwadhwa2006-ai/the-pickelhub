/**
 * InlinePlayerPicker Component
 *
 * In-place flexible player selection combobox with zero page-jumping or redirection.
 * Features:
 * - Instant active club players dropdown on focus / click (no guessing or empty results)
 * - Live search filter by name, Player ID (PH-XXXXX), or tier
 * - Direct in-slot selection, change, and remove actions
 * - Built-in "📷 Scan QR" trigger for instant courtside player matching
 * - Exclusion of already-selected players across teams
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import TierBadge from './TierBadge';

const InlinePlayerPicker = ({
  selectedPlayer,
  onSelect,
  onClear,
  onOpenScanner,
  excludeIds = [],
  label = 'Player',
  placeholder = 'Search by name or PH-XXXXX...',
  readOnly = false,
  showQrScan = true,
  className = '',
}) => {
  const [manualEdit, setManualEdit] = useState(false);
  const isEditing = !selectedPlayer || manualEdit;
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch active players or search results
  const fetchPlayers = useCallback(
    async (query = '') => {
      setLoading(true);
      try {
        const endpoint = query && query.trim().length > 0
          ? `/players/search?q=${encodeURIComponent(query.trim())}`
          : '/players/search';
        const res = await api.get(endpoint);
        if (res.data.success) {
          const filtered = res.data.data.filter(
            (p) => !excludeIds.includes(p._id) && (!selectedPlayer || p._id !== selectedPlayer._id)
          );
          setResults(filtered);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [excludeIds, selectedPlayer]
  );

  // Debounced search on query change
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      fetchPlayers(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, isEditing, fetchPlayers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setDropdownOpen(true);
    if (results.length === 0) {
      fetchPlayers(searchQuery);
    }
  };

  const handleSelect = (player) => {
    onSelect(player);
    setManualEdit(false);
    setSearchQuery('');
    setDropdownOpen(false);
  };

  const handleChange = () => {
    setManualEdit(true);
    setSearchQuery('');
    setDropdownOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleRemove = () => {
    if (onClear) onClear();
    setManualEdit(false);
    setSearchQuery('');
    setDropdownOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative mb-3 ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold text-[var(--color-text-muted,#9a8e7a)] uppercase tracking-wider">
            {label}
          </label>
          {selectedPlayer && !readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleChange}
                className="text-[10px] text-[var(--color-accent-primary,#ff3b3f)] hover:underline font-bold uppercase cursor-pointer"
              >
                Change
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-[10px] text-rose-500 hover:underline font-bold uppercase cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* State 1: Selected Player Card */}
      {selectedPlayer && !isEditing ? (
        <div className="p-3 bg-[var(--color-bg-card,#1a1508)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl flex items-center justify-between gap-3 transition-all hover:border-[var(--color-border-strong,#5d3f3d)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[var(--color-accent-primary,#ff3b3f)]/20 border border-[var(--color-accent-primary,#ff3b3f)]/40 flex items-center justify-center font-bold text-xs text-[var(--color-text-primary,#ede1c9)] shrink-0 overflow-hidden">
              {selectedPlayer.profilePhoto ? (
                <img
                  src={selectedPlayer.profilePhoto}
                  alt={selectedPlayer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (selectedPlayer.name || 'P').slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-[var(--color-text-primary,#ede1c9)] truncate">
                {selectedPlayer.name}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted,#ad8885)] font-mono flex items-center gap-2">
                <span>{selectedPlayer.playerId}</span>
                <span>•</span>
                <span className="font-bold text-[var(--color-text-primary,#ede1c9)]">
                  {selectedPlayer.currentRating} Elo
                </span>
              </div>
            </div>
          </div>
          <TierBadge category={selectedPlayer.category} size="sm" />
        </div>
      ) : (
        /* State 2: In-Slot Search Input */
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                className="w-full pl-9 pr-3 py-2.5 bg-[var(--color-bg-card,#181305)] border border-[var(--color-border-subtle,#3b3423)] focus:border-[var(--color-accent-primary,#ff3b3f)] rounded-xl text-xs text-[var(--color-text-primary,#ede1c9)] placeholder-[var(--color-text-muted,#786d57)] focus:outline-none transition-all shadow-inner"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted,#9a8e7a)] pointer-events-none">
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted,#9a8e7a)] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {showQrScan && onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                title="Scan Opponent's Digital Pass QR"
                className="px-3 py-2.5 bg-[var(--color-bg-card,#181305)] hover:bg-[var(--color-bg-card-hover,#251f10)] border border-[var(--color-border-subtle,#3b3423)] hover:border-[var(--color-accent-primary,#ff3b3f)] rounded-xl text-xs font-bold text-[var(--color-accent-primary,#ff3b3f)] flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <span>📷</span>
                <span className="hidden sm:inline">Scan QR</span>
              </button>
            )}

            {selectedPlayer && (
              <button
                type="button"
                onClick={() => setManualEdit(false)}
                className="px-2.5 py-2.5 bg-[var(--color-bg-card,#181305)] text-[var(--color-text-muted,#9a8e7a)] hover:text-white border border-[var(--color-border-subtle,#3b3423)] rounded-xl text-xs font-bold cursor-pointer"
                title="Cancel change"
              >
                ✕
              </button>
            )}
          </div>

          {/* Floating Dropdown List — Positioned directly under the slot */}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[var(--color-bg-card,#1f190a)] border border-[var(--color-border-strong,#5d3f3d)] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-[var(--color-border-subtle,#2f2919)] backdrop-blur-md">
              {loading ? (
                <div className="p-3 text-center text-xs text-[var(--color-text-muted,#9a8e7a)] flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-[var(--color-accent-primary,#ff3b3f)] border-t-transparent rounded-full animate-spin" />
                  <span>Loading club players...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--color-text-muted,#9a8e7a)]">
                  {searchQuery ? `No active players found matching "${searchQuery}".` : 'No active players available.'}
                </div>
              ) : (
                <>
                  <div className="px-3 py-1.5 bg-[var(--color-bg-base,#140f02)]/70 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted,#9a8e7a)] sticky top-0">
                    {searchQuery ? 'Matching Players' : 'Active Club Players (Select to fill)'}
                  </div>
                  {results.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="w-full px-3 py-2.5 text-left hover:bg-[var(--color-bg-card-hover,#2a2211)] flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-accent-primary,#ff3b3f)]/20 border border-[var(--color-accent-primary,#ff3b3f)]/40 flex items-center justify-center font-bold text-[10px] text-[var(--color-text-primary,#ede1c9)] shrink-0 overflow-hidden">
                          {p.profilePhoto ? (
                            <img src={p.profilePhoto} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            (p.name || 'P').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[var(--color-text-primary,#ede1c9)] group-hover:text-[var(--color-accent-primary,#ff3b3f)] transition-colors truncate">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-muted,#9a8e7a)] font-mono">
                            {p.playerId}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-xs text-[var(--color-text-primary,#ede1c9)]">
                          {p.currentRating} Elo
                        </span>
                        <TierBadge category={p.category} size="sm" />
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InlinePlayerPicker;
