const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

// Define Inventory model
const Inventory = sequelize.define('Inventory', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['consumable', 'material']]
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  minQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  supplier: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedById: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  hooks: {
    beforeUpdate: (inventory) => {
      inventory.lastUpdated = new Date();
    },
    afterSave: async (inventory) => {
      // Check if inventory is low after saving
      if (inventory.isLow()) {
        try {
          // Dynamically import to avoid circular dependency
          const { checkAndNotifyLowStock } = require('../telegramBot');
          const TelegramBot = require('node-telegram-bot-api');
          const Setting = require('./Setting');

          // Get bot token
          let token = process.env.TELEGRAM_BOT_TOKEN;
          if (!token) {
            const tokenSetting = await Setting.findOne({ where: { key: 'TELEGRAM_BOT_TOKEN' } });
            if (tokenSetting) token = tokenSetting.value;
          }

          // Initialize bot and send notification if possible
          if (token) {
            const tempBot = new TelegramBot(token);
            await checkAndNotifyLowStock(tempBot);
          }
        } catch (err) {
          console.error('Error sending low stock notification from hook:', err);
        }
      }
    }
  }
});

// Define association with User model
Inventory.belongsTo(User, { foreignKey: 'updatedById', as: 'updatedBy' });

// Method to check if inventory is below threshold
Inventory.prototype.isLow = function() {
  const threshold = this.minQuantity != null ? this.minQuantity : 10;
  return this.quantity < threshold;
};


// This model is synced centrally in models/index.js

module.exports = Inventory;
