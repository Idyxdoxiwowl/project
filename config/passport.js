const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
  // Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await User.findOne({ where: { email } });
        
        // If user not found or password incorrect, return generic error message
        if (!user) {
          return done(null, false, { message: 'Email or password is incorrect' });
        }
        
        // Match password
        const isMatch = await user.comparePassword(password);
        
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Email or password is incorrect' });
        }
      } catch (err) {
        console.error('Authentication error:', err);
        // Return a generic error message for any database errors
        return done(null, false, { message: 'Email or password is incorrect' });
      }
    }
  ));
  
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });
};