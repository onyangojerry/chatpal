const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');

// @route   POST api/groups
// @desc    Create a group
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Group name is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, description, isDirectMessage, members } = req.body;
    
    try {
      // Create new group
      const newGroup = new Group({
        name,
        description,
        isDirectMessage: isDirectMessage || false,
        members: [
          { user: req.user.id, role: 'admin' }
        ],
        createdBy: req.user.id
      });
      
      // Add members if provided
      if (members && members.length > 0) {
        // Check if members exist
        const memberUsers = await User.find({ _id: { $in: members } });
        const memberIds = memberUsers.map(user => user._id.toString());
        
        // Filter out invalid members
        const validMembers = members.filter(id => memberIds.includes(id));
        
        // Add valid members to group
        validMembers.forEach(memberId => {
          if (memberId !== req.user.id) {
            newGroup.members.push({ user: memberId, role: 'member' });
          }
        });
      }
      
      const group = await newGroup.save();
      
      // Populate member details for response
      await group.populate('members.user', 'name avatar');
      await group.populate('createdBy', 'name');
      
      res.json(group);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/groups
// @desc    Get all groups for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Find all groups where the current user is a member
    const groups = await Group.find({
      'members.user': req.user.id
    })
    .populate('members.user', 'name avatar status')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/groups/:id
// @desc    Get group by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name avatar status')
      .populate('createdBy', 'name');
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is a member of the group
    const isMember = group.members.some(
      member => member.user._id.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ msg: 'Not authorized to access this group' });
    }
    
    res.json(group);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/groups/:id
// @desc    Update a group
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { name, description } = req.body;
  
  try {
    let group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is an admin of the group
    const isAdmin = group.members.some(
      member => member.user.toString() === req.user.id && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to update this group' });
    }
    
    // Update group fields
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    
    await group.save();
    
    // Populate member details for response
    await group.populate('members.user', 'name avatar status');
    await group.populate('createdBy', 'name');
    
    res.json(group);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/groups/:id/members
// @desc    Add members to a group
// @access  Private
router.post('/:id/members', auth, async (req, res) => {
  const { members } = req.body;
  
  if (!members || !Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ msg: 'Members array is required' });
  }
  
  try {
    let group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is an admin of the group
    const isAdmin = group.members.some(
      member => member.user.toString() === req.user.id && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to add members to this group' });
    }
    
    // Get existing member IDs
    const existingMemberIds = group.members.map(member => member.user.toString());
    
    // Check if members exist
    const memberUsers = await User.find({ _id: { $in: members } });
    const memberIds = memberUsers.map(user => user._id.toString());
    
    // Filter out invalid and existing members
    const newMembers = members.filter(
      id => memberIds.includes(id) && !existingMemberIds.includes(id)
    );
    
    // Add new members to group
    newMembers.forEach(memberId => {
      group.members.push({ user: memberId, role: 'member' });
    });
    
    await group.save();
    
    // Populate member details for response
    await group.populate('members.user', 'name avatar status');
    
    res.json(group);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/groups/:id/members/:userId
// @desc    Remove a member from a group
// @access  Private
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    let group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is an admin of the group or the member being removed
    const isAdmin = group.members.some(
      member => member.user.toString() === req.user.id && member.role === 'admin'
    );
    
    const isSelfRemoval = req.user.id === req.params.userId;
    
    if (!isAdmin && !isSelfRemoval) {
      return res.status(403).json({ msg: 'Not authorized to remove members from this group' });
    }
    
    // Check if the member exists in the group
    const memberExists = group.members.some(
      member => member.user.toString() === req.params.userId
    );
    
    if (!memberExists) {
      return res.status(404).json({ msg: 'Member not found in the group' });
    }
    
    // Prevent removing the last admin
    if (req.params.userId === req.user.id) {
      const adminCount = group.members.filter(
        member => member.role === 'admin'
      ).length;
      
      if (adminCount === 1 && isAdmin) {
        return res.status(400).json({ msg: 'Cannot remove the last admin from the group' });
      }
    }
    
    // Remove member from group
    group.members = group.members.filter(
      member => member.user.toString() !== req.params.userId
    );
    
    await group.save();
    
    // Populate member details for response
    await group.populate('members.user', 'name avatar status');
    
    res.json(group);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group or user not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/groups/:id
// @desc    Delete a group
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    // Check if user is an admin of the group
    const isAdmin = group.members.some(
      member => member.user.toString() === req.user.id && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to delete this group' });
    }
    
    // Delete all messages in the group
    await Message.deleteMany({ group: req.params.id });
    
    // Delete the group
    await group.deleteOne();
    
    res.json({ msg: 'Group deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;