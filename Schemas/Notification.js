const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true // For faster queries
    },
    
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
    type: {
      type: String,
      enum: [
        'REQUEST_APPROVED',
        'REQUEST_REJECTED',
        'REQUEST_SUBMITTED',
        'REQUEST_CLOSED',
        'REQUEST_REOPENED',
        'TEAM_ADDED',
        'TEAM_REMOVED',
        'ATTENDANCE_MARKED',
        'GENERAL'
      ],
      required: true
    },
    
    title: {
      type: String,
      required: true
    },
    
    message: {
      type: String,
      required: true
    },
    
    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request"
    },
    
    relatedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team"
    },
    
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    
    link: {
      type: String // URL to navigate when notification is clicked
    }
  },
  { 
    timestamps: true 
  }
);

// Index for faster queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);