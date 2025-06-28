const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { Op } = require('sequelize');
const { ensureRole } = require('../middleware/auth');
const Document = require('../models/Document');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.get('/', ensureRole('engineer'), async (req, res) => {
  try {
    const { category, department, type, startDate, endDate } = req.query;
    const where = {};
    if (category) where.category = category;
    if (department) where.department = department;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    const documents = await Document.findAll({ where, order: [['createdAt', 'DESC']] });
    res.render('documents/index', { title: 'Documents', documents, filters: req.query, user: req.user });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading documents');
    res.redirect('/');
  }
});

router.get('/upload', ensureRole('engineer'), (req, res) => {
  res.render('documents/upload', { title: 'Upload Document', user: req.user });
});

router.post('/upload', ensureRole('engineer'), upload.single('file'), async (req, res) => {
  try {
    const { title, category, department, type } = req.body;
    if (!req.file) {
      req.flash('error_msg', 'File is required');
      return res.redirect('/documents/upload');
    }
    await Document.create({
      title,
      category,
      department,
      type,
      path: req.file.filename,
      ownerId: req.user.id
    });
    req.flash('success_msg', 'Document uploaded successfully');
    res.redirect('/documents');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error uploading document');
    res.redirect('/documents/upload');
  }
});

module.exports = router;
