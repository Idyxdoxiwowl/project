const TelegramBot = require('node-telegram-bot-api');
const Inventory = require('./models/Inventory');
const Setting = require('./models/Setting');
const { Op } = require('sequelize');
const sequelize = require('./config/database');

// Cache to store the last notification message to prevent duplicates
let lastNotificationHash = '';

async function startBot() {
  let token = process.env.TELEGRAM_BOT_TOKEN;
  let secret = process.env.TELEGRAM_BOT_SECRET;

  // Load credentials from the database if not present in env vars
  try {
    if (!token) {
      const tokenSetting = await Setting.findOne({ where: { key: 'TELEGRAM_BOT_TOKEN' } });
      if (tokenSetting) token = tokenSetting.value;
    }
    if (!secret) {
      const secretSetting = await Setting.findOne({ where: { key: 'TELEGRAM_BOT_SECRET' } });
      if (secretSetting) secret = secretSetting.value;
    }
  } catch (err) {
    console.error('Failed to load Telegram credentials from DB:', err.message);
  }

  if (!token || !secret) {
    console.log('Telegram bot disabled: missing token or secret');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/low\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const provided = match[1];
    if (provided !== secret) {
      bot.sendMessage(chatId, 'Unauthorized');
      return;
    }
    try {
      const items = await Inventory.findAll({
        order: [['category', 'ASC'], ['name', 'ASC']]
      });
      const lowItems = items.filter(i => i.isLow());
      if (lowItems.length === 0) {
        bot.sendMessage(chatId, '✅ All inventory levels are healthy.');
        return;
      }

      // Group by category
      const consumables = lowItems.filter(item => item.category === 'consumable');
      const materials = lowItems.filter(item => item.category === 'material');

      let response = '🚨 *LOW STOCK INVENTORY REPORT* 🚨\n\n';

      if (consumables.length > 0) {
        response += '📦 *CONSUMABLES*:\n';
        for (const item of consumables) {
          const percentRemaining = Math.round((item.quantity / item.minQuantity) * 100);
          response += `• *${item.name}* (#${item.id}): ${item.quantity}/${item.minQuantity} ${item.unit} (${percentRemaining}%)\n`;
        }
        response += '\n';
      }

      if (materials.length > 0) {
        response += '🔧 *MATERIALS*:\n';
        for (const item of materials) {
          const percentRemaining = Math.round((item.quantity / item.minQuantity) * 100);
          response += `• *${item.name}* (#${item.id}): ${item.quantity}/${item.minQuantity} ${item.unit} (${percentRemaining}%)\n`;
        }
      }

      response += '\nUse `/restock {secret} {item_id} {amount}` to restock an item.';
      bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Bot error:', err);
      bot.sendMessage(chatId, 'Error fetching inventory');
    }
  });

  bot.onText(/\/restock\s+(\S+)\s+(\d+)\s+(\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const provided = match[1];
    const itemId = parseInt(match[2]);
    const amount = parseInt(match[3]);
    if (provided !== secret) {
      bot.sendMessage(chatId, 'Unauthorized');
      return;
    }
    try {
      const item = await Inventory.findByPk(itemId);
      if (!item) {
        bot.sendMessage(chatId, 'Item not found');
        return;
      }
      await item.update({ quantity: item.quantity + amount, lastUpdated: new Date() });

      // Reset the notification hash to trigger a fresh inventory check
      lastNotificationHash = '';

      // Send confirmation message
      bot.sendMessage(chatId, `✅ Restocked *${item.name}*. New quantity: *${item.quantity}* ${item.unit}`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Bot error:', err);
      bot.sendMessage(chatId, 'Error updating inventory');
    }
  });

  bot.onText(/\/setchat\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const provided = match[1];
    if (provided !== secret) {
      bot.sendMessage(chatId, 'Unauthorized');
      return;
    }
    try {
      // Store the chat ID in the database
      const [chatIdSetting] = await Setting.findOrCreate({
        where: { key: 'TELEGRAM_CHAT_ID' },
        defaults: { value: chatId.toString() }
      });
      chatIdSetting.value = chatId.toString();
      await chatIdSetting.save();

      // Also set it in the environment
      process.env.TELEGRAM_CHAT_ID = chatId.toString();

      bot.sendMessage(chatId, 'Chat ID registered for low stock notifications.');

      // Run an initial check for low stock items
      await checkAndNotifyLowStock(bot);
    } catch (err) {
      console.error('Bot error:', err);
      bot.sendMessage(chatId, 'Error setting chat ID');
    }
  });

  // New command: /notification for automatic alerts
  bot.onText(/\/notification\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const provided = match[1];
    if (provided !== secret) {
      bot.sendMessage(chatId, 'Unauthorized');
      return;
    }
    try {
      // Store the chat ID in the database
      const [chatIdSetting] = await Setting.findOrCreate({
        where: { key: 'TELEGRAM_CHAT_ID' },
        defaults: { value: chatId.toString() }
      });
      chatIdSetting.value = chatId.toString();
      await chatIdSetting.save();

      // Also set it in the environment
      process.env.TELEGRAM_CHAT_ID = chatId.toString();

      bot.sendMessage(chatId, '✅ Your chat is now registered for automatic inventory notifications!');

      // Clear the notification hash to force a fresh notification
      lastNotificationHash = '';

      // Send a welcome message with current inventory status
      await checkAndNotifyLowStock(bot);

      // Inform about the user who registered
      console.log(`Chat ID ${chatId} registered for notifications by user ${msg.from.username || msg.from.first_name}`);
    } catch (err) {
      console.error('Bot error:', err);
      bot.sendMessage(chatId, 'Error registering for notifications');
    }
  });

  console.log('Telegram bot started');

  // Set up periodic check for low stock items
  setInterval(async () => {
    try {
      // Get the chat ID from environment or database
      let chatId = process.env.TELEGRAM_CHAT_ID;
      if (!chatId) {
        const chatIdSetting = await Setting.findOne({ where: { key: 'TELEGRAM_CHAT_ID' } });
        if (chatIdSetting) chatId = chatIdSetting.value;
      }

      if (!chatId) {
        console.log('Low stock monitoring disabled: missing chat ID');
        return;
      }

      // Perform inventory check
      await checkAndNotifyLowStock(bot);
    } catch (err) {
      console.error('Error in low stock monitoring:', err);
    }
  }, 10 * 1000); // Check every 10 seconds
}

