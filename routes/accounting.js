const express = require('express');
const router = express.Router();
const { ensureRole } = require('../middleware/auth');
const Inventory = require('../models/Inventory');

// Accounting landing page - shows inventory value summary
router.get('/', ensureRole('accountant'), async (req, res) => {
  try {
    const items = await Inventory.findAll();
    const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    res.render('accounting/index', {
      title: 'Accounting',
      user: req.user,
      items,
      totalValue
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load accounting data');
    res.redirect('/dashboard');
  }
});

// Export inventory valuation as CSV
router.get('/report.csv', ensureRole('accountant'), async (req, res) => {
  try {
    const items = await Inventory.findAll();
    const rows = ['Name,Quantity,Unit Price,Total Value'];
    items.forEach(i => {
      rows.push(`${i.name},${i.quantity},${i.price},${i.price * i.quantity}`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
    res.send(rows.join('\n'));
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to generate CSV');
    res.redirect('/accounting');
  }
});

module.exports = router;
