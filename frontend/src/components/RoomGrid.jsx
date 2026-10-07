import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import BookingModal from './BookingModal';
import { Lock, Search, AlertCircle, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import MagneticButton from './MagneticButton';

const RoomGrid = ({ currentUser, isAllotmentOpen }) => {
  const [rooms, setRooms] = useState([]);
  const [metrics, setMetrics] = useState({ total: 150, available: 150, held: 0, occupied: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalRoom, setActiveModalRoom] = useState(null);
  const [wardenSelectedRoom, setWardenSelectedRoom] = useState(null);
  const [actionError, setActionError] = useState('');
  const [liveToast, setLiveToast] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial room grid
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rooms');
      if (res.data?.success) {
        setRooms(res.data.rooms);
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-Time Socket listener for live room updates across all clients
  const handleRoomStatusChanged = useCallback(
    (data) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (room._id === data.roomId || room.number === data.roomNumber) {
            return {
              ...room,
              status: data.status,
              heldBy: data.heldBy || null,
              heldUntil: data.heldUntil || null,
              occupiedBy: data.occupiedBy || null,
              bookedAt: data.bookedAt || null,
            };
          }
          return room;
        })
      );

      // Trigger temporary visual live toast update
      const statusText =
        data.status === 'HELD'
          ? `held by ${data.heldBy?.name || 'a student'}`
          : data.status === 'OCCUPIED'
          ? `confirmed by ${data.occupiedBy?.name || 'a student'}`
          : 'now available';

      setLiveToast(`⚡ Room ${data.roomNumber} is ${statusText}`);
      setTimeout(() => setLiveToast(''), 4000);
    },
    []
  );

  useSocket(handleRoomStatusChanged);

  useEffect(() => {
    fetchRooms();
  }, []);

  // Update metrics whenever rooms state updates
  useEffect(() => {
    if (rooms.length > 0) {
      const available = rooms.filter((r) => r.status === 'AVAILABLE').length;
      const held = rooms.filter((r) => r.status === 'HELD').length;
      const occupied = rooms.filter((r) => r.status === 'OCCUPIED').length;
      setMetrics({ total: rooms.length, available, held, occupied });
    }
  }, [rooms]);

  const isStudent = currentUser?.role === 'STUDENT';
  const isAdmin = currentUser?.role === 'ADMIN';

  // Find room held by current student if any
  const myHeldRoom = isStudent
    ? rooms.find((r) => r.status === 'HELD' && r.heldBy?._id === currentUser?._id)
    : null;

  // Find room occupied by current student if any
  const myOccupiedRoom = isStudent
    ? rooms.find((r) => r.status === 'OCCUPIED' && r.occupiedBy?._id === currentUser?._id)
    : null;

  // Handle room card click
  const handleRoomClick = async (room) => {
    setActionError('');

    if (isAdmin) {
      if (room.status === 'OCCUPIED') {
        setWardenSelectedRoom(room);
      }
      return;
    }

    if (!isStudent) return;

    if (!isAllotmentOpen) {
      setActionError('Room Allotment is currently locked by the Hostel Warden.');
      return;
    }

    // Student clicks on their own held room -> Open Booking Modal
    if (room.status === 'HELD' && room.heldBy?._id === currentUser?._id) {
      setActiveModalRoom(room);
      return;
    }

    // Student clicks available room to place hold
    if (room.status === 'AVAILABLE') {
      try {
        setIsSubmitting(true);
        const res = await api.post(`/rooms/${room._id}/hold`);
        if (res.data?.success) {
          setActiveModalRoom(res.data.room);
        }
      } catch (err) {
        setActionError(err.response?.data?.message || 'Could not place hold on room.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Confirm booking action
  const handleConfirmBooking = async () => {
    if (!activeModalRoom) return;
    try {
      setIsSubmitting(true);
      const res = await api.post(`/rooms/${activeModalRoom._id}/confirm`);
      if (res.data?.success) {
        setActiveModalRoom(null);
        fetchRooms();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not confirm booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Release hold action
  const handleReleaseHold = async () => {
    if (!activeModalRoom) return;
    try {
      setIsSubmitting(true);
      await api.post(`/rooms/${activeModalRoom._id}/release`);
      setActiveModalRoom(null);
      fetchRooms();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Warden vacate room action
  const handleVacateRoom = async (roomId) => {
    try {
      setIsSubmitting(true);
      const res = await api.post(`/rooms/${roomId}/vacate`);
      if (res.data?.success) {
        setWardenSelectedRoom(null);
        fetchRooms();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Error vacating room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((room) => {
    const matchesFloor = selectedFloor === 'ALL' || room.floor === Number(selectedFloor);
    const matchesSearch = searchQuery === '' || room.number.toString().includes(searchQuery.trim());
    return matchesFloor && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Live Socket Broadcast Toast */}
      {liveToast && (
        <div className="p-3 px-4 bg-ink border border-ink text-paper text-xs flex items-center justify-between shadow-sm animate-bounce">
          <span className="font-sans font-medium">{liveToast}</span>
          <span className="text-[0.65rem] font-mono bg-paper/20 px-2 py-0.5 font-bold uppercase">
            Live Update
          </span>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Occupied Room Notification for Student */}
      {myOccupiedRoom && (
        <div className="p-5 bg-green/10 border border-green/30 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green/20 text-green flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-ink text-sm">Active Allotment</h4>
              <p className="text-xs text-muted">
                Room {myOccupiedRoom.number} (Floor {myOccupiedRoom.floor}) is officially assigned to you.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-green/20 text-green px-3 py-1 border border-green/30">
            ROOM {myOccupiedRoom.number}
          </span>
        </div>
      )}

      {/* Metrics Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-paper border border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-ink text-paper flex items-center justify-center font-bold">
            150
          </div>
          <div>
            <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Total Rooms</p>
            <p className="text-lg font-serif font-bold text-ink">{metrics.total}</p>
          </div>
        </div>

        <div className="p-4 bg-paper border border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-green/10 text-green flex items-center justify-center font-bold">
            {metrics.available}
          </div>
          <div>
            <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Available</p>
            <p className="text-lg font-serif font-bold text-green">{metrics.available}</p>
          </div>
        </div>

        <div className="p-4 bg-paper border border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/10 text-gold flex items-center justify-center font-bold">
            {metrics.held}
          </div>
          <div>
            <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Held (5m)</p>
            <p className="text-lg font-serif font-bold text-gold">{metrics.held}</p>
          </div>
        </div>

        <div className="p-4 bg-paper border border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-ink/10 text-ink/70 flex items-center justify-center font-bold">
            {metrics.occupied}
          </div>
          <div>
            <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Occupied</p>
            <p className="text-lg font-serif font-bold text-ink/70">{metrics.occupied}</p>
          </div>
        </div>
      </div>

      {/* Controls: Floor Selector & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 border border-border">
        {/* Floor Tabs */}
        <div className="flex items-center gap-1.5 p-1 border border-border w-full sm:w-auto">
          {['ALL', '1', '2', '3'].map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-sans font-medium transition-all ${
                selectedFloor === floor
                  ? 'bg-ink text-paper shadow-sm'
                  : 'text-muted hover:text-ink hover:bg-paper'
              }`}
            >
              {floor === 'ALL' ? 'All Floors (150)' : `Floor ${floor}`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room e.g. 105..."
            className="w-full pl-9 pr-4 py-2 bg-paper border-b-2 border-border text-sm text-ink placeholder-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-muted px-2">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-paper border border-border inline-block"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-green/20 border border-green inline-block"></span>
          <span>Your Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-gold/20 border border-gold/40 inline-block"></span>
          <span>Other's Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-ink/10 border border-ink/20 inline-block"></span>
          <span>Occupied</span>
        </div>
      </div>

      {/* 150 Room Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-mono text-muted text-xs uppercase tracking-wide">Loading Grid...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-2.5 sm:gap-3">
          {filteredRooms.map((room) => {
            const isMyHeld = room.status === 'HELD' && room.heldBy?._id === currentUser?._id;
            const isOtherHeld = room.status === 'HELD' && room.heldBy?._id !== currentUser?._id;
            const isOccupied = room.status === 'OCCUPIED';

            let cardStyles =
              'bg-paper border-border hover:border-ink/50 text-ink cursor-pointer';

            if (isMyHeld) {
              cardStyles =
                'bg-green/10 border-green text-green shadow-sm animate-pulse cursor-pointer';
            } else if (isOtherHeld) {
              cardStyles =
                'bg-gold/10 border-gold/30 text-gold cursor-not-allowed';
            } else if (isOccupied) {
              cardStyles = 'bg-ink/5 border-ink/10 text-ink/40 cursor-pointer';
            }

            return (
              <div
                key={room._id}
                onClick={() => handleRoomClick(room)}
                className={`p-3 border text-center transition-all duration-200 relative group flex flex-col items-center justify-center min-h-[72px] ${cardStyles}`}
              >
                <span className="text-xs font-bold font-sans tracking-tight">{room.number}</span>

                {isMyHeld && (
                  <span className="text-[0.55rem] font-medium uppercase tracking-[0.1em] text-green mt-1 flex items-center gap-0.5">
                    Yours
                  </span>
                )}

                {isOtherHeld && (
                  <span className="text-[0.55rem] font-medium uppercase tracking-[0.1em] text-gold mt-1 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Held
                  </span>
                )}

                {isOccupied && (
                  <span className="text-[0.55rem] font-medium uppercase tracking-[0.1em] text-ink/40 mt-1">Occupied</span>
                )}

                {/* Popover tooltip for room details */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 w-44 p-3 bg-ink border-none text-[11px] text-left shadow-lg pointer-events-none">
                  <p className="font-serif italic font-bold text-paper text-sm">Room {room.number}</p>
                  <p className="text-paper/60 mb-2">Floor {room.floor}</p>
                  {isOccupied && (
                    <p className="text-paper mt-1">
                      Booked by: {room.occupiedBy?.name || 'Student'}
                    </p>
                  )}
                  {isOtherHeld && (
                    <p className="text-gold mt-1">
                      Held by: {room.heldBy?.name || 'Student'}
                    </p>
                  )}
                  {room.status === 'AVAILABLE' && (
                    <p className="text-green mt-1">Click to place 5-minute hold</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {activeModalRoom && (
        <BookingModal
          room={activeModalRoom}
          currentUser={currentUser}
          onConfirm={handleConfirmBooking}
          onRelease={handleReleaseHold}
          onClose={() => setActiveModalRoom(null)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Warden Vacate Room Modal */}
      {wardenSelectedRoom && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-paper p-8 shadow-2xl">
            <h3 className="text-2xl font-serif font-bold text-ink italic mb-4">Room {wardenSelectedRoom.number} Occupancy</h3>
            <div className="bg-card p-4 text-xs space-y-2 text-ink/80 mb-6 border border-border">
              <p><span className="text-muted font-mono uppercase tracking-[0.1em]">Student:</span> {wardenSelectedRoom.occupiedBy?.name}</p>
              <p><span className="text-muted font-mono uppercase tracking-[0.1em]">Email:</span> {wardenSelectedRoom.occupiedBy?.email}</p>
              <p><span className="text-muted font-mono uppercase tracking-[0.1em]">USN:</span> {wardenSelectedRoom.occupiedBy?.usn || 'N/A'}</p>
            </div>
            <div className="flex gap-4 flex-col sm:flex-row">
              <button
                onClick={() => setWardenSelectedRoom(null)}
                className="flex-1 py-3 px-4 border border-border text-ink hover:bg-card transition-colors font-sans text-xs uppercase tracking-wide font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => handleVacateRoom(wardenSelectedRoom._id)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-accent hover:bg-accent/90 text-paper transition-colors font-sans text-xs uppercase tracking-wide font-semibold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Vacate Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomGrid;
