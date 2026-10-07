const mongoose = require('mongoose');

const leaveLogSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['LATE_ENTRY', 'LEAVE_REQUEST'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    eta: {
      type: Date, // Estimated Time of Arrival for late entries
    },
    passId: {
      type: String,
      unique: true,
      sparse: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const LeaveLog = mongoose.model('LeaveLog', leaveLogSchema);
module.exports = LeaveLog;
