const mysql = require("mysql2/promise");
require("dotenv").config(); // Load environment variables if not already loaded

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function getConnection() {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error("Database connection error:", error);
    throw new Error("Failed to connect to the database."); // Re-throw for handling
  }
}

module.exports = { pool, getConnection };
