const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Ticket = sequelize.define('Ticket', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved'),
    defaultValue: 'open'
  }
}, { timestamps: true });

Ticket.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });
Ticket.belongsTo(User, { as: 'assignee', foreignKey: 'assigneeId' });


module.exports = Ticket;

