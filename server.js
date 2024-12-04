const express = require("express");
const WebSocket = require("ws");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const app = express();
const port = 3001;

// Use CORS to allow all origins (or specify frontend domain if required)
app.use(
  cors({
    origin: "http://localhost:3000", // Adjust this to your frontend's URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Current shop and cooking status
let shopStatus = false; // Initial shop status
let cooking = false; // Initial cooking status

// Logging utility
const logStatusChange = (type, newValue) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type} toggled to: ${newValue}`);
};

// Set up WebSocket connection
wss.on("connection", (ws) => {
  // Send the current statuses to the new client
  ws.send(JSON.stringify({ shopStatus, cooking }));

  // Listen for state changes from any client
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.shopStatus !== undefined) {
      shopStatus = data.shopStatus; // Update shop status
      logStatusChange("Shop Status", shopStatus);

      // Broadcast the new shop status to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ shopStatus }));
        }
      });
    }

    if (data.cooking !== undefined) {
      cooking = data.cooking; // Update cooking status
      logStatusChange("Cooking Status", cooking);

      // Broadcast the new cooking status to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ cooking }));
        }
      });
    }
  });
});

// Configure multer to save the uploaded file with a fixed name 'logo.png'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // Folder where images are stored
  },
  filename: (req, file, cb) => {
    // Always use 'logo.png' as the filename to overwrite
    cb(null, "logo.png");
  },
});

const upload = multer({ storage });

// Upload route to handle logo uploads
app.post("/upload", upload.single("logo"), (req, res) => {
  if (!req.file) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Logo upload failed: No file uploaded.`);
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const filePath = `/uploads/logo.png`; // Fixed path for logo
  const timestamp = new Date().toISOString();
  console.info(`[${timestamp}] Logo successfully uploaded to: ${filePath}`);
  res.status(200).json({ success: true, filePath });
});

// Apply CORS middleware to static files as well
app.use("/uploads", cors(), express.static(path.join(__dirname, "uploads")));

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to Swamy Hot Foods Server");
});

// Set up HTTP server to handle WebSocket upgrades
app.server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
