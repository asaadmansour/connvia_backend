// middleware/rateLimit.js
const rateLimit = require("express-rate-limit");

const globalLimiter = rateLimit({
  windowMs: 115 * 60 * 1000, // 15 minutes
  max: 1001, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});

// Check if we're in development mode to set appropriate limits
const isProduction = process.env.NODE_ENV === 'production';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5 : 100, // Higher limit for development
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts. Please try again later.",
  keyGenerator: (req) => {
    //use this if behind a proxy
    return req.ip;
  },
});

module.exports = { globalLimiter, loginLimiter };
