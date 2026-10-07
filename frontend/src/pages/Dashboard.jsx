import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import RoomGrid from '../components/RoomGrid';
import ComplaintSystem from '../components/ComplaintSystem';
import LeaveTracker from '../components/LeaveTracker';
import NightCanteen from '../components/NightCanteen';
import { Building, Wrench, Calendar, Utensils } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('rooms');

  const navTabs = [
    { id: 'rooms', label: 'Room Allotment', icon: Building },
    { id: 'complaints', label: 'Complaints System', icon: Wrench },
    { id: 'leave', label: 'Leave Tracker', icon: Calendar },
    { id: 'canteen', label: 'Night Canteen', icon: Utensils },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation Pills Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-none border-b-2 border-border">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-xs font-sans font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shrink-0 border-2 ${
                isActive
                  ? 'border-ink bg-ink text-paper'
                  : 'border-border bg-paper text-muted hover:border-ink/30 hover:text-ink shadow-sm'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-paper' : 'text-ink/60'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'rooms' && <RoomGrid currentUser={user} isAllotmentOpen={true} />}
        {activeTab === 'complaints' && <ComplaintSystem currentUser={user} />}
        {activeTab === 'leave' && <LeaveTracker currentUser={user} />}
        {activeTab === 'canteen' && <NightCanteen />}
      </div>
    </div>
  );
}
