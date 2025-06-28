const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Event = sequelize.define('Event', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  start: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, { timestamps: true });

// Link events to their organizing user via organizerId
Event.belongsTo(User, { as: 'organizer', foreignKey: 'organizerId' });
User.hasMany(Event, { foreignKey: 'organizerId' });


module.exports = Event;

