const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { forwardAuthenticated } = require('../middleware/auth');
const { Op } = require('sequelize');

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('login', { title: 'Login' });
});

// Register Page
router.get('/register', forwardAuthenticated, async (req, res) => {
  const userCount = await User.count();
  if (userCount > 0) {
    req.flash('error_msg', 'Registration is disabled. Please contact an administrator.');
    return res.redirect('/users/login');
  }
  res.render('register', { title: 'Register' });
});

// Register Handle
router.post('/register', async (req, res) => {
  const { username, email, password, password2 } = req.body;
  let errors = [];

  const userCount = await User.count();
  if (userCount > 0) {
    req.flash('error_msg', 'Registration is disabled. Please ask an administrator to create an account.');
    return res.redirect('/users/login');
  }

  // Check required fields
  if (!username || !email || !password || !password2) {
    errors.push({ msg: 'Please fill in all fields' });
  }

  // Check passwords match
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  // Check password length
  if (password.length < 6) {
    errors.push({ msg: 'Password should be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('register', {
      title: 'Register',
      errors,
      username,
      email
    });
  } else {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: email },
            { username: username }
          ]
        }
      });

      if (existingUser) {
        errors.push({ msg: 'Email or username is already registered' });
        res.render('register', {
          title: 'Register',
          errors,
          username,
          email
        });
      } else {
        const isFirstUser = userCount === 0;
        await User.create({
          username,
          email,
          password,
          role: isFirstUser ? 'superAdmin' : 'engineer'
        });
        
        req.flash('success_msg', 'You are now registered and can log in');
        return res.redirect('/users/login');
      }
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'An error occurred during registration');
      return res.redirect('/users/register');
    }
  }
});

// Login Handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('error_msg', info ? info.message : 'Login failed');
      return res.redirect('/users/login');
    }
    req.logIn(user, async (err) => {
      if (err) { return next(err); }

      // Audit the successful login
      try {
        await AuditLog.create({ userId: user.id, action: 'login' });
      } catch (e) {
        console.error('Failed to create audit log:', e);
      }

      // Determine where to send the user based on their role
      let redirectUrl = '/dashboard';

      if (user.role === 'superAdmin') {
        // super-admins manage the whole system
        redirectUrl = '/admin';
      } else if (user.role === 'engineer') {
        // engineers get their engineering dashboard
        redirectUrl = '/dashboard/engineer';
      } else if (user.role === 'accountant') {
        // accountants get their accounting dashboard
        redirectUrl = '/dashboard/accountant';
      }

      return res.redirect(redirectUrl);
    });
  })(req, res, next);
});



// Logout Handle
router.get('/logout', async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  req.logout(async function(err) {
    if (err) { return next(err); }
    if (userId) {
      try {
        await AuditLog.create({ userId, action: 'logout' });
      } catch (e) {
        console.error('Failed to create audit log:', e);
      }
    }
    req.flash('success_msg', 'You are logged out');
    return res.redirect('/users/login');
  });
});

module.exports = router;