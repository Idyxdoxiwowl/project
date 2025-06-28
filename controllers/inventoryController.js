const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const { sendEmailNotification, sendTelegramNotification } = require('../utils/notification');

async function notifyIfLow(item, user) {
  if (!item.isLow()) return;
  const msg = `Inventory ${item.name} is below minimum quantity (${item.quantity}/${item.minQuantity})`;
  await sendEmailNotification(process.env.NOTIFY_EMAIL || user.email, 'Low Stock Alert', msg);
  await sendTelegramNotification(msg);
}

async function createItem(data, user) {
  const item = await Inventory.create({
    ...data,
    updatedById: user.id
  });
  await notifyIfLow(item, user);
  await AuditLog.create({
    userId: user.id,
    action: 'inventory_add',
    details: { itemId: item.id }
  });
  return item;
}

async function updateItem(id, data, user) {
  await Inventory.update({
    ...data,
    lastUpdated: new Date(),
    updatedById: user.id
  }, { where: { id } });
  const updatedItem = await Inventory.findByPk(id);
  if (!updatedItem) throw new Error('Inventory item not found');
  await notifyIfLow(updatedItem, user);
  await AuditLog.create({
    userId: user.id,
    action: 'inventory_edit',
    details: { itemId: id }
  });
  return updatedItem;
}

async function deleteItem(id, user) {
  const item = await Inventory.findByPk(id);
  if (!item) throw new Error('Inventory item not found');
  await item.destroy();
  await AuditLog.create({
    userId: user.id,
    action: 'inventory_delete',
    details: { itemId: id }
  });
  return item;
}

async function restockItem(id, additionalQuantity, user) {
  const item = await Inventory.findByPk(id);
  if (!item) throw new Error('Inventory item not found');
  const newQuantity = parseInt(item.quantity) + parseInt(additionalQuantity);
  await Inventory.update({
    quantity: newQuantity,
    lastUpdated: new Date(),
    updatedById: user.id
  }, { where: { id } });
  const updated = await Inventory.findByPk(id);
  await notifyIfLow(updated, user);
  await AuditLog.create({
    userId: user.id,
    action: 'inventory_restock',
    details: { itemId: id, amount: additionalQuantity }
  });
  return updated;
}

module.exports = { createItem, updateItem, deleteItem, restockItem };
