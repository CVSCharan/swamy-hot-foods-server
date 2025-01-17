const Menu = require("../models/Menu");

// Get all menu items
const getAllMenuItems = async () => {
  return await Menu.find();
};

// Get a single menu item by ID
const getMenuItemById = async (id) => {
  return await Menu.findById(id);
};

// Create a new menu item
const createMenuItem = async (menuData) => {
  return await Menu.create(menuData);
};

// Update a menu item
const updateMenuItem = async (id, updateData) => {
  return await Menu.findByIdAndUpdate(id, updateData, { new: true });
};

// Delete a menu item
const deleteMenuItem = async (id) => {
  return await Menu.findByIdAndDelete(id);
};

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};