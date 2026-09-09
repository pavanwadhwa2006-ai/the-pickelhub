/**
 * CourtBookingModal Component — The PickleHub Court Reservation System
 *
 * Provides real-time interactive scheduling for Court 1 and Court 2.
 * Allows athletes to select a date, view all 1-hour time slots (6 AM - 11 PM),
 * see who booked reserved slots with their player identity, book open courts,
 * and cancel their existing reservations.
 *
 * Fully integrated with Pusher WebSocket real-time synchronization.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import useLiveSync from '../hooks/useLiveSync';
import { REALTIME_CHANNELS, REALTIME_EVENTS } from '../services/realtime';

const COURTS = ['Court 1', 'Court 2'];

const formatDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CourtBookingModal = ({ isOpen, onClose, user, player }) => {
  const [selectedDate, setSelectedDate] = useState(() => formatDateString(new Date()));
  const [selectedCourt, setSelectedCourt] = useState('Court 1');
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // slot string when reserving
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const todayStr = formatDateString(new Date());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateString(tomorrow);

  // Fetch court schedule for the selected date
  const fetchSchedule = useCallback(async (dateToFetch) => {
    const targetDate = dateToFetch || selectedDate;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/bookings?date=${targetDate}`);
      if (res.data.success) {
        setScheduleData(res.data.data.schedule);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load court schedule.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      fetchSchedule(selectedDate);
    }
  }, [isOpen, selectedDate, fetchSchedule]);

  // Real-time synchronization when any user books or cancels a court
  useLiveSync(
    isOpen ? REALTIME_CHANNELS.GLOBAL : null,
    [REALTIME_EVENTS.BOOKING_CREATED, REALTIME_EVENTS.BOOKING_CANCELLED],
    useCallback((data) => {
      // If event happened on the date currently being viewed, refresh immediately
      if (!data?.date || data.date === selectedDate) {
        fetchSchedule(selectedDate);
      }
    }, [selectedDate, fetchSchedule]),
    { enabled: isOpen }
  );

  if (!isOpen) return null;

  // Handle booking a slot
  const handleBookSlot = async (slotDef) => {
    setActionLoading(slotDef.slot);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.post('/bookings', {
        court: selectedCourt,
        date: selectedDate,
        slot: slotDef.slot,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || `Successfully booked ${selectedCourt}!`);
        await fetchSchedule(selectedDate);
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete reservation.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle cancelling a reservation
  const handleCancelReservation = async (bookingId) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this court reservation?');
    if (!confirmCancel) return;

    setCancelLoadingId(bookingId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.delete(`/bookings/${bookingId}`);
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Reservation cancelled.');
        await fetchSchedule(selectedDate);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to cancel reservation.');
    } finally {
      setCancelLoadingId(null);
    }
  };

  const currentCourtSlots = scheduleData?.[selectedCourt] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="w-full max-w-4xl bg-[var(--color-bg-card,#1a1508)] border-2 border-[var(--color-border-subtle,#3b3423)] rounded-3xl p-5 sm:p-8 shadow-2xl relative my-8"
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#ff3b3f] via-amber-500 to-emerald-500 rounded-t-3xl" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border-subtle,#3b3423)] mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎾</span>
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#ff3b3f] uppercase font-mono">
                COURT RESERVATION DESK
              </span>
            </div>
            <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[var(--color-text-primary,#ede1c9)]">
              Book Court 1 & Court 2
            </h2>
            <p className="text-xs text-[var(--color-text-muted,#9a8e7a)] mt-0.5">
              Select your date, view who has reserved each time slot, and book instant court sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-full bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] text-[var(--color-text-muted,#9a8e7a)] hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Alerts & Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-950/40 border border-rose-500/60 rounded-xl text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="hover:text-white">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-950/40 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>✓ {successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg(null)} className="hover:text-white">✕</button>
          </div>
        )}

        {/* Date & Court Selector Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] rounded-2xl mb-6">
          {/* Quick Date Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-[#ff3b3f] text-white shadow-sm'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)] hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-[#ff3b3f] text-white shadow-sm'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)] hover:text-white'
              }`}
            >
              Tomorrow
            </button>
            {/* Custom Date Input */}
            <input
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs rounded-xl focus:outline-none focus:border-[#ff3b3f]"
            />
          </div>

          {/* Court Tabs */}
          <div className="flex items-center gap-2 p-1 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl">
            {COURTS.map((court) => (
              <button
                key={court}
                type="button"
                onClick={() => setSelectedCourt(court)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  selectedCourt === court
                    ? 'bg-[#ff3b3f] text-white shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-white'
                }`}
              >
                {court}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Slots Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
            <span>
              {selectedCourt} Schedule for{' '}
              <span className="text-[#ff3b3f] font-mono">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </span>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              Hours: 6:00 AM – 11:00 PM
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-[var(--color-text-muted)] animate-pulse">
              <span className="text-2xl block mb-2">⏱</span>
              Loading court schedule and availability...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {currentCourtSlots.map((slotDef) => {
                const isBooking = actionLoading === slotDef.slot;
                const isCancelling = cancelLoadingId === slotDef.bookingId;

                return (
                  <div
                    key={slotDef.slot}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[105px] ${
                      slotDef.isMyBooking
                        ? 'bg-[#251f10] border-[#ff3b3f] shadow-[0_0_12px_rgba(255,59,63,0.15)]'
                        : slotDef.isBooked
                        ? 'bg-[var(--color-bg-base,#140f02)]/90 border-[#3b3423]'
                        : 'bg-[var(--color-bg-base,#140f02)] border-[#2f2919] hover:border-emerald-500/60'
                    }`}
                  >
                    {/* Time & Status Row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-[var(--color-text-primary,#ede1c9)]">
                        {slotDef.timeLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase font-mono ${
                          slotDef.isMyBooking
                            ? 'bg-[#ff3b3f]/20 text-[#ffb3ad] border border-[#ff3b3f]/40'
                            : slotDef.isBooked
                            ? 'bg-amber-950/30 text-amber-400 border border-amber-800/40'
                            : 'bg-emerald-950/30 text-emerald-400 border border-emerald-800/40'
                        }`}
                      >
                        {slotDef.isMyBooking
                          ? 'YOUR SLOT'
                          : slotDef.isBooked
                          ? 'RESERVED'
                          : 'AVAILABLE'}
                      </span>
                    </div>

                    {/* Booked Player Details OR Booking Action */}
                    {slotDef.isBooked ? (
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle,#2f2919)]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-6 h-6 rounded-full bg-[#ff3b3f] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {slotDef.bookedBy?.profilePhoto ? (
                              <img
                                src={slotDef.bookedBy.profilePhoto}
                                alt={slotDef.bookedBy.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              (slotDef.bookedBy?.name || 'P')[0].toUpperCase()
                            )}
                          </div>
                          <div className="truncate text-left">
                            <span className="text-[11px] font-bold text-[var(--color-text-primary,#ede1c9)] block truncate">
                              {slotDef.bookedBy?.name || 'Athlete'}
                            </span>
                            <span className="text-[9px] font-mono text-[var(--color-text-muted,#9a8e7a)] block">
                              {slotDef.bookedBy?.playerId}
                            </span>
                          </div>
                        </div>

                        {slotDef.isMyBooking && (
                          <button
                            type="button"
                            onClick={() => handleCancelReservation(slotDef.bookingId)}
                            disabled={isCancelling}
                            className="text-[10px] text-rose-400 hover:text-rose-200 font-bold uppercase underline shrink-0 cursor-pointer ml-2"
                          >
                            {isCancelling ? '...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBookSlot(slotDef)}
                        disabled={isBooking}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm disabled:opacity-50 mt-1"
                      >
                        {isBooking ? (
                          <span>Reserving...</span>
                        ) : (
                          <>
                            <span>+</span>
                            <span>Reserve Court</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle,#3b3423)] flex items-center justify-between text-[11px] text-[var(--color-text-muted,#9a8e7a)]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live real-time court availability powered by Pusher WebSockets.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] text-[var(--color-text-primary,#ede1c9)] hover:text-white rounded-xl font-bold uppercase text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CourtBookingModal;
