const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: String, // Format: "YYYY-MM-DD"
        required: true
    },
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ["Present", "Late", "Half-Day", "Absent", "Leave"],
        default: "Present"
    },
    workHours: {
        type: Number, // in hours
        default: 0
    },
    leaveReason: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Index for faster queries
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);