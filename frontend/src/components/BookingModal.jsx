import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const BookingModal = ({ room, currentUser, onConfirm, onRelease, onClose, isSubmitting }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (!room?.heldUntil) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(room.heldUntil).getTime();
      const diffInSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diffInSeconds);

      if (diffInSeconds === 0) {
        onClose(); // Close modal if hold expires
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [room?.heldUntil, onClose]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeft < 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Room {room.number} Held</h3>
              <p className="text-xs text-slate-400">Floor {room.floor} — Single Occupancy</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Live Countdown Clock */}
        <div
          className={`p-5 rounded-2xl border transition-all mb-6 text-center ${
            isLowTime
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Hold Expiration Timer
            </span>
          </div>
          <div className="text-4xl font-mono font-extrabold tracking-tight">
            {formatTime(timeLeft)}
          </div>
          <p className="text-[11px] opacity-80 mt-1">
            {isLowTime
              ? 'Warning: Less than 1 minute remaining before room is auto-released!'
              : 'Only you can confirm this room while the timer is active.'}
          </p>
        </div>

        {/* Student & Room Details Summary */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-2 mb-6 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Student Name:</span>
            <span className="font-semibold text-slate-200">{currentUser?.name}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>College Email:</span>
            <span className="font-semibold text-slate-200">{currentUser?.email}</span>
          </div>
          {currentUser?.usn && (
            <div className="flex justify-between text-slate-400">
              <span>BMSCE USN:</span>
              <span className="font-mono font-semibold text-indigo-300">{currentUser.usn}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRelease}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-all disabled:opacity-50"
          >
            Release Hold
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting || timeLeft === 0}
            className="flex-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm Room Allotment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
