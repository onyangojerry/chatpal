const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id
    })
    .populate('sender', 'name avatar')
    .populate('group', 'name')
    .sort({ createdAt: -1 })
    .limit(50); // Limit to the 50 most recent notifications
    
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/notifications/unread
// @desc    Get unread notifications count
// @access  Private
router.get('/unread', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });
    
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/notifications/:id
// @desc    Mark a notification as read
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    
    // Check if the notification belongs to the current user
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to update this notification' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/notifications/read/all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read/all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    
    res.json({ msg: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    
    // Check if the notification belongs to the current user
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this notification' });
    }
    
    await notification.deleteOne();
    
    res.json({ msg: 'Notification deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/notifications
// @desc    Delete all read notifications
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
      read: true
    });
    
    res.json({ msg: 'All read notifications deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;