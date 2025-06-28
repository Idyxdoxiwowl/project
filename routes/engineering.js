const express = require('express');
const router = express.Router();
const { ensureRole } = require('../middleware/auth');

const Inventory = require('../models/Inventory');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Engineering landing page - show low stock items
router.get('/', ensureRole('engineer'), async (req, res) => {
  try {
    const lowItems = await Inventory.findAll({
      where: { quantity: { [Op.lt]: sequelize.col('minQuantity') } },
      order: [['name', 'ASC']]
    });
    res.render('engineering/index', {
      title: 'Engineering',
      user: req.user,
      lowItems
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load engineering data');
    res.redirect('/dashboard');
  }
});

// Export low stock items as CSV
router.get('/low-stock.csv', ensureRole('engineer'), async (req, res) => {
  try {
    const lowItems = await Inventory.findAll({
      where: { quantity: { [Op.lt]: sequelize.col('minQuantity') } },
      order: [['name', 'ASC']]
    });
    const rows = ['Name,Quantity,Minimum'];
    lowItems.forEach(i => {
      rows.push(`${i.name},${i.quantity},${i.minQuantity}`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="low-stock.csv"');
    res.send(rows.join('\n'));
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to generate CSV');
    res.redirect('/engineering');
  }
});

module.exports = router;
