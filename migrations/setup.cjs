/**
 * Safe database migration script
 * Run this with: node migrations/setup.js
 */

const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function createTablesIfNotExist() {
  try {
    const transaction = await sequelize.transaction();

    try {
      // Check if Users table exists
      const tables = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Users';",
        { type: QueryTypes.SELECT, transaction }
      );

      if (tables.length === 0) {
        console.log('Creating Users table...');
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(255) NOT NULL DEFAULT 'engineer' CHECK (role IN ('admin', 'engineer', 'accountant', 'superAdmin')),
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `, { transaction });
      } else {
        console.log('Users table already exists, checking for required columns...');

        // Check for columns and add them if missing
        const columns = await sequelize.query(
          "PRAGMA table_info(Users);",
          { type: QueryTypes.SELECT, transaction }
        );

        const columnNames = columns.map(col => col.name);

        if (!columnNames.includes('role')) {
          console.log('Adding role column to Users...');
          await sequelize.query(
            "ALTER TABLE Users ADD COLUMN role VARCHAR(255) NOT NULL DEFAULT 'engineer';",
            { transaction }
          );
        }

        const hasIsAdmin = columnNames.includes('isAdmin');
        const hasIsSuperAdmin = columnNames.includes('isSuperAdmin');

        if (hasIsAdmin || hasIsSuperAdmin) {
          console.log('Migrating legacy admin columns to role field...');

          const users = await sequelize.query(
            'SELECT id, role, ' + (hasIsAdmin ? 'isAdmin' : '0 as isAdmin') + ', ' + (hasIsSuperAdmin ? 'isSuperAdmin' : '0 as isSuperAdmin') + ' FROM Users;',
            { type: QueryTypes.SELECT, transaction }
          );

          for (const user of users) {
            let newRole = user.role;
            if (user.isSuperAdmin) newRole = 'superAdmin';
            else if (user.isAdmin) newRole = 'admin';

            if (newRole !== user.role) {
              await sequelize.query(
                'UPDATE Users SET role = :role WHERE id = :id;',
                { replacements: { role: newRole, id: user.id }, transaction }
              );
            }
          }

          if (hasIsAdmin) {
            await sequelize.query('ALTER TABLE Users DROP COLUMN isAdmin;', { transaction });
          }

          if (hasIsSuperAdmin) {
            await sequelize.query('ALTER TABLE Users DROP COLUMN isSuperAdmin;', { transaction });
          }
        }
      }

      // Create other tables as needed
      // Inventory table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS Inventories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
          minQuantity INTEGER NOT NULL DEFAULT 10,
          location VARCHAR(255),
          description TEXT,
          lastUpdated DATETIME,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });

      // Settings table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS Settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key VARCHAR(255) NOT NULL UNIQUE,
          value TEXT,
          description TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `, { transaction });

      await transaction.commit();
      console.log('Database setup completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Error during database setup:', error);
    }
  } catch (error) {
    console.error('Failed to initialize transaction:', error);
  } finally {
    await sequelize.close();
  }
}

await sequelize.query(`
  INSERT OR REPLACE INTO Settings (key, value, description)
  VALUES (
    'telegramBotToken',
    '7882857468:AAH-9vZjeqXhsCbTCH3f31_0G-U4uz0T9WY',
    'Telegram bot token for automatic task messaging'
  );
`, { transaction });


// Run the migration
createTablesIfNotExist();
