const express = require('express');
const router = express.Router();
const { Authmiddlwhere } = require('../middlewhere/Authmiddlewhere');
const Notification = require('../Schemas/Notification');

// Get user's notifications
router.get("/my-notifications", Authmiddlwhere, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username email role')
      .sort({ createdAt: -1 })
      .limit(50); // Last 50 notifications

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.json({ 
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
});

// Get unread count only
router.get("/unread-count", Authmiddlwhere, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: "Failed to fetch unread count", error: error.message });
  }
});

// Mark notification as read
router.put("/:id/read", Authmiddlwhere, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: "Failed to mark notification as read", error: error.message });
  }
});

// Mark all notifications as read
router.put("/mark-all-read", Authmiddlwhere, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: "Failed to mark all as read", error: error.message });
  }
});

// Delete notification
router.delete("/:id", Authmiddlwhere, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: "Failed to delete notification", error: error.message });
  }
});

// Delete all read notifications
router.delete("/clear/read", Authmiddlwhere, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
      isRead: true
    });

    res.json({ message: "All read notifications deleted" });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: "Failed to clear notifications", error: error.message });
  }
});

module.exports = router;