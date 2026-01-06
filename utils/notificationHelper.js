const Notification = require('../Schemas/Notification');

// Create a notification
const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  relatedRequest = null,
  relatedTeam = null,
  link = null
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
    return notification;
  } catch (error) {
    console.error('❌ Failed to create notification:', error);
    throw error;
  }
};

// Notification templates
const notificationTemplates = {
  // Employee receives when manager approves
  REQUEST_APPROVED: (requestTitle, managerName) => ({
    title: '✅ Request Approved',
    message: `Your request "${requestTitle}" has been approved by ${managerName}`
  }),
  
  // Employee receives when manager rejects
  REQUEST_REJECTED: (requestTitle, managerName) => ({
    title: '❌ Request Rejected',
    message: `Your request "${requestTitle}" has been rejected by ${managerName}`
  }),
  
  // Manager & Admin receive when employee submits
  REQUEST_SUBMITTED: (requestTitle, employeeName) => ({
    title: '📝 New Request Submitted',
    message: `${employeeName} has submitted a new request: "${requestTitle}"`
  }),
  
  // Employee & Manager receive when admin closes
  REQUEST_CLOSED: (requestTitle, adminName) => ({
    title: '🔒 Request Closed',
    message: `Your request "${requestTitle}" has been closed by ${adminName}`
  }),
  
  // Employee & Manager receive when admin reopens
  REQUEST_REOPENED: (requestTitle, adminName) => ({
    title: '🔓 Request Reopened',
    message: `Your request "${requestTitle}" has been reopened by ${adminName} for review`
  }),
  
  // Employee receives when added to team
  TEAM_ADDED: (teamName, managerName) => ({
    title: '👥 Added to Team',
    message: `You have been added to team "${teamName}" by ${managerName}`
  }),
  
  // Employee receives when removed from team
  TEAM_REMOVED: (teamName, managerName) => ({
    title: '👋 Removed from Team',
    message: `You have been removed from team "${teamName}" by ${managerName}`
  }),
  
  // Employee receives when attendance is marked
  ATTENDANCE_MARKED: (date) => ({
    title: '✓ Attendance Marked',
    message: `Your attendance for ${date} has been marked successfully`
  })
};

module.exports = {
  createNotification,
  notificationTemplates
};