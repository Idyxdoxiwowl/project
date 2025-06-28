const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Dashboard - Main page after login
router.get('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const role = req.user.role;

    // Show simplified dashboards for specific roles
    if (role === 'engineer') {
      return res.render('dashboard/engineer', {
        title: 'Engineer Dashboard',
        user: req.user
      });
    }

    if (role === 'accountant') {
      return res.render('dashboard/accountant', {
        title: 'Accountant Dashboard',
        user: req.user
      });
    }

    // Default dashboard for admins or other roles
    const inventoryItems = await Inventory.findAll({
      order: [['lastUpdated', 'DESC']],
      limit: 10
    });

    const consumablesCount = await Inventory.count({
      where: { category: 'consumable' }
    });

    const materialsCount = await Inventory.count({
      where: { category: 'material' }
    });

    const lowStockItems = await Inventory.findAll({
      where: {
        quantity: { [Op.lt]: sequelize.col('minQuantity') }
      }
    });

    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      inventoryItems,
      consumablesCount,
      materialsCount,
      lowStockItems
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while loading the dashboard');
    return res.redirect('/');
  }
});

module.exports = router;