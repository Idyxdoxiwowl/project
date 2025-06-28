const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { sendEmailNotification, sendTelegramNotification } = require('../utils/notification');

// Form to create a new ticket
router.get('/new', ensureAuthenticated, (req, res) => {
  res.render('tickets/new', { title: 'New Ticket', user: req.user });
});

// Submit new ticket
router.post('/new', ensureAuthenticated, async (req, res) => {
  try {
    const { title, description } = req.body;
    const ticket = await Ticket.create({
      title,
      description,
      creatorId: req.user.id
    });

    const message = `New ticket created: ${title}`;
    await sendEmailNotification(process.env.NOTIFY_EMAIL || req.user.email, 'New Ticket', message);
    await sendTelegramNotification(message);

    req.flash('success_msg', 'Ticket created');
    res.redirect('/tickets');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error creating ticket');
    res.redirect('/tickets/new');
  }
});

// List tickets for current user
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { creatorId: req.user.id },
      include: [{ model: User, as: 'assignee', attributes: ['username'] }]
    });
    res.render('tickets/index', { title: 'My Tickets', user: req.user, tickets });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading tickets');
    res.redirect('/dashboard');
  }
});

module.exports = router;
