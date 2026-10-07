const LeaveLog = require('../models/LeaveLog');

const getIO = (req) => req.app.get('io');

// Helper to generate unique digital gate pass ID
const generatePassId = (type) => {
  const prefix = type === 'LATE_ENTRY' ? 'PASS-LATE' : 'PASS-LEAVE';
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${timestamp}-${randomStr}`;
};

// @desc    Submit Late Entry or Leave Request with ETA
// @route   POST /api/leave
// @access  Private (Student)
const createLeaveRequest = async (req, res) => {
  try {
    const { type, startDate, endDate, eta, reason, contactNumber } = req.body;

    if (!type || !startDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide request type, start date/time, and reason.',
      });
    }

    if (!['LATE_ENTRY', 'LEAVE_REQUEST'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid request type.' });
    }

    const passId = generatePassId(type);

    const leaveLog = await LeaveLog.create({
      student: req.user._id,
      type,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      eta: eta ? new Date(eta) : new Date(startDate), // Store ETA
      passId,
      reason: reason.trim(),
      contactNumber: contactNumber || req.user.phoneNumber || '',
      status: 'PENDING',
    });

    await leaveLog.populate('student', 'name email usn phoneNumber roomId');
    if (leaveLog.student?.roomId) {
      await leaveLog.populate('student.roomId', 'number floor');
    }

    // Broadcast Socket.io notification
    const io = getIO(req);
    if (io) {
      io.emit('leave_submitted', {
        leaveLog,
        message: `📝 New ${type === 'LATE_ENTRY' ? 'Late Entry (ETA: ' + new Date(leaveLog.eta).toLocaleTimeString() + ')' : 'Leave Request'} submitted by ${req.user.name}`,
      });
    }

    return res.status(201).json({
      success: true,
      message: `${type === 'LATE_ENTRY' ? 'Late Entry' : 'Leave Request'} submitted for Warden review.`,
      leaveLog,
    });
  } catch (error) {
    console.error('createLeaveRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting request' });
  }
};

// @desc    Get leave logs & per-student counts
// @route   GET /api/leave
// @access  Private
const getLeaveLogs = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const { search, type, status } = req.query;

    let query = {};
    if (!isAdmin) {
      query = { student: req.user._id };
    } else {
      if (type) query.type = type;
      if (status) query.status = status;
    }

    let logs = await LeaveLog.find(query)
      .populate({
        path: 'student',
        select: 'name email usn phoneNumber roomId',
        populate: { path: 'roomId', select: 'number floor' },
      })
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    // Filter by search query if warden is searching
    if (isAdmin && search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.student?.name?.toLowerCase().includes(q) ||
          l.student?.usn?.toLowerCase().includes(q) ||
          l.reason?.toLowerCase().includes(q) ||
          l.passId?.toLowerCase().includes(q)
      );
    }

    // Student Running Counts
    const myLogs = await LeaveLog.find({ student: req.user._id });
    const userMetrics = {
      totalLateEntries: myLogs.filter((l) => l.type === 'LATE_ENTRY').length,
      totalLeaves: myLogs.filter((l) => l.type === 'LEAVE_REQUEST').length,
      pending: myLogs.filter((l) => l.status === 'PENDING').length,
      approved: myLogs.filter((l) => l.status === 'APPROVED').length,
    };

    return res.status(200).json({
      success: true,
      userMetrics,
      logs,
    });
  } catch (error) {
    console.error('getLeaveLogs error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching leave logs' });
  }
};

// @desc    Warden approve or reject leave request
// @route   PUT /api/leave/:id/review
// @access  Private (Admin)
const reviewLeaveRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const leaveId = req.params.id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be APPROVED or REJECTED.' });
    }

    const leaveLog = await LeaveLog.findById(leaveId);
    if (!leaveLog) {
      return res.status(404).json({ success: false, message: 'Request log not found.' });
    }

    leaveLog.status = status;
    leaveLog.reviewedBy = req.user._id;
    leaveLog.reviewedAt = new Date();
    await leaveLog.save();

    await leaveLog.populate({
      path: 'student',
      select: 'name email usn phoneNumber roomId',
      populate: { path: 'roomId', select: 'number floor' },
    });
    await leaveLog.populate('reviewedBy', 'name role');

    // Broadcast Socket.io event
    const io = getIO(req);
    if (io) {
      io.emit('leave_reviewed', {
        leaveLog,
        message: `📋 Digital Gate Pass #${leaveLog.passId} for ${leaveLog.student?.name} was ${status} by Warden`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully.`,
      leaveLog,
    });
  } catch (error) {
    console.error('reviewLeaveRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error reviewing request' });
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveLogs,
  reviewLeaveRequest,
};
