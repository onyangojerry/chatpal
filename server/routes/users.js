const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/status
// @desc    Update user status
// @access  Private
router.put('/status', auth, async (req, res) => {
  const { status } = req.body;
  
  // Check if status is valid
  if (!['online', 'away', 'offline'].includes(status)) {
    return res.status(400).json({ msg: 'Invalid status' });
  }
  
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        status,
        lastActive: Date.now()
      },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/notification-preferences
// @desc    Update notification preferences
// @access  Private
router.put('/notification-preferences', auth, async (req, res) => {
  const { notificationPreferences } = req.body;
  
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { notificationPreferences },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;