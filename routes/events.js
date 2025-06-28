const express = require('express');
const router = express.Router();
const { ensureRole } = require('../middleware/auth');
const Event = require('../models/Event');

// List events
router.get('/', ensureRole('engineer'), async (req, res) => {
  try {
    const events = await Event.findAll({ order: [['start', 'ASC']] });
    res.render('events/index', { title: 'Calendar', user: req.user, events });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load events');
    res.redirect('/dashboard');
  }
});

// New event form
router.get('/new', ensureRole('engineer'), (req, res) => {
  res.render('events/new', { title: 'Add Event', user: req.user });
});

// Create event
router.post('/new', ensureRole('engineer'), async (req, res) => {
  try {
    const { title, description, start, end } = req.body;
    await Event.create({
      title,
      description,
      start,
      end,
      organizerId: req.user.id
    });
    req.flash('success_msg', 'Event created');
    res.redirect('/events');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to create event');
    res.redirect('/events/new');
  }
});

module.exports = router;
