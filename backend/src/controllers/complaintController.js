const Complaint = require('../models/Complaint');

const getIO = (req) => req.app.get('io');

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private (Student)
const createComplaint = async (req, res) => {
  try {
    const { category, subIssue, remarks, roomNumber, isAnonymous = false, photoUrl } = req.body;

    if (!category || !subIssue || !remarks) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, sub-issue, and detailed remarks.',
      });
    }

    const complaint = await Complaint.create({
      student: req.user._id,
      category: category.toUpperCase(),
      subIssue: subIssue.trim(),
      remarks: remarks.trim(),
      roomNumber: roomNumber || req.user.roomId || 'Unassigned',
      isAnonymous: Boolean(isAnonymous),
      photoUrl: photoUrl || null,
      status: 'RAISED',
    });

    await complaint.populate('student', 'name email usn');

    // Safe sanitized complaint object for live broadcast
    const sanitizedComplaint = complaint.toObject();
    if (sanitizedComplaint.isAnonymous) {
      sanitizedComplaint.student = { name: 'Anonymous Student', email: 'hidden@bmsce.ac.in', usn: 'HIDDEN' };
    }

    // Broadcast Socket.io event to Warden and clients
    const io = getIO(req);
    if (io) {
      io.emit('complaint_created', {
        complaint: sanitizedComplaint,
        message: `🚨 New ${complaint.category} complaint raised for Room ${complaint.roomNumber}`,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Complaint raised successfully.',
      complaint: sanitizedComplaint,
    });
  } catch (error) {
    console.error('createComplaint error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating complaint' });
  }
};

// @desc    Get complaints list & warden analytics
// @route   GET /api/complaints
// @access  Private
const getComplaints = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    let query = {};

    // Students see their own complaints
    if (!isAdmin) {
      query = { student: req.user._id };
    }

    const rawComplaints = await Complaint.find(query)
      .populate('student', 'name email usn phoneNumber')
      .populate('resolvedBy', 'name role')
      .sort({ createdAt: -1 });

    // Process anonymous complaints masking
    const complaints = rawComplaints.map((comp) => {
      const cObj = comp.toObject();
      if (cObj.isAnonymous) {
        cObj.student = { name: 'Anonymous Student', email: 'hidden@bmsce.ac.in', usn: 'HIDDEN' };
      }
      return cObj;
    });

    // Calculate Analytics for Warden / Dashboard
    const allForAnalytics = isAdmin ? rawComplaints : rawComplaints;
    const analytics = {
      total: allForAnalytics.length,
      raised: allForAnalytics.filter((c) => c.status === 'RAISED').length,
      inProgress: allForAnalytics.filter((c) => c.status === 'IN_PROGRESS').length,
      resolved: allForAnalytics.filter((c) => c.status === 'RESOLVED').length,
      byCategory: {
        BATHROOM: allForAnalytics.filter((c) => c.category === 'BATHROOM').length,
        ELECTRICAL: allForAnalytics.filter((c) => c.category === 'ELECTRICAL').length,
        WIFI: allForAnalytics.filter((c) => c.category === 'WIFI').length,
        ROOM_ISSUE: allForAnalytics.filter((c) => c.category === 'ROOM_ISSUE').length,
      },
    };

    return res.status(200).json({
      success: true,
      analytics,
      complaints,
    });
  } catch (error) {
    console.error('getComplaints error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching complaints' });
  }
};

// @desc    Update complaint status (Both Student who raised it & Warden can update/resolve)
// @route   PUT /api/complaints/:id/status
// @access  Private
const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const complaintId = req.params.id;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!['RAISED', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status pipeline value.' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Check authorization: Must be the student who created it OR Warden Admin
    if (!isAdmin && complaint.student.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this complaint.',
      });
    }

    complaint.status = status;
    if (status === 'RESOLVED') {
      complaint.resolvedBy = userId;
      complaint.resolvedAt = new Date();
    }
    await complaint.save();

    await complaint.populate('student', 'name email usn');
    await complaint.populate('resolvedBy', 'name role');

    const sanitized = complaint.toObject();
    if (sanitized.isAnonymous) {
      sanitized.student = { name: 'Anonymous Student', email: 'hidden@bmsce.ac.in', usn: 'HIDDEN' };
    }

    // Broadcast Socket.io update
    const io = getIO(req);
    if (io) {
      io.emit('complaint_updated', {
        complaint: sanitized,
        message: `🛠️ Complaint #${complaint._id.toString().slice(-4)} status updated to ${status}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Complaint marked as ${status}.`,
      complaint: sanitized,
    });
  } catch (error) {
    console.error('updateComplaintStatus error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating complaint status' });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  updateComplaintStatus,
};
