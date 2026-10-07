import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import MagneticButton from './MagneticButton';
import {
  Wrench,
  PlusCircle,
  ShieldOff,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wifi,
  Zap,
  Droplets,
  Home,
  XCircle,
  CheckSquare,
} from 'lucide-react';

const ComplaintSystem = ({ currentUser }) => {
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState({
    total: 0,
    raised: 0,
    inProgress: 0,
    resolved: 0,
    byCategory: { BATHROOM: 0, ELECTRICAL: 0, WIFI: 0, ROOM_ISSUE: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [liveToast, setLiveToast] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    category: 'BATHROOM',
    subIssue: '',
    remarks: '',
    roomNumber: currentUser?.roomId?.number || '',
    isAnonymous: false,
    photoUrl: '',
  });

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/complaints');
      if (res.data?.success) {
        setComplaints(res.data.complaints);
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocketEvent = useCallback((data) => {
    setLiveToast(data.message);
    fetchComplaints();
    setTimeout(() => setLiveToast(''), 4000);
  }, []);

  useSocket(null, null, handleSocketEvent, null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.subIssue || !formData.remarks) {
      setErrorMsg('Please fill in the sub-issue description and remarks.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/complaints', formData);
      if (res.data?.success) {
        setShowModal(false);
        setFormData({
          category: 'BATHROOM',
          subIssue: '',
          remarks: '',
          roomNumber: '',
          isAnonymous: false,
          photoUrl: '',
        });
        fetchComplaints();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error submitting complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Both Student (owner) and Warden can update status to RESOLVED or IN_PROGRESS
  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      setIsSubmitting(true);
      const res = await api.put(`/complaints/${complaintId}/status`, { status: newStatus });
      if (res.data?.success) {
        fetchComplaints();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error updating status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'BATHROOM':
        return <Droplets className="w-4 h-4 text-ink" />;
      case 'ELECTRICAL':
        return <Zap className="w-4 h-4 text-ink" />;
      case 'WIFI':
        return <Wifi className="w-4 h-4 text-ink" />;
      default:
        return <Home className="w-4 h-4 text-ink" />;
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (selectedFilter === 'ALL') return true;
    return c.status === selectedFilter || c.category === selectedFilter;
  });

  return (
    <div className="space-y-6">
      {/* Live Socket Toast */}
      {liveToast && (
        <div className="p-3.5 px-4 bg-ink border border-ink text-paper text-xs flex items-center justify-between animate-bounce">
          <span className="font-sans font-medium">{liveToast}</span>
          <span className="text-[0.65rem] bg-paper/20 px-2 py-0.5 font-bold uppercase tracking-widest">
            Live Feed
          </span>
        </div>
      )}

      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-6 border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-5 h-5 text-ink" />
            <h3 className="text-2xl font-serif font-bold text-ink italic">Digital Complaints</h3>
          </div>
          <p className="text-xs text-muted font-sans">
            {isAdmin ? 'Warden Analytics & Real-Time Issue Resolution Feed' : 'Raise & Track Room Complaints'}
          </p>
        </div>

        {/* Raise Complaint Button for Student */}
        {!isAdmin && (
          <MagneticButton
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" /> New Complaint
          </MagneticButton>
        )}
      </div>

      {/* Warden Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-paper border border-border">
          <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Total Raised</p>
          <p className="text-2xl font-serif font-bold text-ink mt-1">{analytics.total}</p>
        </div>

        <div className="p-4 bg-paper border border-border">
          <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Pending</p>
          <p className="text-2xl font-serif font-bold text-accent mt-1">{analytics.raised}</p>
        </div>

        <div className="p-4 bg-paper border border-border">
          <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">In Progress</p>
          <p className="text-2xl font-serif font-bold text-gold mt-1">{analytics.inProgress}</p>
        </div>

        <div className="p-4 bg-paper border border-border">
          <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Resolved</p>
          <p className="text-2xl font-serif font-bold text-green mt-1">{analytics.resolved}</p>
        </div>
      </div>

      {/* Category Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-card p-3 border border-border flex items-center justify-between">
          <span className="flex items-center gap-2 text-ink font-sans font-medium">
            <Droplets className="w-4 h-4 text-ink/60" /> Bathroom
          </span>
          <span className="font-mono font-bold text-ink">{analytics.byCategory.BATHROOM}</span>
        </div>
        <div className="bg-card p-3 border border-border flex items-center justify-between">
          <span className="flex items-center gap-2 text-ink font-sans font-medium">
            <Zap className="w-4 h-4 text-ink/60" /> Electrical
          </span>
          <span className="font-mono font-bold text-ink">{analytics.byCategory.ELECTRICAL}</span>
        </div>
        <div className="bg-card p-3 border border-border flex items-center justify-between">
          <span className="flex items-center gap-2 text-ink font-sans font-medium">
            <Wifi className="w-4 h-4 text-ink/60" /> Wifi
          </span>
          <span className="font-mono font-bold text-ink">{analytics.byCategory.WIFI}</span>
        </div>
        <div className="bg-card p-3 border border-border flex items-center justify-between">
          <span className="flex items-center gap-2 text-ink font-sans font-medium">
            <Home className="w-4 h-4 text-ink/60" /> Room
          </span>
          <span className="font-mono font-bold text-ink">{analytics.byCategory.ROOM_ISSUE}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-card p-2 border border-border overflow-x-auto">
        {['ALL', 'RAISED', 'IN_PROGRESS', 'RESOLVED', 'BATHROOM', 'ELECTRICAL', 'WIFI', 'ROOM_ISSUE'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedFilter(tab)}
            className={`px-4 py-2 text-xs font-sans font-medium transition-colors border-b-2 whitespace-nowrap ${
              selectedFilter === tab
                ? 'border-ink text-ink bg-paper shadow-sm'
                : 'border-transparent text-muted hover:text-ink hover:border-border'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Complaint Cards Feed */}
      {loading ? (
        <div className="py-12 text-center text-muted text-xs font-mono uppercase tracking-widest">
          <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin mx-auto mb-3"></div>
          Loading Complaints...
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-card p-12 text-center text-muted text-sm border border-border">
          No complaints found in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((comp) => {
            const isOwner = comp.student?._id === currentUser?._id;
            const canClose = (isOwner || isAdmin) && comp.status !== 'RESOLVED';

            return (
              <div
                key={comp._id}
                className="bg-paper p-6 border border-border hover:border-ink/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Category Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-ink bg-ink text-paper">
                      {getCategoryIcon(comp.category)} {comp.category}
                    </span>

                    {/* Status Badge */}
                    {comp.status === 'RAISED' && (
                      <span className="px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-accent bg-accent/10 text-accent flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Raised
                      </span>
                    )}
                    {comp.status === 'IN_PROGRESS' && (
                      <span className="px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-gold bg-gold/10 text-gold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                    {comp.status === 'RESOLVED' && (
                      <span className="px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-green bg-green/10 text-green flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Resolved
                      </span>
                    )}

                    {/* Anonymous Shield Badge */}
                    {comp.isAnonymous ? (
                      <span className="px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-ink/40 text-ink/60 flex items-center gap-1 bg-card">
                        <ShieldOff className="w-3 h-3" /> Anonymous
                      </span>
                    ) : (
                      <span className="text-[0.75rem] font-serif font-bold text-ink italic ml-1">
                        {comp.student?.name} ({comp.student?.usn || 'BMSCE'})
                      </span>
                    )}

                    <span className="text-[0.65rem] font-mono tracking-widest uppercase text-muted ml-auto">
                      Room {comp.roomNumber || 'N/A'} • {new Date(comp.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-sans font-bold text-base text-ink">{comp.subIssue}</h4>
                  <p className="text-sm font-sans text-ink/80 bg-card p-4 border border-border leading-relaxed">
                    {comp.remarks}
                  </p>
                </div>

                {/* Mutual Resolution / Status Action Buttons */}
                <div className="flex sm:flex-col items-center gap-3 shrink-0">
                  {isAdmin && comp.status === 'RAISED' && (
                    <button
                      onClick={() => handleUpdateStatus(comp._id, 'IN_PROGRESS')}
                      disabled={isSubmitting}
                      className="w-full py-2 px-4 border-2 border-gold text-gold hover:bg-gold hover:text-paper text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" /> Start Work
                    </button>
                  )}

                  {canClose && (
                    <button
                      onClick={() => handleUpdateStatus(comp._id, 'RESOLVED')}
                      disabled={isSubmitting}
                      className="w-full py-2 px-4 bg-green text-paper hover:bg-green/90 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckSquare className="w-4 h-4" /> Mark Resolved
                    </button>
                  )}

                  {comp.status === 'RESOLVED' && (
                    <span className="text-[0.65rem] text-green font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 mt-2">
                      <CheckCircle2 className="w-4 h-4" /> Closed by {comp.resolvedBy?.name || 'User'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raise Complaint Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-paper p-8 shadow-2xl relative border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-serif font-bold text-ink italic">New Complaint</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-muted hover:text-ink transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">Issue Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'BATHROOM', label: 'Bathroom', icon: Droplets },
                    { id: 'ELECTRICAL', label: 'Electrical', icon: Zap },
                    { id: 'WIFI', label: 'Wifi', icon: Wifi },
                    { id: 'ROOM_ISSUE', label: 'Room/Furniture', icon: Home },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                        className={`p-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border-2 ${
                          formData.category === cat.id
                            ? 'border-ink bg-ink text-paper'
                            : 'border-border bg-transparent text-muted hover:border-ink/30 hover:text-ink'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub issue */}
              <div>
                <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">Specific Issue</label>
                <input
                  type="text"
                  required
                  value={formData.subIssue}
                  onChange={(e) => setFormData({ ...formData, subIssue: e.target.value })}
                  placeholder="e.g. Tap leaking..."
                  className="w-full px-4 py-3 bg-transparent border-b-2 border-border text-sm text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Room Number */}
              <div>
                <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">Room Number</label>
                <input
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  placeholder="e.g. 105"
                  className="w-full px-4 py-3 bg-transparent border-b-2 border-border text-sm text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">Detailed Remarks</label>
                <textarea
                  rows={3}
                  required
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Provide additional details..."
                  className="w-full px-4 py-3 bg-transparent border-b-2 border-border text-sm text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>

              {/* Anonymous Complaint Toggle Switch */}
              <div className="p-4 bg-card border border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldOff className="w-4 h-4 text-ink" />
                    <span className="text-sm font-sans font-bold text-ink">Submit Anonymously</span>
                  </div>
                  <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">
                    Hide name on Warden logs
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="w-5 h-5 accent-ink rounded cursor-pointer border-border bg-paper"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-4">
                <MagneticButton
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full !py-4"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                </MagneticButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintSystem;
