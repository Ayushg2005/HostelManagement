const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
    },
    floor: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'HELD', 'OCCUPIED'],
      default: 'AVAILABLE',
      index: true,
    },
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    heldUntil: {
      type: Date,
      default: null,
    },
    occupiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    bookedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if hold is expired
roomSchema.methods.isHoldExpired = function () {
  if (this.status === 'HELD' && this.heldUntil) {
    return new Date() > new Date(this.heldUntil);
  }
  return false;
};

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
