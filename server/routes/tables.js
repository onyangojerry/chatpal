const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Table = require('../models/Table');
const Group = require('../models/Group');

// @route   POST api/tables
// @desc    Create a new table
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('columns', 'Columns must be an array').isArray()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, group, columns, rows } = req.body;
    
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
          return res.status(403).json({ msg: 'Not authorized to create tables in this group' });
        }
      }
      
      // Create new table
      const newTable = new Table({
        title,
        creator: req.user.id,
        group,
        columns,
        rows: rows || []
      });
      
      const table = await newTable.save();
      
      res.json(table);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Group not found' });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/tables/:id
// @desc    Get a table by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id)
      .populate('creator', 'name')
      .populate('group', 'name');
    
    if (!table) {
      return res.status(404).json({ msg: 'Table not found' });
    }
    
    // Check if user is a member of the group
    let isGroupMember = false;
    
    if (table.group) {
      const group = await Group.findById(table.group._id);
      
      if (group) {
        isGroupMember = group.members.some(
          member => member.user.toString() === req.user.id
        );
      }
    }
    
    if (!isGroupMember && table.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to access this table' });
    }
    
    res.json(table);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Table not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/tables
// @desc    Get all tables for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Find all tables created by the user
    const userTables = await Table.find({
      creator: req.user.id
    })
    .populate('group', 'name')
    .sort({ lastModified: -1 });
    
    // Find all tables in groups where the user is a member
    const groups = await Group.find({
      'members.user': req.user.id
    }).select('_id');
    
    const groupIds = groups.map(group => group._id);
    
    const groupTables = await Table.find({
      group: { $in: groupIds },
      creator: { $ne: req.user.id }
    })
    .populate('creator', 'name')
    .populate('group', 'name')
    .sort({ lastModified: -1 });
    
    const allTables = [...userTables, ...groupTables];
    
    res.json(allTables);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/tables/:id
// @desc    Update a table
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { title, columns, rows } = req.body;
  
  try {
    let table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ msg: 'Table not found' });
    }
    
    // Check if user is the creator of the table
    if (table.creator.toString() !== req.user.id) {
      // Check if user is a member of the group
      if (table.group) {
        const group = await Group.findById(table.group);
        
        if (group) {
          const isMember = group.members.some(
            member => member.user.toString() === req.user.id
          );
          
          if (!isMember) {
            return res.status(403).json({ msg: 'Not authorized to update this table' });
          }
        } else {
          return res.status(403).json({ msg: 'Not authorized to update this table' });
        }
      } else {
        return res.status(403).json({ msg: 'Not authorized to update this table' });
      }
    }
    
    // Update table fields
    if (title) table.title = title;
    if (columns) table.columns = columns;
    if (rows) table.rows = rows;
    
    table.lastModified = Date.now();
    
    await table.save();
    
    res.json(table);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Table not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/tables/:id
// @desc    Delete a table
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ msg: 'Table not found' });
    }
    
    // Check if user is the creator of the table
    if (table.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this table' });
    }
    
    await table.deleteOne();
    
    res.json({ msg: 'Table deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Table not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;