const express = require('express');
const router = express.Router();
const { ensureRole, ensureAdmin } = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const {
  createItem,
  updateItem,
  deleteItem,
  restockItem
} = require('../controllers/inventoryController');

// Add Inventory Item Form
router.get('/add', ensureRole('engineer'), (req, res) => {
  res.render('inventory/add', {
    title: 'Add Inventory Item',
    user: req.user
  });
});

// Add Inventory Item - POST
router.post('/add', ensureRole('engineer'), async (req, res) => {
  try {
    await createItem(req.body, req.user);
    req.flash('success_msg', 'Inventory item added successfully');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while adding the inventory item');
    res.redirect('/inventory/add');
  }
});

// Edit Inventory Item Form
router.get('/edit/:id', ensureAdmin, async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);

    if (!item) {
      req.flash('error_msg', 'Inventory item not found');
      return res.redirect('/dashboard');
    }

    res.render('inventory/edit', {
      title: 'Edit Inventory Item',
      user: req.user,
      item
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while loading the inventory item');
    res.redirect('/dashboard');
  }
});

// Edit Inventory Item - POST
router.post('/edit/:id', ensureAdmin, async (req, res) => {
  try {
    await updateItem(req.params.id, req.body, req.user);
    req.flash('success_msg', 'Inventory item updated successfully');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while updating the inventory item');
    res.redirect(`/inventory/edit/${req.params.id}`);
  }
});

// Delete Inventory Item
router.get('/delete/:id', ensureAdmin, async (req, res) => {
  try {
    await deleteItem(req.params.id, req.user);
    req.flash('success_msg', 'Inventory item deleted successfully');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while deleting the inventory item');
    res.redirect('/dashboard');
  }
});

// Restock Inventory Item Form
router.get('/restock/:id', ensureRole('engineer'), async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);

    if (!item) {
      req.flash('error_msg', 'Inventory item not found');
      return res.redirect('/dashboard');
    }

    res.render('inventory/restock', {
      title: 'Restock Inventory Item',
      user: req.user,
      item
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while loading the inventory item');
    res.redirect('/dashboard');
  }
});

// Restock Inventory Item - POST
router.post('/restock/:id', ensureRole('engineer'), async (req, res) => {
  try {
    const { additionalQuantity } = req.body;
    const updated = await restockItem(req.params.id, additionalQuantity, req.user);
    req.flash('success_msg', `Successfully restocked ${updated.name}`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while restocking the inventory item');
    res.redirect(`/inventory/restock/${req.params.id}`);
  }
});

module.exports = router;
