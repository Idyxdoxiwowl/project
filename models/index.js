const sequelize = require('../config/database');
// Import all models to ensure they are registered with Sequelize
require('./User');
require('./Inventory');
require('./AuditLog');
require('./Ticket');
require('./Document');
require('./Event');
require('./Setting');

module.exports = async function syncModels() {
  try {
    // For SQLite, using alter:true can cause UNIQUE constraint errors
    // Force:true is dangerous in production as it drops tables
    // For development, using sync() without options is safer
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
    } else {
      // In production, just sync without altering
      await sequelize.sync({alter: false});
    }
    console.log('All models synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing models:', error);
  }
};

