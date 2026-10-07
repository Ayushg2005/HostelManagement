import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { socket } from '../utils/socket';
import {
  Building2,
  LogOut,
  UserCheck,
  ShieldAlert,
  UtensilsCrossed,
  Wifi,
  WifiOff,
  User,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, quickLogin } = useAuth();
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" /> Warden
          </span>
        );
      case 'cook':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UtensilsCrossed className="w-3.5 h-3.5" /> Kitchen Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <UserCheck className="w-3.5 h-3.5" /> Student
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="font-['Outfit'] font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
                Hostel<span className="text-indigo-400">Verse</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Real-Time v1.0
              </span>
            </div>
          </div>

          {/* Center: Live Socket Indicator */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> Socket Live
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span className="text-rose-400 font-medium flex items-center gap-1">
                  <WifiOff className="w-3.5 h-3.5" /> Reconnecting...
                </span>
              </>
            )}
          </div>

          {/* Right Section: Demo Role Switcher & User Profile */}
          {user && (
            <div className="flex items-center space-x-3">
              {/* Quick Switcher dropdown for demo */}
              <div className="hidden lg:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 px-2 font-mono">Role:</span>
                <button
                  onClick={() => quickLogin('student')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    user.role === 'student'
                      ? 'bg-indigo-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Student
                </button>
                <button
                  onClick={() => quickLogin('admin')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    user.role === 'admin'
                      ? 'bg-rose-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Warden
                </button>
                <button
                  onClick={() => quickLogin('cook')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    user.role === 'cook'
                      ? 'bg-amber-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kitchen
                </button>
              </div>

              {/* User badge */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-semibold text-xs">
                  {user.name?.substring(0, 2).toUpperCase() || <User className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.name}
                  </div>
                  <div className="mt-0.5">{getRoleBadge(user.role)}</div>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                title="Sign out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
