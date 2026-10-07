import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import GatePassModal from './GatePassModal';
import MagneticButton from './MagneticButton';
import {
  Clock,
  Calendar,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Search,
  Check,
  X,
  FileText,
} from 'lucide-react';

const LeaveTracker = ({ currentUser }) => {
  const [logs, setLogs] = useState([]);
  const [userMetrics, setUserMetrics] = useState({
    totalLateEntries: 0,
    totalLeaves: 0,
    pending: 0,
    approved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [liveToast, setLiveToast] = useState('');
  const [selectedPass, setSelectedPass] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'LATE_ENTRY',
    startDate: '',
    endDate: '',
    eta: '',
    reason: '',
    contactNumber: currentUser?.phoneNumber || '',
  });

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchLeaveLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/leave', { params });
      if (res.data?.success) {
        setLogs(res.data.logs);
        if (res.data.userMetrics) {
          setUserMetrics(res.data.userMetrics);
        }
      }
    } catch (err) {
      console.error('Error fetching leave logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocketEvent = useCallback((data) => {
    setLiveToast(data.message);
    fetchLeaveLogs();
    setTimeout(() => setLiveToast(''), 4000);
  }, []);

  useSocket(null, null, null, handleSocketEvent);

  useEffect(() => {
    fetchLeaveLogs();
  }, [typeFilter, statusFilter, searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.startDate || !formData.reason) {
      setErrorMsg('Please select start date/time and state a reason.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/leave', formData);
      if (res.data?.success) {
        setShowModal(false);
        setFormData({
          type: 'LATE_ENTRY',
          startDate: '',
          endDate: '',
          eta: '',
          reason: '',
          contactNumber: '',
        });
        fetchLeaveLogs();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error submitting request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (leaveId, newStatus) => {
    try {
      setIsSubmitting(true);
      const res = await api.put(`/leave/${leaveId}/review`, { status: newStatus });
      if (res.data?.success) {
        fetchLeaveLogs();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error reviewing request.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-6 border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-ink" />
            <h3 className="text-2xl font-serif font-bold text-ink italic">Late Entry & Leaves</h3>
          </div>
          <p className="text-xs text-muted font-sans">
            {isAdmin ? 'Searchable Warden Policy Enforcement Log & Approvals' : 'Submit & Track Late Entry or Leave Requests'}
          </p>
        </div>

        {!isAdmin && (
          <MagneticButton
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" /> New Request
          </MagneticButton>
        )}
      </div>

      {/* Running Counters Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-paper border border-border">
          <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Late Entries</p>
          <p className="text-2xl font-serif font-bold text-ink mt-1">{userMetrics.totalLateEntries}</p>
        </div>

        <div className="p-4 bg-paper border border-border">
          <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Total Leaves</p>
          <p className="text-2xl font-serif font-bold text-ink mt-1">{userMetrics.totalLeaves}</p>
        </div>

        <div className="p-4 bg-paper border border-border">
          <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Pending</p>
          <p className="text-2xl font-serif font-bold text-gold mt-1">{userMetrics.pending}</p>
        </div>

        <div className="p-4 bg-paper border border-border">
          <p className="text-[0.65rem] font-mono tracking-wide uppercase text-muted">Approved</p>
          <p className="text-2xl font-serif font-bold text-green mt-1">{userMetrics.approved}</p>
        </div>
      </div>

      {/* Warden Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 border border-border">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1">
            {['ALL', 'LATE_ENTRY', 'LEAVE_REQUEST'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-sans font-medium transition-colors border-b-2 ${
                  typeFilter === t
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink hover:border-border'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t === 'LATE_ENTRY' ? 'Late Entry' : 'Leave'}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border hidden sm:block"></div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-sans font-medium transition-colors border-b-2 ${
                  statusFilter === s
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink hover:border-border'
                }`}
              >
                {s === 'ALL' ? 'All Status' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or USN..."
            className="w-full pl-9 pr-4 py-2 bg-paper border-b-2 border-border text-sm text-ink placeholder-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* History Log Feed */}
      {loading ? (
        <div className="py-12 text-center text-muted text-xs font-mono uppercase tracking-widest">
          <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin mx-auto mb-3"></div>
          Loading Logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card p-12 text-center text-muted text-sm border border-border">
          No leave logs match your criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log._id}
              className="bg-paper p-6 border border-border hover:border-ink/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Type Badge */}
                  <span
                    className="px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-ink bg-ink text-paper"
                  >
                    {log.type === 'LATE_ENTRY' ? 'Late Entry' : 'Leave'}
                  </span>

                  {/* Status Badge */}
                  {log.status === 'PENDING' && (
                    <span className="px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-gold bg-gold/10 text-gold">
                      Pending
                    </span>
                  )}
                  {log.status === 'APPROVED' && (
                    <span className="px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-green bg-green/10 text-green flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Approved
                    </span>
                  )}
                  {log.status === 'REJECTED' && (
                    <span className="px-2 py-0.5 text-[0.65rem] font-mono font-bold uppercase tracking-widest border border-accent bg-accent/10 text-accent flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Rejected
                    </span>
                  )}

                  <span className="text-[0.75rem] font-serif font-bold text-ink italic ml-2">
                    {log.student?.name} ({log.student?.usn || 'BMSCE'})
                  </span>
                </div>

                <p className="text-sm text-ink font-medium leading-relaxed">{log.reason}</p>

                <div className="flex flex-wrap items-center gap-5 text-xs text-muted font-sans">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted/70" />
                    <span className="uppercase tracking-wide text-[0.65rem]">From:</span> {new Date(log.startDate).toLocaleString()}
                  </span>
                  {log.endDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-muted/70" />
                      <span className="uppercase tracking-wide text-[0.65rem]">To:</span> {new Date(log.endDate).toLocaleString()}
                    </span>
                  )}
                  {log.contactNumber && (
                    <span className="text-muted"><span className="uppercase tracking-wide text-[0.65rem]">Phone:</span> {log.contactNumber}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                {isAdmin && log.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleReview(log._id, 'APPROVED')}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto py-2 px-4 border-2 border-green text-green hover:bg-green hover:text-paper text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReview(log._id, 'REJECTED')}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto py-2 px-4 border-2 border-accent text-accent hover:bg-accent hover:text-paper text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
                {log.status === 'APPROVED' && (
                  <button
                    onClick={() => setSelectedPass(log)}
                    className="w-full sm:w-auto py-2 px-4 bg-ink text-paper hover:bg-ink/90 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Gate Pass
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-paper p-8 shadow-2xl relative border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-serif font-bold text-ink italic">New Request</h3>
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
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'LATE_ENTRY' })}
                  className={`py-3 px-4 text-xs font-bold uppercase tracking-widest transition-colors border-2 ${
                    formData.type === 'LATE_ENTRY'
                      ? 'border-ink bg-ink text-paper'
                      : 'border-border bg-transparent text-muted hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  Late Entry
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'LEAVE_REQUEST' })}
                  className={`py-3 px-4 text-xs font-bold uppercase tracking-widest transition-colors border-2 ${
                    formData.type === 'LEAVE_REQUEST'
                      ? 'border-ink bg-ink text-paper'
                      : 'border-border bg-transparent text-muted hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  Leave Request
                </button>
              </div>

              {/* Start Date & Time */}
              <div>
                <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 bg-transparent border-b-2 border-border text-sm text-ink focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* ETA for Late Entry */}
              {formData.type === 'LATE_ENTRY' && (
                <div>
                  <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">
                    Estimated Time of Arrival (ETA)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.eta}
                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                    className="w-full px-4 py-3 bg-transparent border-b-2 border-border text-sm text-ink focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              )}

              {/* End Date & Time for Leave */}
              {formData.type === 'LEAVE_REQUEST' && (
                <div>
                  <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">
                    Return Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-transparent border-b-2 border-border text-sm text-ink focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">Reason</label>
                <textarea
                  rows={3}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="State your reason..."
                  className="w-full px-4 py-3 bg-transparent border-b-2 border-border text-sm text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>

              {/* Contact Phone Number */}
              <div>
                <label className="block text-[0.65rem] font-mono tracking-widest uppercase text-muted mb-2">
                  Emergency Contact Number
                </label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-3 bg-transparent border-b-2 border-border text-sm text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-4">
                <MagneticButton
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full !py-4"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </MagneticButton>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Gate Pass Modal */}
      <GatePassModal
        isOpen={!!selectedPass}
        onClose={() => setSelectedPass(null)}
        passData={selectedPass}
      />
    </div>
  );
};

export default LeaveTracker;
