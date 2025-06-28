const express = require('express');
const router = express.Router();
const { ensureRole } = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Engineer dashboard
router.get('/', ensureRole('engineer'), async (req, res) => {
  try {
    const lowItems = await Inventory.findAll({
      where: { quantity: { [Op.lt]: sequelize.col('minQuantity') } },
      order: [['name', 'ASC']]
    });
    res.render('engineering/dashboard', {
      title: 'Engineering Dashboard',
      user: req.user,
      lowItems
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load engineering dashboard');
    res.redirect('/dashboard');
  }
});

module.exports = router;
