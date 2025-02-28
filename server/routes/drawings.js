// Desc: Routes for creating, updating, and deleting drawings


const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Drawing = require('../models/Drawing');
const Group = require('../models/Group');

// @route   POST api/drawings
// @desc    Create a new drawing
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, group } = req.body;
    
    try {
      // Check if user is a member of the group
      if (group) {
        const groupData = await Group.findById(group);
        
        if (!groupData) {
          return res.status(404).json({ msg: 'Group not found' });
        }
        
        const isMember = groupData.members.some(
          member => member.user.toString() === req.user.id
        );
        
        if (!isMember) {
          return res.status(403).json({ msg: 'Not authorized to create drawings in this group' });
        }
      }
      
      // Create new drawing
      const newDrawing = new Drawing({
        title,
        creator: req.user.id,
        participants: [req.user.id],
        group
      });
      
      const drawing = await newDrawing.save();
      
      res.json(drawing);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Group not found' });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/drawings/:id
// @desc    Get a drawing by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const drawing = await Drawing.findById(req.params.id)
      .populate('creator', 'name')
      .populate('participants', 'name')
      .populate('group', 'name');
    
    if (!drawing) {
      return res.status(404).json({ msg: 'Drawing not found' });
    }
    
    // Check if user is a participant or member of the group
    const isParticipant = drawing.participants.some(
      user => user._id.toString() === req.user.id
    );
    
    let isGroupMember = false;
    
    if (drawing.group) {
      const group = await Group.findById(drawing.group._id);
      
      if (group) {
        isGroupMember = group.members.some(
          member => member.user.toString() === req.user.id
        );
      }
    }
    
    if (!isParticipant && !isGroupMember) {
      return res.status(403).json({ msg: 'Not authorized to access this drawing' });
    }
    
    res.json(drawing);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Drawing not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/drawings
// @desc    Get all drawings for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Find all drawings where the user is a participant
    const drawings = await Drawing.find({
      $or: [
        { participants: req.user.id },
        { creator: req.user.id }
      ]
    })
    .populate('creator', 'name')
    .populate('group', 'name')
    .sort({ lastModified: -1 });
    
    // Find all drawings in groups where the user is a member
    const groups = await Group.find({
      'members.user': req.user.id
    }).select('_id');
    
    const groupIds = groups.map(group => group._id);
    
    const groupDrawings = await Drawing.find({
      group: { $in: groupIds },
      participants: { $ne: req.user.id },
      creator: { $ne: req.user.id }
    })
    .populate('creator', 'name')
    .populate('group', 'name')
    .sort({ lastModified: -1 });
    
    // Combine both sets of drawings and remove duplicates
    const allDrawings = [...drawings];
    
    // Add group drawings that aren't already in the results
    groupDrawings.forEach(drawing => {
      if (!allDrawings.some(d => d._id.toString() === drawing._id.toString())) {
        allDrawings.push(drawing);
      }
    });
    
    res.json(allDrawings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/drawings/:id
// @desc    Update a drawing
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { title, canvasData } = req.body;
  
  try {
    let drawing = await Drawing.findById(req.params.id);
    
    if (!drawing) {
      return res.status(404).json({ msg: 'Drawing not found' });
    }
    
    // Check if user is the creator
    if (drawing.creator.toString() !== req.user.id) {
      // Check if user is a participant
      const isParticipant = drawing.participants.some(
        participant => participant.toString() === req.user.id
      );
      
      if (!isParticipant) {
        return res.status(403).json({ msg: 'Not authorized to update this drawing' });
      }
    }
    
    // Update drawing fields
    if (title) drawing.title = title;
    if (canvasData) drawing.canvasData = canvasData;
    
    drawing.lastModified = Date.now();
    
    await drawing.save();
    
    res.json(drawing);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Drawing not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/drawings/:id
// @desc    Delete a drawing
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const drawing = await Drawing.findById(req.params.id);
    
    if (!drawing) {
      return res.status(404).json({ msg: 'Drawing not found' });
    }
    
    // Check if user is the creator of the drawing
    if (drawing.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this drawing' });
    }
    
    await drawing.deleteOne();
    
    res.json({ msg: 'Drawing deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Drawing not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;