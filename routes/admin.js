const express = require('express');
const router = express.Router();
const { ensureAdmin, ensureSuperAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');
const inventoryRouter = require('./inventory');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Admin Home (overview panels)
router.get('/', ensureAdmin, async (req, res) => {
  try {
    const usersCount = await User.count();
    const consumablesCount = await Inventory.count({ where: { category: 'consumable' } });
    const materialsCount = await Inventory.count({ where: { category: 'material' } });
    const lowStockCount = await Inventory.count({
      where: { quantity: { [Op.lt]: sequelize.col('minQuantity') } }
    });
    const ticketsCount = await Ticket.count();
    const auditLogs = await AuditLog.findAll({
      include: [{ model: User, attributes: ['username'] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.render('admin/home', {
      title: 'Admin Home',
      user: req.user,
      usersCount,
      consumablesCount,
      materialsCount,
      lowStockCount,
      ticketsCount,
      auditLogs,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while loading the admin home');
    res.redirect('/dashboard');
  }
});

// Legacy /home route for old links
router.get('/home', ensureAdmin, (req, res) => {
  res.redirect('/admin');
});

// Admin Dashboard (recent activity)
router.get('/dashboard', ensureAdmin, async (req, res) => {
  try {
    const usersCount = await User.count();
    const consumablesCount = await Inventory.count({ where: { category: 'consumable' } });
    const materialsCount = await Inventory.count({ where: { category: 'material' } });
    const lowStockCount = await Inventory.count({
      where: { quantity: { [Op.lt]: sequelize.col('minQuantity') } }
    });
    const recentItems = await Inventory.findAll({
      order: [['lastUpdated', 'DESC']],
      limit: 10,
      include: [{ model: User, as: 'updatedBy', attributes: ['username'] }]
    });

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.user,
      usersCount,
      consumablesCount,
      materialsCount,
      lowStockCount,
      recentItems,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while loading the admin dashboard');
    res.redirect('/admin');
  }
});

// Statistics page
router.get('/stats', ensureAdmin, async (req, res) => {
  try {
    const consumablesCount = await Inventory.count({ where: { category: 'consumable' } });
    const materialsCount = await Inventory.count({ where: { category: 'material' } });
    const lowStockCount = await Inventory.count({
      where: { quantity: { [Op.lt]: sequelize.col('minQuantity') } }
    });

    const itemsByMonth = await Inventory.findAll({
      attributes: [
        [sequelize.literal("strftime('%Y-%m', createdAt)"), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['month'],
      order: [[sequelize.literal('month'), 'ASC']]
    });

    const months = itemsByMonth.map(row => row.get('month'));
    const counts = itemsByMonth.map(row => row.get('count'));

    res.render('admin/stats', {
      title: 'Statistics',
      user: req.user,
      consumablesCount,
      materialsCount,
      lowStockCount,
      months,
      counts,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load statistics');
    res.redirect('/admin');
  }
});

// Statistics PDF
router.get('/stats/pdf', ensureAdmin, async (req, res) => {
  try {
    const consumablesCount = await Inventory.count({ where: { category: 'consumable' } });
    const materialsCount = await Inventory.count({ where: { category: 'material' } });
    const lowStockCount = await Inventory.count({
      where: { quantity: { [Op.lt]: sequelize.col('minQuantity') } }
    });

    const itemsByMonth = await Inventory.findAll({
      attributes: [
        [sequelize.literal("strftime('%Y-%m', createdAt)"), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['month'],
      order: [[sequelize.literal('month'), 'ASC']]
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="stats.pdf"');
    doc.fontSize(18).text('Inventory Statistics', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Consumables: ${consumablesCount}`);
    doc.text(`Materials: ${materialsCount}`);
    doc.text(`Low Stock Items: ${lowStockCount}`);
    doc.moveDown();
    doc.text('Items added per month:');
    itemsByMonth.forEach(item => {
      doc.text(`${item.get('month')}: ${item.get('count')}`);
    });
    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to generate statistics PDF');
    res.redirect('/admin/stats');
  }
});

// Consumables Management
router.get('/consumables', ensureAdmin, async (req, res) => {
  try {
    const consumables = await Inventory.findAll({
      where: { category: 'consumable' },
      order: [['name', 'ASC']],
      include: [{ model: User, as: 'updatedBy', attributes: ['username'] }]
    });
    res.render('admin/consumables', {
      title: 'Consumables Management',
      user: req.user,
      consumables,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while loading consumables');
    res.redirect('/admin');
  }
});

// Materials Management
router.get('/materials', ensureAdmin, async (req, res) => {
  try {
    const materials = await Inventory.findAll({
      where: { category: 'material' },
      order: [['name', 'ASC']],
      include: [{ model: User, as: 'updatedBy', attributes: ['username'] }]
    });
    res.render('admin/materials', {
      title: 'Materials Management',
      user: req.user,
      materials,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while loading materials');
    res.redirect('/admin');
  }
});

// User Management List
router.get('/users', ensureAdmin, async (req, res) => {
  try {
    const users = await User.findAll({ order: [['username', 'ASC']] });
    res.render('admin/users', {
      title: 'User Management',
      user: req.user,
      users,
      currentUser: req.user,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'An error occurred while loading users');
    res.redirect('/admin');
  }
});

// Create User Form
router.get('/users/create', ensureSuperAdmin, (req, res) => {
  res.render('admin/create-user', {
    title: 'Create User',
    user: req.user,
    layout: 'admin-layout'
  });
});

// Create User - POST
router.post('/users/create', ensureSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    await User.create({
      username,
      email,
      password,
      role: role || 'engineer'
    });
    await AuditLog.create({
      userId: req.user.id,
      action: 'create_user',
      details: { username }
    });
    req.flash('success_msg', 'User created successfully');
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to create user');
    res.redirect('/admin/users');
  }
});

// Edit User Form
router.get('/users/edit/:id', ensureSuperAdmin, async (req, res) => {
  try {
    const editUser = await User.findByPk(req.params.id);
    if (!editUser) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    res.render('admin/edit-user', {
      title: 'Edit User',
      user: req.user,
      editUser,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load user');
    res.redirect('/admin/users');
  }
});

// Edit User - POST
router.post('/users/edit/:id', ensureSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const editUser = await User.findByPk(req.params.id);
    if (!editUser) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    editUser.username = username;
    editUser.email = email;
    if (editUser.role !== 'superAdmin') {
      editUser.role = role || editUser.role;
    }
    if (password) {
      editUser.password = password;
    }
    await editUser.save();
    await AuditLog.create({
      userId: req.user.id,
      action: 'edit_user',
      details: { targetId: editUser.id }
    });
    req.flash('success_msg', 'User updated successfully');
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to update user');
    res.redirect('/admin/users');
  }
});

// Toggle admin status
router.post('/users/toggle-admin/:id', ensureSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    if (user.role === 'superAdmin') {
      req.flash('error_msg', 'Cannot modify super admin');
      return res.redirect('/admin/users');
    }
    user.role = user.role === 'admin' ? 'engineer' : 'admin';
    await user.save();
    await AuditLog.create({
      userId: req.user.id,
      action: 'toggle_admin',
      details: { targetId: user.id, role: user.role }
    });
    req.flash('success_msg', 'User updated');
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to update user');
    res.redirect('/admin/users');
  }
});

// Delete User
router.post('/users/delete/:id', ensureSuperAdmin, async (req, res) => {
  try {
    const userToDelete = await User.findByPk(req.params.id);
    if (!userToDelete) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    if (userToDelete.role === 'superAdmin') {
      req.flash('error_msg', 'Cannot delete super admin');
      return res.redirect('/admin/users');
    }
    await userToDelete.destroy();
    await AuditLog.create({
      userId: req.user.id,
      action: 'delete_user',
      details: { targetId: userToDelete.id }
    });
    req.flash('success_msg', 'User deleted');
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to delete user');
    res.redirect('/admin/users');
  }
});

// Reuse inventory routes under admin prefix
router.use('/inventory', ensureAdmin, inventoryRouter);


// List and manage service tickets
router.get('/tickets', ensureAdmin, async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: User, as: 'assignee', attributes: ['username'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const users = await User.findAll({ attributes: ['id', 'username'] });
    res.render('admin/tickets', {
      title: 'Service Tickets',
      user: req.user,
      tickets,
      users,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load tickets');
    res.redirect('/admin');
  }
});

// Update ticket status
router.post('/tickets/status/:id', ensureAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      req.flash('error_msg', 'Ticket not found');
      return res.redirect('/admin/tickets');
    }
    await ticket.update({ status: req.body.status });
    await AuditLog.create({
      userId: req.user.id,
      action: 'update_ticket_status',
      details: { ticketId: ticket.id, status: req.body.status }
    });
    req.flash('success_msg', 'Ticket updated');
    res.redirect('/admin/tickets');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to update ticket');
    res.redirect('/admin/tickets');
  }
});

// Assign ticket to user
router.post('/tickets/assign/:id', ensureAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      req.flash('error_msg', 'Ticket not found');
      return res.redirect('/admin/tickets');
    }
    const assigneeId = req.body.assigneeId || null;
    await ticket.update({ assigneeId });
    await AuditLog.create({
      userId: req.user.id,
      action: 'assign_ticket',
      details: { ticketId: ticket.id, assigneeId }
    });
    req.flash('success_msg', 'Ticket updated');
    res.redirect('/admin/tickets');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to assign ticket');
    res.redirect('/admin/tickets');
  }
});

// View complete audit log
router.get('/audit', ensureAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      include: [{ model: User, attributes: ['username'] }],
      order: [['createdAt', 'DESC']]
    });
    res.render('admin/audit-logs', {
      title: 'Audit Logs',
      user: req.user,
      logs,
      layout: 'admin-layout'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load audit logs');
    res.redirect('/admin');
  }
});

// Settings page for Telegram bot token
const Setting = require('../models/Setting');

router.get('/settings', ensureSuperAdmin, async (req, res) => {
  const tokenSetting = await Setting.findOne({ where: { key: 'TELEGRAM_BOT_TOKEN' } });
  const secretSetting = await Setting.findOne({ where: { key: 'TELEGRAM_BOT_SECRET' } });
  res.render('admin/settings', {
    title: 'Settings',
    user: req.user,
    token: tokenSetting ? tokenSetting.value : '',
    secret: secretSetting ? secretSetting.value : '',
    layout: 'admin-layout'
  });
});

router.post('/settings', ensureSuperAdmin, async (req, res) => {
  try {
    const { token, secret } = req.body;
    const [tokenSetting] = await Setting.findOrCreate({
      where: { key: 'TELEGRAM_BOT_TOKEN' },
      defaults: { value: token }
    });
    tokenSetting.value = token;
    await tokenSetting.save();

    const [secretSetting] = await Setting.findOrCreate({
      where: { key: 'TELEGRAM_BOT_SECRET' },
      defaults: { value: secret }
    });
    secretSetting.value = secret;
    await secretSetting.save();

    process.env.TELEGRAM_BOT_TOKEN = token;
    process.env.TELEGRAM_BOT_SECRET = secret;
    req.flash('success_msg', 'Settings saved');
    res.redirect('/admin/settings');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to save settings');
    res.redirect('/admin/settings');
  }
});

module.exports = router;
