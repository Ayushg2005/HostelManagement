import React from 'react';
import { Lock, Unlock, AlertOctagon, Sparkles } from 'lucide-react';
import MagneticButton from './MagneticButton';

const AllotmentControlBanner = ({ isAllotmentOpen, onToggle, isAdmin, isToggling }) => {
  if (isAdmin) {
    return (
      <div className="p-6 sm:p-8 bg-card border border-border mb-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 flex items-center justify-center font-bold text-paper shadow-sm ${
              isAllotmentOpen
                ? 'bg-green'
                : 'bg-accent'
            }`}
          >
            {isAllotmentOpen ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[0.65rem] font-mono font-bold text-muted uppercase tracking-widest">
                Warden Master Control
              </span>
              <span
                className={`text-[0.6rem] font-mono font-bold px-2 py-0.5 uppercase tracking-wider ${
                  isAllotmentOpen
                    ? 'bg-green/10 text-green border border-green/20'
                    : 'bg-accent/10 text-accent border border-accent/20'
                }`}
              >
                {isAllotmentOpen ? 'Live' : 'Locked'}
              </span>
            </div>
            <h4 className="text-xl font-serif font-bold text-ink italic">
              {isAllotmentOpen
                ? 'Room Allotment is currently OPEN'
                : 'Room Allotment is currently LOCKED'}
            </h4>
          </div>
        </div>

        <MagneticButton
          onClick={onToggle}
          disabled={isToggling}
          className={`w-full sm:w-auto !py-3 !px-6 ${
            isAllotmentOpen
              ? '!bg-accent hover:!bg-accent/90'
              : '!bg-green hover:!bg-green/90'
          }`}
        >
          {isToggling ? (
            'Processing...'
          ) : isAllotmentOpen ? (
            <>
              <Lock className="w-4 h-4" /> Lock Allotment
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Start Allotment
            </>
          )}
        </MagneticButton>
      </div>
    );
  }

  // Student view lock banner
  if (!isAllotmentOpen) {
    return (
      <div className="p-8 sm:p-12 bg-card border border-accent/20 mb-6 text-center shadow-sm">
        <div className="w-16 h-16 bg-accent/10 text-accent border border-accent/20 flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-ink italic mb-3">Portal Locked</h3>
        <p className="text-sm font-sans text-muted max-w-lg mx-auto leading-relaxed">
          The Hostel Warden has not initiated room allotment yet. When the Warden starts the allotment process, this portal will automatically unlock live across all screens.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 px-6 bg-green/10 border border-green/20 text-green text-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 animate-spin" />
        <span className="font-sans font-medium">Room Allotment is LIVE! Select your preferred room below.</span>
      </div>
      <span className="text-[0.65rem] font-mono tracking-widest px-3 py-1 bg-green/20 text-green font-bold uppercase border border-green/30">
        Unlocked by Warden
      </span>
    </div>
  );
};

export default AllotmentControlBanner;
