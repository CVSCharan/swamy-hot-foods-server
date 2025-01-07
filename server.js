require("dotenv").config();
const express = require("express");
const socketIo = require("socket.io"); // Importing socket.io
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const app = express();
const port = 3001;

// Use CORS to allow all origins (or specify frontend domain if required)
const allowedOrigins = [
  "http://localhost:3000",
  "http://10.0.2.2:3000",
  "http://10.0.2.2:3001",
  "https://swamy-hot-foods-client.vercel.app",
  "https://swamyshotfoods.shop",
  "https://www.swamyshotfoods.shop",
];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("Request Origin:", origin); // Debug log
      const allowedRegex = /^https:\/\/(www\.)?swamyshotfoods\.shop(:443)?$/;

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

// Create an HTTP server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Set up Socket.IO with the HTTP server
const io = socketIo(server, {
  cors: {
    origin: "*", // Allows all origins
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"], // Optional: You can allow specific headers
    credentials: true, // Optional: Allows credentials if necessary
  },
});

// Current shop and cooking status
let shopStatus = false; // Initial shop status
let cooking = false; // Initial cooking status
let holiday = false; // Initial holiday status
let noticeBoard = false; // Initial holiday status
let holidayTxt = "Enter Holiday Text..!"; // Initial holiday placeholder text
let noticeBoardTxt = "Enter Notice Board Text..!"; // Initial noticeBoard placeholder text

// Logging utility
const logStatusChange = (type, newValue) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type} toggled to: ${newValue}`);
};

// Function to determine shop message based on the current time and shop status
const getShopMessage = (shopStatus) => {
  // Convert server time to Indian Standard Time (IST)
  const now = new Date();
  const utcOffsetMinutes = now.getTimezoneOffset(); // Time difference from UTC in minutes
  const istOffsetMinutes = 330; // IST is UTC+5:30
  const istTime = new Date(
    now.getTime() + (istOffsetMinutes - utcOffsetMinutes) * 60 * 1000
  );

  const currentDay = istTime.getDay(); // 0 (Sunday) to 6 (Saturday)
  const currentHours = istTime.getHours();
  const currentMinutes = istTime.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes; // Current time in minutes for easier comparison

  // Define shop timings in IST
  const morningOpen = 5 * 60; // 5:00 AM
  const morningClose = 11 * 60 + 30; // 11:30 AM
  const eveningOpen = 16 * 60 + 30; // 4:30 PM
  const eveningClose = 21 * 60 + 30; // 9:30 PM

  // Define "closing soon" periods
  const morningClosingSoon = 10 * 60 + 45; // 10:45 AM
  const eveningClosingSoon = 20 * 60 + 45; // 8:45 PM

  let message = "";

  // Check for holidays
  if (currentDay === 0) {
    // Sunday: Show nothing
    return message; // Empty message
  }
  if (currentDay === 6 && currentTime > eveningClose) {
    // Saturday evening after shop closes: Show nothing
    return message; // Empty message
  }

  // Determine the message based on shopStatus and time
  if (shopStatus) {
    // Shop is open
    if (
      (currentTime >= morningClosingSoon && currentTime <= morningClose) ||
      (currentTime >= eveningClosingSoon && currentTime <= eveningClose)
    ) {
      message = "Closing soon..!";
    }
  } else {
    // Shop is closed
    if (currentTime > morningClose && currentTime < eveningOpen) {
      message = "Shop opens at 4:30 PM";
    } else if (
      (currentTime > eveningClose && currentTime < 24 * 60) ||
      (currentTime >= 0 && currentTime < morningOpen)
    ) {
      message = "Shop opens at 5:30 AM";
    }
  }

  return message; // Return the appropriate message
};

// Socket.IO connection logic
io.on("connection", (socket) => {
  console.log("New client connected");

  // Calculate the current shop status message
  const currentStatusMsg = getShopMessage(shopStatus);

  // Send the current statuses to the new client
  socket.emit("statusUpdate", {
    shopStatus,
    cooking,
    holiday,
    holidayTxt,
    noticeBoard,
    noticeBoardTxt,
    currentStatusMsg, // Send the current status message
  });

  // Listen for state changes from any client
  socket.on("statusChange", (data) => {
    if (data.shopStatus !== undefined) {
      shopStatus = data.shopStatus; // Update shop status
      logStatusChange("Shop Status", shopStatus);
    }

    if (data.cooking !== undefined) {
      cooking = data.cooking; // Update cooking status
      logStatusChange("Cooking Status", cooking);
    }

    if (data.holiday !== undefined) {
      holiday = data.holiday; // Update holiday status
      logStatusChange("Holiday", holiday);
    }

    if (data.holidayTxt !== undefined) {
      holidayTxt = data.holidayTxt; // Update holiday text
      logStatusChange("HolidayTxt", holidayTxt);
    }

    if (data.noticeBoard !== undefined) {
      noticeBoard = data.noticeBoard; // Update notice board status
      logStatusChange("NoticeBoard Status", noticeBoard);
    }

    if (data.noticeBoardTxt !== undefined) {
      noticeBoardTxt = data.noticeBoardTxt; // Update notice board text
      logStatusChange("NoticeBoard Text", noticeBoardTxt);
    }

    // Calculate the updated shop message
    const updatedStatusMsg = getShopMessage(shopStatus);

    // Broadcast the updated statuses and message to all connected clients
    io.emit("statusUpdate", {
      shopStatus,
      cooking,
      holiday,
      holidayTxt,
      noticeBoard,
      noticeBoardTxt,
      currentStatusMsg: updatedStatusMsg, // Include the updated status message
    });
  });

  // Handle disconnect event
  socket.on("disconnect", () => {
    console.log("Client disconnected");
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
      reviews: cachedReviews, // Return the cached reviews
      totalReviews: cachedTotalReviews, // Return the cached totalReviews (not relying on cachedReviews.length)
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
    cachedTotalReviews = totalReviews; // Cache the actual totalReviews value
    cachedRating = overallRating;
    lastFetchTime = currentTime;

    return res.status(200).json({
      reviews: cachedReviews,
      totalReviews: cachedTotalReviews, // Return the actual totalReviews value
      overallRating: overallRating,
    });
  } catch (error) {
    console.error("Error fetching Google reviews:", error.message);
    res.status(500).json({ message: "Failed to fetch reviews from Google." });
  }
});
