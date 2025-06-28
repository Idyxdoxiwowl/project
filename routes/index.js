var express = require('express');
var router = express.Router();
var { forwardAuthenticated } = require('../middleware/auth');

/* GET home page. */
router.get('/', forwardAuthenticated, function(req, res, next) {
  res.render('index', { title: 'Inventory Management System' });
});

module.exports = router;
