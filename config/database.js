const { Sequelize } = require('sequelize');
const path = require('path');

const storagePath = process.env.DB_STORAGE || path.join(__dirname, '../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: false
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('SQLite database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

// Initialize connection
testConnection();

module.exports = sequelize;
