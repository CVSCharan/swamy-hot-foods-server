const menuService = require("../services/menuService");

// Get all menu items
const getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await menuService.getAllMenuItems();
    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single menu item by ID
const getMenuItemById = async (req, res) => {
  try {
    const menuItem = await menuService.getMenuItemById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    res.status(200).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new menu item
const createMenuItem = async (req, res) => {
  try {
    const newItem = await menuService.createMenuItem(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a menu item
const updateMenuItem = async (req, res) => {
  try {
    const updatedItem = await menuService.updateMenuItem(req.params.id, req.body);
    if (!updatedItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a menu item
const deleteMenuItem = async (req, res) => {
  try {
    const deletedItem = await menuService.deleteMenuItem(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    res.status(200).json({ message: "Menu item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};