async function checkAndNotifyLowStock(bot) {
  try {
    // Get the chat ID from environment or database
    let chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      const chatIdSetting = await Setting.findOne({ where: { key: 'TELEGRAM_CHAT_ID' } });
      if (chatIdSetting) chatId = chatIdSetting.value;
    }

    if (!chatId) {
      console.log('Low stock notification skipped: missing chat ID');
      return;
    }

    // Find items below minimum quantity
    const lowItems = await Inventory.findAll({
      where: { quantity: { [Op.lt]: sequelize.col('minQuantity') } },
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Generate notification hash based on low items data
    // This will be used to detect if anything has changed since last check
    let notificationHash = '';
    if (lowItems.length > 0) {
      notificationHash = lowItems.map(item => {
        return `${item.id}-${item.name}-${item.quantity}-${item.minQuantity}`;
      }).join('|');
    }

    // Only send notification if inventory status has changed
    if (notificationHash !== lastNotificationHash) {
      lastNotificationHash = notificationHash;

      if (lowItems.length === 0) {
        // If we previously had low items but now we don't, send an all-clear message
        if (notificationHash === '' && lastNotificationHash !== '') {
          bot.sendMessage(chatId, '✅ *All inventory items have been restocked*', { parse_mode: 'Markdown' });
        }
        return; // No low items, nothing to notify
      }

      let message = '🚨 *INVENTORY LOW STOCK ALERT* 🚨\n\n';

      // Group by category
      const consumables = lowItems.filter(item => item.category === 'consumable');
      const materials = lowItems.filter(item => item.category === 'material');

      if (consumables.length > 0) {
        message += '📦 *CONSUMABLES*:\n';
        consumables.forEach(item => {
          const percentRemaining = Math.round((item.quantity / item.minQuantity) * 100);
          message += `• *${item.name}*: ${item.quantity} of ${item.minQuantity} ${item.unit} (${percentRemaining}%)\n`;
        });
        message += '\n';
      }

      if (materials.length > 0) {
        message += '🔧 *MATERIALS*:\n';
        materials.forEach(item => {
          const percentRemaining = Math.round((item.quantity / item.minQuantity) * 100);
          message += `• *${item.name}*: ${item.quantity} of ${item.minQuantity} ${item.unit} (${percentRemaining}%)\n`;
        });
      }

      message += '\n📋 _Please restock these items as soon as possible_';
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      console.log('Low stock notification sent - inventory status changed');
    } else {
      console.log('Low stock notification skipped - no change in inventory status');
    }
  } catch (err) {
    console.error('Error checking low stock:', err);
  }
}

module.exports = { startBot, checkAndNotifyLowStock };
