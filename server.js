const express = require("express");
const WebSocket = require("ws");
const app = express();
const port = 3001;

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Current shop status
let shopStatus = false; // Initial status

// Set up WebSocket connection
wss.on("connection", (ws) => {
  // Send the current status to the new client
  ws.send(JSON.stringify({ shopStatus }));

  // Listen for status changes from any client
  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.shopStatus !== undefined) {
      shopStatus = data.shopStatus; // Update the status
      // Broadcast the new status to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ shopStatus }));
        }
      });
    }
  });
});

app.get("/", (req, res) => {
  res.send("Welcome to Swamy Hot Foods Server");
});

// Set up HTTP server to handle WebSocket upgrades
app.server = app.listen(3001, () => {
  console.log(`Server is running on port ${port}`);
});

app.server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
