const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true }, // Price of the menu item
    desc: { type: String, required: true }, // Description of the menu item
    quant: { type: Number, required: true }, // Quantity available
    imgSrc: { type: String, required: true }, // Image URL for the menu item
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Menu", menuSchema);
