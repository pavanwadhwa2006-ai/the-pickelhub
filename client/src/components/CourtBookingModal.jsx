/**
 * CourtBookingModal Component — Streamlined Mobile-Friendly Court Reservation
 *
 * Operating Hours: 11:00 AM to 11:00 PM (1-hour slots).
 * Clean, lightweight, intuitive mobile layout:
 * - Court 1 and Court 2 tabs
 * - Today / Tomorrow / Custom date selector
 * - Interactive slot selection: tap an available slot to select
 * - Prominent "🔒 BOOKED" indicator for occupied slots showing athlete details
 * - Single prominent confirmation button at the bottom
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [selectedSlot, setSelectedSlot] = useState(null); // '11:00', '12:00', etc.
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const todayStr = formatDateString(new Date());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateString(tomorrow);

  // Reset selected slot when court or date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedCourt, selectedDate]);

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
      if (!data?.date || data.date === selectedDate) {
        fetchSchedule(selectedDate);
      }
    }, [selectedDate, fetchSchedule]),
    { enabled: isOpen }
  );

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle booking the selected slot
  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.post('/bookings', {
        court: selectedCourt,
        date: selectedDate,
        slot: selectedSlot,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || `Successfully booked ${selectedCourt}!`);
        setSelectedSlot(null);
        await fetchSchedule(selectedDate);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete reservation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancelling an existing reservation
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

  const courtSlots = scheduleData?.[selectedCourt] || [];
  const selectedSlotObj = courtSlots.find((s) => s.slot === selectedSlot);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Background click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg bg-[var(--color-bg-card,#1a1508)] border-2 border-[var(--color-border-subtle,#3b3423)] rounded-3xl p-4 sm:p-5 shadow-2xl m-auto max-h-[88vh] flex flex-col"
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#ff3b3f] via-amber-500 to-emerald-500 rounded-t-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle,#3b3423)] mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎾</span>
            <div>
              <h2 className="font-['Playfair_Display'] text-lg sm:text-2xl font-bold text-[var(--color-text-primary,#ede1c9)]">
                Court Booking
              </h2>
              <span className="text-[10px] text-[var(--color-text-muted,#9a8e7a)] block">
                Hours: 11:00 AM – 11:00 PM • Court 1 & Court 2
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] text-[var(--color-text-muted,#9a8e7a)] hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-3 p-2.5 bg-rose-950/40 border border-rose-500/60 rounded-xl text-rose-300 text-xs font-semibold flex items-center justify-between shrink-0">
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="hover:text-white cursor-pointer ml-2">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-2.5 bg-emerald-950/40 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between shrink-0">
            <span>✓ {successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg(null)} className="hover:text-white cursor-pointer ml-2">✕</button>
          </div>
        )}

        {/* Court Selection Tabs with Dynamic Outer Frame */}
        <div className="mb-2.5 shrink-0">
          <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--color-text-muted,#9a8e7a)] uppercase mb-2 px-1 flex items-center justify-between">
            <span>SELECT FACILITY COURT</span>
            <span className="text-[#ff3b3f] font-mono font-bold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3b3f] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff3b3f]" />
              </span>
              ACTIVE: {selectedCourt.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-1">
            {COURTS.map((court) => {
              const isSelected = selectedCourt === court;
              const slots = scheduleData?.[court] || [];
              const openCount = slots.filter((s) => !s.isBooked).length;

              return (
                <button
                  key={court}
                  type="button"
                  onClick={() => setSelectedCourt(court)}
                  className={`relative p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer overflow-visible flex flex-col justify-between min-h-[82px] ${
                    isSelected
                      ? 'bg-[var(--color-bg-card,#1a1508)] text-white border-2 border-[#ff3b3f] ring-4 ring-[#ff3b3f]/30 ring-offset-2 ring-offset-[var(--color-bg-base,#140f02)] shadow-[0_0_24px_rgba(255,59,63,0.35)] scale-[1.01]'
                      : 'bg-[var(--color-bg-base,#140f02)] text-[var(--color-text-muted,#9a8e7a)] border-2 border-[var(--color-border-subtle,#3b3423)] hover:border-[#5a4d35] hover:text-white'
                  }`}
                >
                  {/* Outer Frame Corner Brackets on the outer side */}
                  {isSelected && (
                    <>
                      <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#ff3b3f] rounded-tl-sm pointer-events-none" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#ff3b3f] rounded-tr-sm pointer-events-none" />
                      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#ff3b3f] rounded-bl-sm pointer-events-none" />
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#ff3b3f] rounded-br-sm pointer-events-none" />
                    </>
                  )}

                  {/* Court Header Row */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full transition-colors ${isSelected ? 'bg-[#ff3b3f] shadow-[0_0_8px_#ff3b3f] animate-pulse' : 'bg-[#3b3423]'}`} />
                      <span className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[var(--color-text-primary,#ede1c9)]">
                        {court}
                      </span>
                    </div>
                    {isSelected ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ff3b3f] text-white font-mono font-bold tracking-wider shrink-0 shadow-sm">
                        FRAMED
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f190a] text-[var(--color-text-muted,#9a8e7a)] font-mono shrink-0">
                        TAP TO FRAME
                      </span>
                    )}
                  </div>

                  {/* Stylized Pickleball Court Line Graphic */}
                  <div className={`w-full h-5 rounded border ${isSelected ? 'border-[#ff3b3f]/50 bg-[#ff3b3f]/10 text-white' : 'border-[#3b3423]/50 bg-black/20 text-[var(--color-text-muted,#9a8e7a)]'} relative flex items-center justify-between px-2 my-1 overflow-hidden transition-colors`}>
                    {/* Non-Volley Zone / Kitchen Center Lines */}
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1/3 border-x border-dashed border-current opacity-40" />
                    {/* Net Line in Center */}
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-current opacity-70" />
                    <span className="text-[7px] font-mono opacity-70 z-10 uppercase">Base</span>
                    <span className="text-[7px] font-mono opacity-50 z-10 uppercase tracking-tighter">Kitchen</span>
                    <span className="text-[7px] font-mono opacity-70 z-10 uppercase">Base</span>
                  </div>

                  {/* Court Subtitle & Status */}
                  <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted,#9a8e7a)] mt-0.5">
                    <span className="truncate">
                      {court === 'Court 1' ? 'Indoor Hardcourt' : 'Championship Court'}
                    </span>
                    <span className="font-mono text-[9px] font-bold text-emerald-400">
                      {slots.length > 0 ? `${openCount} open` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Selector Strip */}
        <div className="flex items-center justify-between gap-2 p-2 bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl mb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-[#ff3b3f] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-[#ff3b3f] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              Tomorrow
            </button>
          </div>
          <input
            type="date"
            min={todayStr}
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="px-2.5 py-1 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs rounded-lg focus:outline-none focus:border-[#ff3b3f]"
          />
        </div>

        {/* Outer Court Frame Boundary for Selected Court */}
        <div className="border-2 border-[#ff3b3f]/70 rounded-2xl p-2.5 bg-[var(--color-bg-base,#140f02)]/70 relative flex flex-col flex-1 overflow-hidden shadow-[0_0_20px_rgba(255,59,63,0.15)] mb-2">
          {/* Outer Frame Corner Brackets for Arena */}
          <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#ff3b3f] rounded-tl-sm pointer-events-none" />
          <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#ff3b3f] rounded-tr-sm pointer-events-none" />
          <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#ff3b3f] rounded-bl-sm pointer-events-none" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#ff3b3f] rounded-br-sm pointer-events-none" />

          {/* Schedule Subtitle Header */}
          <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase mb-2 px-1 shrink-0 pb-1.5 border-b border-[#3b3423]/60">
            <span className="flex items-center gap-1.5 text-[#ff3b3f]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b3f] shadow-[0_0_6px_#ff3b3f]" />
              <span className="font-mono">{selectedCourt.toUpperCase()} ARENA BOUNDARY</span>
              <span className="text-[10px] text-[var(--color-text-muted)] lowercase font-normal">
                ({new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})
              </span>
            </span>
            <span className="text-emerald-400 font-mono">
              {courtSlots.filter((s) => !s.isBooked).length} Available
            </span>
          </div>

        {/* Slots Grid (11:00 AM – 11:00 PM) */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--color-text-muted)] animate-pulse shrink-0">
            <span className="text-2xl block mb-2">⏱</span>
            Loading court schedule...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-0.5 my-1 flex-1">
            {courtSlots.map((slotDef) => {
              const isSelected = selectedSlot === slotDef.slot;
              const isCancelling = cancelLoadingId === slotDef.bookingId;

              if (slotDef.isBooked) {
                return (
                  <div
                    key={slotDef.slot}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[72px] transition-all ${
                      slotDef.isMyBooking
                        ? 'bg-[#251f10] border-[#ff3b3f]/70'
                        : 'bg-[var(--color-bg-base,#140f02)]/90 border-[#3b3423] opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[11px] font-bold text-[var(--color-text-muted,#9a8e7a)]">
                        {slotDef.timeLabel.split(' - ')[0]}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider font-mono bg-rose-950/40 text-rose-400 border border-rose-800/40 shrink-0">
                        🔒 BOOKED
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted,#9a8e7a)]">
                      <span className="truncate block font-medium">
                        {slotDef.isMyBooking ? (
                          <strong className="text-[#ffb3ad]">Your Booking</strong>
                        ) : (
                          `${slotDef.bookedBy?.name || 'Athlete'} (${slotDef.bookedBy?.playerId || ''})`
                        )}
                      </span>
                      {slotDef.isMyBooking && (
                        <button
                          type="button"
                          onClick={() => handleCancelReservation(slotDef.bookingId)}
                          disabled={isCancelling}
                          className="text-rose-400 hover:text-rose-200 font-bold uppercase underline cursor-pointer ml-1 shrink-0 text-[9px]"
                        >
                          {isCancelling ? '...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // Available Slot Button
              return (
                <button
                  key={slotDef.slot}
                  type="button"
                  onClick={() => setSelectedSlot(slotDef.slot)}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[72px] text-left cursor-pointer group ${
                    isSelected
                      ? 'bg-[#ff3b3f]/15 border-[#ff3b3f] ring-2 ring-[#ff3b3f]/40 shadow-sm'
                      : 'bg-[var(--color-bg-base,#140f02)] border-[#2f2919] hover:border-[#ff3b3f]/60 hover:bg-[#201b0c]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full mb-1">
                    <span className="font-mono text-[11px] font-bold text-[var(--color-text-primary,#ede1c9)] group-hover:text-white">
                      {slotDef.timeLabel.split(' - ')[0]}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                        isSelected
                          ? 'bg-[#ff3b3f] text-white'
                          : 'bg-emerald-950/30 text-emerald-400 border border-emerald-800/40'
                      }`}
                    >
                      {isSelected ? '✓ SELECTED' : 'OPEN'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted,#9a8e7a)] block">
                    {slotDef.timeLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        </div>

        {/* Modal Footer Confirmation Action */}
        <div className="pt-3 border-t border-[var(--color-border-subtle,#3b3423)] mt-2 shrink-0">
          {selectedSlot ? (
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={actionLoading}
              className="w-full py-3 px-4 bg-[#ff3b3f] hover:bg-[#e02b2f] disabled:opacity-60 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>{actionLoading ? '⏳' : '✓'}</span>
              <span>
                {actionLoading
                  ? 'Reserving Slot...'
                  : `Confirm Booking: ${selectedCourt} at ${selectedSlotObj?.timeLabel || selectedSlot}`}
              </span>
            </button>
          ) : (
            <div className="w-full py-2.5 text-center text-xs text-[var(--color-text-muted,#9a8e7a)] bg-[var(--color-bg-base,#140f02)] border border-[var(--color-border-subtle,#3b3423)] rounded-xl font-medium">
              Tap an open time slot above to book {selectedCourt}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default CourtBookingModal;
