module.exports = {
  // Ensure user is authenticated
  ensureAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    return res.redirect('/users/login');
  },
  
  // Ensure user is not authenticated (for login/register pages)
  forwardAuthenticated: function(req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }
    return res.redirect('/dashboard');
  },
  
  // Ensure user is admin
  ensureAdmin: function(req, res, next) {
    if (
      req.isAuthenticated() &&
      (req.user.role === 'admin' || req.user.role === 'superAdmin')
    ) {
      return next();
    }
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    return res.redirect('/dashboard');
  },

  // Ensure user is super admin
  ensureSuperAdmin: function(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'superAdmin') {
      return next();
    }
    req.flash('error_msg', 'Access denied. Super admin privileges required.');
    return res.redirect('/dashboard');

  },

  // Ensure user has specific role (admin or super admin always allowed)
  ensureRole: function(role) {
    return function(req, res, next) {
      if (
        req.isAuthenticated() &&
        (req.user.role === role || req.user.role === 'admin' || req.user.role === 'superAdmin')
      ) {
        return next();
      }
      req.flash('error_msg', 'Access denied.');
      return res.redirect('/dashboard');
    };
  }
};