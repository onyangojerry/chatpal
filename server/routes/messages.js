const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Group = require('../models/Group');
const Thread = require('../models/Thread');

// @route   GET api/messages/group/:groupId
// @desc    Get messages for a group
// @access  Private
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    // Check if user is a member of the group
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    const isMember = group.members.some(
      member => member.user.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ msg: 'Not authorized to access messages in this group' });
    }
    
    // Get messages for the group
    const messages = await Message.find({ 
      group: req.params.groupId,
      parentMessage: null // Only get top-level messages, not thread replies
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name avatar')
    .populate('readBy.user', 'name');
    
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/messages/thread/:threadId
// @desc    Get messages for a thread
// @access  Private
router.get('/thread/:threadId', auth, async (req, res) => {
  try {
    // Get the thread
    const thread = await Thread.findById(req.params.threadId);
    
    if (!thread) {
      return res.status(404).json({ msg: 'Thread not found' });
    }
    
    // Check if user is a member of the group
    const group = await Group.findById(thread.group);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    const isMember = group.members.some(
      member => member.user.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ msg: 'Not authorized to access this thread' });
    }
    
    // Get messages for the thread
    const messages = await Message.find({
      thread: req.params.threadId
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name avatar')
    .populate('readBy.user', 'name');
    
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Thread not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/messages
// @desc    Create a new message
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('group', 'Group is required').not().isEmpty(),
      check('content', 'Content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { group, content, attachments, parentMessage, thread } = req.body;
    
    try {
      // Check if user is a member of the group
      const groupData = await Group.findById(group);
      
      if (!groupData) {
        return res.status(404).json({ msg: 'Group not found' });
      }
      
      const isMember = groupData.members.some(
        member => member.user.toString() === req.user.id
      );
      
      if (!isMember) {
        return res.status(403).json({ msg: 'Not authorized to send messages to this group' });
      }
      
      // Create new message
      const newMessage = new Message({
        group,
        sender: req.user.id,
        content,
        attachments: attachments || [],
        parentMessage,
        thread,
        readBy: [{ user: req.user.id }]
      });
      
      const message = await newMessage.save();
      
      // Populate sender info for the response
      await message.populate('sender', 'name avatar');
      
      res.json(message);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Group not found' });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }
    
    // Check if user is the sender of the message
    if (message.sender.toString() !== req.user.id) {
      // Check if user is an admin of the group
      const group = await Group.findById(message.group);
      const isAdmin = group.members.some(
        member => member.user.toString() === req.user.id && member.role === 'admin'
      );
      
      if (!isAdmin) {
        return res.status(403).json({ msg: 'Not authorized to delete this message' });
      }
    }
    
    // Check if message has a thread
    if (message.thread) {
      // Delete all messages in the thread
      await Message.deleteMany({ thread: message.thread });
      
      // Delete the thread
      await Thread.findByIdAndDelete(message.thread);
    }
    
    // Delete the message
    await message.deleteOne();
    
    res.json({ msg: 'Message deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Message not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;