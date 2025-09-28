const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const { globalLimiter } = require("./middleware/rateLimit");
const { authenticateToken } = require("./middleware/authMiddleware");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();

// Trust the Railway/Upstream proxy so req.ip and rate limiters work correctly
app.set("trust proxy", 1);

// Import routes
const authRoutes = require("./routes/auth");
const venueRoutes = require("./routes/venue");
const categoryRoutes = require("./routes/category");
const reservationRoutes = require("./routes/reservation");
const stripeRoutes = require("./routes/stripe");
const paymentRoutes = require("./routes/payment");
const eventRoutes = require("./routes/event");
const dashboardRoutes = require("./routes/dashboard");
const locationRoutes = require("./routes/location");
const attendeeRoutes = require("./routes/attendee");
const notificationRoutes = require("./routes/notification");

// CORS Configuration
app.use(cors());

// Stripe webhook needs raw body, so we need to handle it before JSON parsing
// This route needs to be defined before the express.json() middleware
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  require("./controllers/stripeController").handleWebhook
);

// Apply other middleware for all other routes
app.use(express.json());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
); // Use Helmet for security headers
app.use(globalLimiter); // Apply global rate limiter

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure the logos directory exists
const logosDir = path.join(__dirname, "uploads/logos");
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Log the static file paths
console.log("Serving static files from:", path.join(__dirname, "uploads"));
console.log("Logos directory:", logosDir);

// Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Backend is running" });
});

// Root route
app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to ConnVia API", status: "OK" });
});

// Use routes
app.use("/api/auth", authRoutes); // Mount the auth routes at /api/auth
app.use("/api/venues", venueRoutes); // Mount the venue routes at /api/venues
app.use("/api/category", categoryRoutes); // Mount the category routes at /api/category
app.use("/api/reservations", reservationRoutes); // Mount the reservation routes at /api/reservations
app.use("/api/stripe", stripeRoutes); // Mount the stripe routes at /api/stripe
app.use("/api/payment", paymentRoutes); // Mount the payment routes at /api/payment
app.use("/api/events", eventRoutes); // Mount the event routes at /api/events
app.use("/api/dashboard", dashboardRoutes); // Mount the dashboard routes at /api/dashboard
app.use("/api/locations", locationRoutes); // Mount the location routes at /api/locations
app.use("/api/attendee", attendeeRoutes); // Mount the attendee routes at /api/attendee
app.use("/api/notifications", notificationRoutes); // Mount the notification routes at /api/notifications

// Token verification endpoint
app.get("/api/auth/verify-token", authenticateToken, (req, res) => {
  res.status(200).json({
    isValid: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      userType: req.user.userType,
    },
  });
});

// Protected Dashboard Route (Example)
app.get("/api/dashboard", authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await require("./config/db").getConnection();
    const [results] = await connection.query(
      "SELECT id, email, name, created_at FROM user WHERE id = ?",
      [req.user.userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      user: results[0],
      message: `Welcome, ${results[0].name || results[0].email}!`,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Logout Route (optional but recommended)
app.post(
  "/api/logout",
  require("./middleware/authMiddleware").authenticateToken,
  (req, res) => {
    res.status(200).json({ message: "Logout successful" });
  }
);

// ✅ TEST DB CONNECTION ROUTE
app.get("/api/test-db", async (req, res) => {
  const { getConnection } = require("./config/db");
  try {
    const conn = await getConnection();
    const [rows] = await conn.query("SELECT 1 + 1 AS result");
    conn.release();
    res.json({ success: true, result: rows[0].result });
  } catch (err) {
    console.error("DB Test Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Handle 404 Errors
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
