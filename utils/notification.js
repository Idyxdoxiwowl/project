const nodemailer = require('nodemailer');
const axios = require('axios');

let transporter;
if (process.env.EMAIL_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465,
    auth: process.env.EMAIL_USER ? {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    } : undefined
  });
}

async function sendEmailNotification(to, subject, text) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text
    });
  } catch (err) {
    console.error('Email send error:', err);
  }
}

// Cache for preventing duplicate immediate notifications
let lastSentMessage = '';
let lastSentTime = 0;

async function sendTelegramNotification(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

  // If chat ID is not in env vars, try to get from database
  if (!chatId) {
    try {
      const Setting = require('../models/Setting');
      const chatIdSetting = await Setting.findOne({ where: { key: 'TELEGRAM_CHAT_ID' } });
      if (chatIdSetting) chatId = chatIdSetting.value;
    } catch (err) {
      console.error('Failed to get chat ID from database:', err.message);
    }
  }

  if (!token || !chatId) {
    console.log('Telegram notification not sent: missing token or chat ID');
    return;
  }

  // Check if this is a duplicate message within a short time period (30 seconds)
  const now = Date.now();
  if (message === lastSentMessage && now - lastSentTime < 30000) {
    console.log('Skipping duplicate Telegram notification');
    return;
  }

  // Update message cache
  lastSentMessage = message;
  lastSentTime = now;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await axios.post(url, { 
      chat_id: chatId, 
      text: message,
      parse_mode: 'Markdown'
    });
    console.log('Telegram notification sent successfully');
  } catch (err) {
    console.error('Telegram send error:', err.response ? err.response.data : err);
  }
}

module.exports = { sendEmailNotification, sendTelegramNotification };
