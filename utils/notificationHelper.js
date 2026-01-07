const Notification = require('../Schemas/Notification');

// Create a notification and emit via Socket.io
const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  relatedRequest = null,
  relatedTeam = null,
  link = null,
  io = null // Socket.io instance
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      relatedRequest,
      relatedTeam,
      link
    });

    console.log('✅ Notification created:', notification._id);

    // 🔌 EMIT REAL-TIME NOTIFICATION via Socket.io
    if (io) {
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'username email role');

      // Emit to specific user's room
      io.to(`user:${recipient}`).emit('new-notification', {
        notification: populatedNotification,
        unreadCount: await Notification.countDocuments({ 
          recipient, 
          isRead: false 
        })
      });

      console.log(`🔔 Socket notification sent to user: ${recipient}`);
    }

    return notification;
  } catch (error) {
    console.error('❌ Failed to create notification:', error);
    throw error;
  }
};

// Notification templates
const notificationTemplates = {
  REQUEST_APPROVED: (requestTitle, managerName) => ({
    title: '✅ Request Approved',
    message: `Your request "${requestTitle}" has been approved by ${managerName}`
  }),
  
  REQUEST_REJECTED: (requestTitle, managerName) => ({
    title: '❌ Request Rejected',
    message: `Your request "${requestTitle}" has been rejected by ${managerName}`
  }),
  
  REQUEST_SUBMITTED: (requestTitle, employeeName) => ({
    title: '📝 New Request Submitted',
    message: `${employeeName} has submitted a new request: "${requestTitle}"`
  }),
  
  REQUEST_CLOSED: (requestTitle, adminName) => ({
    title: '🔒 Request Closed',
    message: `Your request "${requestTitle}" has been closed by ${adminName}`
  }),
  
  REQUEST_REOPENED: (requestTitle, adminName) => ({
    title: '🔓 Request Reopened',
    message: `Your request "${requestTitle}" has been reopened by ${adminName} for review`
  }),
  
  TEAM_ADDED: (teamName, managerName) => ({
    title: '👥 Added to Team',
    message: `You have been added to team "${teamName}" by ${managerName}`
  }),
  
  TEAM_REMOVED: (teamName, managerName) => ({
    title: '👋 Removed from Team',
    message: `You have been removed from team "${teamName}" by ${managerName}`
  }),
  
  ATTENDANCE_MARKED: (date) => ({
    title: '✓ Attendance Marked',
    message: `Your attendance for ${date} has been marked successfully`
  })
};

module.exports = {
  createNotification,
  notificationTemplates
};