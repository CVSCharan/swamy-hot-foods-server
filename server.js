require("dotenv").config();
const express = require("express");
const WebSocket = require("ws");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const app = express();
const port = 3001;

// Use CORS to allow all origins (or specify frontend domain if required)
const allowedOrigins = [
  "http://localhost:3000", // Local development URL
  "https://swamy-hot-foods-client.vercel.app", // Production frontend URL
  "https://www.swamyshotfoods.shop", // Custom domain with `www`
  "https://swamyshotfoods.shop", // Custom domain without `www`
  "https://api.swamyshotfoods.shop",
];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("Request Origin:", origin); // Debug log
      const allowedRegex = /^https:\/\/(www\.)?swamyshotfoods\.shop$/;

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedRegex.test(origin)
      ) {
        callback(null, true);
      } else {
        console.error("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
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

// Poling the server for activeness
app.get("/api/ping", (req, res) => {
  console.info("Server is alive!");
  res.status(200).send("Server is alive!");
});

// Set up HTTP server to handle WebSocket upgrades
app.server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.server.on("upgrade", (request, socket, head) => {
  const origin = request.headers.origin;

  // Check if the origin is allowed
  const allowedOriginsRegex = /^https:\/\/(www\.)?swamyshotfoods\.shop$/; // Regex for allowed domains

  if (allowedOriginsRegex.test(origin) || allowedOrigins.includes(origin)) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy(); // Reject connection if the origin is not allowed
  }
});

const axios = require("axios");

// Google Places API key (make sure this is kept secure in .env file)
const API_KEY = process.env.GOOGLE_API_KEY;

// Google Place ID (replace with your actual Place ID)
const PLACE_ID = "ChIJmYN2XqONTDoR_zgIHSRpnfI";

// Route to get Google reviews
let cachedReviews = [];
let lastFetchTime = null;
let cachedRating = null; // Store the overall rating

const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

app.get("/api/google-reviews", async (req, res) => {
  const currentTime = new Date().getTime();

  // Check if cache is still valid (less than 10 minutes old)
  if (lastFetchTime && currentTime - lastFetchTime < CACHE_EXPIRY_TIME) {
    return res.status(200).json({
      reviews: cachedReviews,
      totalReviews: cachedReviews.length,
      overallRating: cachedRating,
    });
  }

  try {
    // Fetch data from Google Places API
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&key=${API_KEY}`
    );

    const reviews = response.data.result.reviews || [];
    const totalReviews = response.data.result.user_ratings_total || 0;
    const overallRating = response.data.result.rating || 0;

    // Ensure a minimum of 20 reviews (fetching more if possible)
    cachedReviews = reviews.length >= 20 ? reviews.slice(0, 20) : reviews;
    cachedRating = overallRating;
    lastFetchTime = currentTime;

    return res.status(200).json({
      reviews: cachedReviews,
      totalReviews: totalReviews,
      overallRating: overallRating,
    });
  } catch (error) {
    console.error("Error fetching Google reviews:", error.message);
    res.status(500).json({ message: "Failed to fetch reviews from Google." });
  }
});
