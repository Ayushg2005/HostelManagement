import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import RoomGrid from '../components/RoomGrid';
import AllotmentControlBanner from '../components/AllotmentControlBanner';
import ComplaintSystem from '../components/ComplaintSystem';
import LeaveTracker from '../components/LeaveTracker';
import NightCanteen from '../components/NightCanteen';
import gsap from 'gsap';
import {
  LogOut,
  ShieldCheck,
  Utensils,
  Home,
  BedDouble,
  Wrench,
  Clock,
  ShoppingBag,
} from 'lucide-react';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isCook = user?.role === 'COOK';
  const [activeTab, setActiveTab] = useState(isCook ? 'CANTEEN' : 'ALLOTMENT'); // 'ALLOTMENT' | 'CANTEEN' | 'LEAVE' | 'COMPLAINTS'
  const [isAllotmentOpen, setIsAllotmentOpen] = useState(false);
  const [isTogglingConfig, setIsTogglingConfig] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [pendingMetrics, setPendingMetrics] = useState({ leaves: 0, complaints: 0 });

  // Fetch current system configuration
  const fetchConfig = async () => {
    try {
      const res = await api.get('/config');
      if (res.data?.success) {
        setIsAllotmentOpen(res.data.config.isAllotmentOpen);
      }
    } catch (err) {
      console.error('Error fetching system config:', err);
    }
  };

  const fetchPendingMetrics = async () => {
    if (!isAdmin) return;
    try {
      const [leaveRes, compRes] = await Promise.all([
        api.get('/leave?status=PENDING'),
        api.get('/complaints')
      ]);
      
      const pendingLeaves = leaveRes.data?.logs?.length || 0;
      const pendingComplaints = compRes.data?.analytics?.raised || 0;
      
      setPendingMetrics({ leaves: pendingLeaves, complaints: pendingComplaints });
    } catch (err) {
      console.error('Error fetching pending metrics:', err);
    }
  };

  // Real-time listener for allotment status changes
  const handleSocketEvents = useCallback((data) => {
    if (data.isAllotmentOpen !== undefined) {
      setIsAllotmentOpen(data.isAllotmentOpen);
    }
    if (data.message) {
      setToastMessage(data.message);
      setTimeout(() => setToastMessage(''), 5000);
    }
    // Refresh metrics on any relevant event
    fetchPendingMetrics();
  }, []);

  useSocket(null, handleSocketEvents, handleSocketEvents, handleSocketEvents);

  useEffect(() => {
    fetchConfig();
    fetchPendingMetrics();

    // Fix GSAP in React 18 Strict Mode by using fromTo
    gsap.fromTo('.dash-header', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
    gsap.fromTo('.dash-welcome', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.1 });
    gsap.fromTo('.dash-tabs', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.2 });
    gsap.fromTo('.dash-content', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.3 });
  }, [isAdmin]);

  // Admin toggle allotment action
  const handleToggleAllotment = async () => {
    try {
      setIsTogglingConfig(true);
      const res = await api.post('/config/toggle-allotment', { isOpen: !isAllotmentOpen });
      if (res.data?.success) {
        setIsAllotmentOpen(res.data.config.isAllotmentOpen);
      }
    } catch (err) {
      console.error('Error toggling allotment:', err);
    } finally {
      setIsTogglingConfig(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] tracking-[0.1em] uppercase font-mono bg-ink text-paper border border-ink rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Warden Portal
          </span>
        );
      case 'COOK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] tracking-[0.1em] uppercase font-mono bg-green text-paper border border-green rounded-full">
            <Utensils className="w-3.5 h-3.5" /> Cook Kitchen Board
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] tracking-[0.1em] uppercase font-mono bg-ink text-paper border border-ink rounded-full">
            BMSCE Student Portal
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans relative">
      {/* Top Header */}
      <header className="border-b border-border bg-paper/90 backdrop-blur-md sticky top-0 z-40 dash-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ink flex items-center justify-center text-paper font-bold shadow-sm">
              <Home className="w-5 h-5 text-paper" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg tracking-tight text-ink italic">Hostel Portal</h1>
              <p className="text-[0.65rem] font-mono tracking-widest text-muted uppercase">BMS College</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-ink">{user?.name}</p>
              <p className="text-[11px] text-muted">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-transparent hover:bg-ink hover:text-paper text-muted border border-border text-xs font-semibold transition-all duration-300"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Real-time Toast Alert */}
        {toastMessage && (
          <div className="p-4 bg-ink border border-ink text-paper text-xs flex items-center justify-between shadow-xl animate-bounce">
            <span className="font-medium tracking-wide">{toastMessage}</span>
            <span className="text-[0.65rem] font-mono bg-paper/20 px-2.5 py-1 font-bold uppercase tracking-[0.1em]">
              Socket Alert
            </span>
          </div>
        )}

        {/* Welcome Header */}
        <div className="bg-card p-6 sm:p-10 border border-border relative overflow-hidden dash-welcome">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="mb-4">{getRoleBadge(user?.role)}</div>
              <h2 className="text-3xl sm:text-4xl font-serif text-ink tracking-tight mb-2">
                Welcome, <em>{user?.name}</em>
              </h2>
              <p className="text-sm text-muted">
                Select a hostel service from the navigation board below.
              </p>
            </div>

            {user?.role === 'STUDENT' && user?.usn && (
              <div className="bg-paper p-4 border border-border text-right shadow-sm">
                <p className="text-[0.65rem] font-mono uppercase tracking-[0.2em] text-muted">BMSCE USN</p>
                <p className="text-base font-serif italic font-bold text-ink">{user.usn}</p>
              </div>
            )}
          </div>
        </div>

        {/* 4-Module Hub Navigation Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 dash-tabs">
          {!isCook && (
            <button
              onClick={() => setActiveTab('ALLOTMENT')}
              className={`p-4 border text-left transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 ${
                activeTab === 'ALLOTMENT'
                  ? 'bg-ink text-paper border-ink shadow-md'
                  : 'bg-card border-transparent hover:border-border hover:shadow-sm'
              }`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                  activeTab === 'ALLOTMENT' ? 'bg-paper text-ink' : 'bg-paper text-muted border border-border'
                }`}
              >
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-sans font-medium text-sm">Room Allotment</h4>
                  {isAllotmentOpen ? (
                    <span className="w-2 h-2 rounded-full bg-green animate-pulse"></span>
                  ) : (
                    <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Locked</span>
                  )}
                </div>
                <p className={`text-[0.65rem] font-mono tracking-wide uppercase mt-1 ${activeTab === 'ALLOTMENT' ? 'text-paper/60' : 'text-muted'}`}>
                  150 Single Rooms
                </p>
              </div>
            </button>
          )}

          {!isAdmin && (
            <button
              onClick={() => setActiveTab('CANTEEN')}
              className={`p-4 border text-left transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 ${
                activeTab === 'CANTEEN'
                  ? 'bg-ink text-paper border-ink shadow-md'
                  : 'bg-card border-transparent hover:border-border hover:shadow-sm'
              }`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                  activeTab === 'CANTEEN' ? 'bg-paper text-ink' : 'bg-paper text-muted border border-border'
                }`}
              >
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sans font-medium text-sm">Night Canteen</h4>
                <p className={`text-[0.65rem] font-mono tracking-wide uppercase mt-1 ${activeTab === 'CANTEEN' ? 'text-paper/60' : 'text-muted'}`}>
                  Order Food
                </p>
              </div>
            </button>
          )}

          {!isCook && (
            <button
              onClick={() => setActiveTab('LEAVE')}
              className={`p-4 border text-left transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 ${
                activeTab === 'LEAVE'
                  ? 'bg-ink text-paper border-ink shadow-md'
                  : 'bg-card border-transparent hover:border-border hover:shadow-sm'
              }`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                  activeTab === 'LEAVE' ? 'bg-paper text-ink' : 'bg-paper text-muted border border-border'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-sans font-medium text-sm">Late Entry</h4>
                  {isAdmin && pendingMetrics.leaves > 0 && (
                    <span className="bg-accent text-paper text-[10px] font-bold px-1.5 py-0.5 shadow-sm animate-pulse">
                      {pendingMetrics.leaves} NEW
                    </span>
                  )}
                </div>
                <p className={`text-[0.65rem] font-mono tracking-wide uppercase mt-1 ${activeTab === 'LEAVE' ? 'text-paper/60' : 'text-muted'}`}>
                  Log Submissions
                </p>
              </div>
            </button>
          )}

          {!isCook && (
            <button
              onClick={() => setActiveTab('COMPLAINTS')}
              className={`p-4 border text-left transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 ${
                activeTab === 'COMPLAINTS'
                  ? 'bg-ink text-paper border-ink shadow-md'
                  : 'bg-card border-transparent hover:border-border hover:shadow-sm'
              }`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                  activeTab === 'COMPLAINTS' ? 'bg-paper text-ink' : 'bg-paper text-muted border border-border'
                }`}
              >
                <Wrench className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-sans font-medium text-sm">Complaints</h4>
                  {isAdmin && pendingMetrics.complaints > 0 && (
                    <span className="bg-accent text-paper text-[10px] font-bold px-1.5 py-0.5 shadow-sm animate-pulse">
                      {pendingMetrics.complaints} PEND
                    </span>
                  )}
                </div>
                <p className={`text-[0.65rem] font-mono tracking-wide uppercase mt-1 ${activeTab === 'COMPLAINTS' ? 'text-paper/60' : 'text-muted'}`}>
                  Issue Tracker
                </p>
              </div>
            </button>
          )}
        </div>

        {/* MODULE CONTENT VIEWS */}
        <div className="dash-content">
          {/* 1. ROOM ALLOTMENT MODULE */}
          {activeTab === 'ALLOTMENT' && (
            <div className="space-y-6">
              <AllotmentControlBanner
                isAllotmentOpen={isAllotmentOpen}
                onToggle={handleToggleAllotment}
                isAdmin={isAdmin}
                isToggling={isTogglingConfig}
              />
              <div className="bg-card p-6 sm:p-8 border border-border">
                <div className="flex items-center gap-2 mb-6">
                  <BedDouble className="w-5 h-5 text-ink" />
                  <h3 className="font-serif font-bold text-2xl text-ink">Room Allotment Grid</h3>
                </div>
                <RoomGrid currentUser={user} isAllotmentOpen={isAllotmentOpen} />
              </div>
            </div>
          )}

          {/* 2. NIGHT CANTEEN MODULE */}
          {activeTab === 'CANTEEN' && (
            <NightCanteen />
          )}

          {/* 3. LATE ENTRY & LEAVE REQUEST MODULE */}
          {activeTab === 'LEAVE' && (
            <LeaveTracker currentUser={user} />
          )}

          {/* 4. DIGITAL COMPLAINT SYSTEM MODULE */}
          {activeTab === 'COMPLAINTS' && (
            <ComplaintSystem currentUser={user} />
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
