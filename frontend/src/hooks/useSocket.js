import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (
  onRoomStatusChanged,
  onAllotmentStatusChanged,
  onComplaintEvent,
  onLeaveEvent
) => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to Hostel Real-Time Server:', socket.id);
    });

    if (onRoomStatusChanged) {
      socket.on('room_status_changed', onRoomStatusChanged);
    }

    if (onAllotmentStatusChanged) {
      socket.on('allotment_status_changed', onAllotmentStatusChanged);
    }

    if (onComplaintEvent) {
      socket.on('complaint_created', onComplaintEvent);
      socket.on('complaint_updated', onComplaintEvent);
    }

    if (onLeaveEvent) {
      socket.on('leave_submitted', onLeaveEvent);
      socket.on('leave_reviewed', onLeaveEvent);
    }

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected from server');
    });

    return () => {
      socket.disconnect();
    };
  }, [onRoomStatusChanged, onAllotmentStatusChanged, onComplaintEvent, onLeaveEvent]);

  return { socket: socketRef.current };
};
