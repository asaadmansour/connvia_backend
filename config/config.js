// config/config.js
module.exports = {
  // Base URL for the application
  baseUrl:
    process.env.RAILWAY_STATIC_URL ||
    "https://connviabackend-production.up.railway.app",

  // Database configuration is already handled in db.js

  // Add any other configuration settings here
};
