const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Role model for RBAC
const Role = sequelize.define('Role', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
});

// Audit log
const AuditLog = sequelize.define('AuditLog', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

// Service ticket (request)
const Ticket = sequelize.define('Ticket', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('new','in_progress','resolved','closed'), defaultValue: 'new' },
    priority: { type: DataTypes.ENUM('low','medium','high'), defaultValue: 'medium' }
});

// Document repository
const Document = sequelize.define('Document', {
    title: { type: DataTypes.STRING, allowNull: false },
    path: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING },
    department: { type: DataTypes.STRING }
});

// Calendar events
const Event = sequelize.define('Event', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    start: { type: DataTypes.DATE, allowNull: false },
    end: { type: DataTypes.DATE, allowNull: false }
});

// Extend Inventory to include threshold
const Inventory = require('./Inventory');
Inventory.init({
    minQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { sequelize, modelName: 'Inventory', timestamps: false });

// Associations
const User = require('./User');

Role.belongsToMany(User, { through: 'UserRoles' });
User.belongsToMany(Role, { through: 'UserRoles' });

AuditLog.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(AuditLog, { foreignKey: 'userId' });

Ticket.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });
Ticket.belongsTo(User, { as: 'assignee', foreignKey: 'assigneeId' });
User.hasMany(Ticket, { as: 'createdTickets', foreignKey: 'creatorId' });
User.hasMany(Ticket, { as: 'assignedTickets', foreignKey: 'assigneeId' });

Document.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
User.hasMany(Document, { foreignKey: 'ownerId' });

Event.belongsTo(User, { as: 'organizer', foreignKey: 'organizerId' });
User.hasMany(Event, { foreignKey: 'organizerId' });

module.exports = { Role, AuditLog, Ticket, Document, Event };
