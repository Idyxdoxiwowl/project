const express = require('express');
const router = express.Router();
const { ensureRole } = require('../middleware/auth');
const Inventory = require('../models/Inventory');

// Accountant dashboard
router.get('/', ensureRole('accountant'), async (req, res) => {
  try {
    const items = await Inventory.findAll();
    const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    res.render('accounting/dashboard', {
      title: 'Accounting Dashboard',
      user: req.user,
      items,
      totalValue
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load accounting dashboard');
    res.redirect('/dashboard');
  }
});

module.exports = router;
