const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Document = sequelize.define('Document', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

// Associate documents with users via the ownerId column
Document.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
User.hasMany(Document, { foreignKey: 'ownerId' });


module.exports = Document;

