# Inventory Management App
# Database Migration Guide

## SQLite Constraint Error Fix

If you encounter a `SequelizeUniqueConstraintError` with the message `id must be unique` when starting the application, this is due to SQLite's limited support for schema alterations.

### Quick Fix

Run the migration script which creates tables without using Sequelize's `alter: true` option:

```bash
npm run migrate
```

### Understanding the Issue

Sequelize's `sync({alter: true})` option attempts to modify tables by creating backup tables and copying data, which can fail with SQLite when there are constraints or when data structures change.

### Recommended Approach

1. For development: Use `sync()` without options or use the migration script
2. For schema changes: Create migration scripts instead of relying on `alter: true`
3. For production: Never use `force: true` as it drops tables

### If Problems Persist

If database issues continue:

1. Back up your data
2. Delete the SQLite database file
3. Run the migration script to recreate the database structure
4. Restore your data
## Account Hierarchy

- **Super Admin**: The first registered account is automatically given the `superAdmin` role. This user has full control over the system and can promote others from the admin panel.
- **Admin**: Users with the `admin` role have elevated permissions to manage inventory and view audit logs. After login they are automatically redirected to the `/admin` dashboard.
- **Engineer / Accountant**: Regular roles used for day‑to‑day work. Access to features is restricted to their area via role checks.

Engineers can view low stock items and export them to CSV from the Engineering section.
Accountants see a summary of inventory value and can download a CSV report from the Accounting section.

The registration page is only available for the very first sign up. After the
super admin is created, public registration is disabled and new accounts must be
added from **Admin → Users → New User**. When creating a user you can assign a
role (engineer, accountant or admin) or remove accounts entirely.
New accounts are created by the super admin at **Admin → Users → New User**. When creating a user you can assign a role for the account.
Existing accounts can be edited or removed from the same screen by the super admin.

Recent activity can be seen on the admin home page and the full audit history is available from the “Audit Logs” menu item.

## Role-Based Routes

| Role | Routes & Capabilities |
| ---- | -------------------- |
| **Super Admin** | All admin features plus user management via `/admin/users/*` and system settings at `/admin/settings`. |
| **Admin** | Access to `/admin` dashboard and statistics, manage inventory (`/admin/consumables`, `/admin/materials`, `/admin/inventory/*`), handle tickets at `/admin/tickets`, and view audit logs via `/admin/audit`. |
| **Engineer** | Manage inventory through `/inventory/*`, view low‑stock reports at `/engineering`, and export them as CSV from `/engineering/low-stock.csv`. |
| **Accountant** | View inventory value at `/accounting` and download a CSV report from `/accounting/report.csv`. |

## Feature Access Matrix

The table below lists the most common routes and whether each role can access
them. A check mark means the role can use the feature. Only admins are allowed
to delete inventory items.

| Feature / Route | Admin | Engineer | Accountant |
| --------------- | :---: | :------: | :--------: |
| View dashboard (`/dashboard`) | ✓ | ✓ | ✓ |
| Add/edit inventory (`/inventory/*`) | ✓ | ✓ | ✗ |
| Delete inventory (`/admin/inventory/delete/:id`) | ✓ | ✗ | ✗ |
| Restock inventory (`/inventory/restock/:id`) | ✓ | ✓ | ✗ |
| Low stock report (`/engineering`, CSV export) | ✓ | ✓ | ✗ |
| Inventory valuation (`/accounting`, CSV export) | ✓ | ✗ | ✓ |
| Tickets and audit logs (`/admin/tickets`, `/admin/audit`) | ✓ | ✗ | ✗ |
| User management (`/admin/users/*`) | ✓* | ✗ | ✗ |
| System settings (`/admin/settings`) | ✓* | ✗ | ✗ |

`✓*` indicates the action is limited to the super admin.

## Telegram Bot

If `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_SECRET` are configured (either as environment variables or from the settings page), a Telegram bot will start alongside the web server. The bot supports:

- `/low <secret>` – list inventory items that are below their minimum quantity.
- `/restock <secret> <itemId> <amount>` – increase the quantity of a specific inventory item.

Notifications about low stock are automatically sent to the configured Telegram chat when the `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` variables are set.

The Telegram bot token and secret can be updated from the admin panel via
**Admin → Settings**. Values saved here are stored in the database so they persist between restarts.
