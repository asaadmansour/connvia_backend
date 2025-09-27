// routes/auth.js
const express = require('express');
const router = express.Router();
const { login, register, verifyEmail, resendVerification } = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimit');
const { authenticateToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for venue owner logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/logos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with format ww-webp_format.webp
    const uniquePrefix = 'ww-';
    const fileExt = path.extname(file.originalname);
    cb(null, uniquePrefix + Date.now() + fileExt);
  }
});

const logoUpload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max file size
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

router.post('/login', loginLimiter, login);
router.post('/register', register);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/logout', authenticateToken, (req, res) => {
  // Since we're using JWT, we don't need to do anything server-side
  // The client will remove the token
  res.status(200).json({ message: "Logged out successfully" });
});

// Endpoint for uploading venue owner logos
router.post('/upload-logo', logoUpload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Return the filename to be stored in the database
    res.status(200).json({
      success: true,
      filename: req.file.filename,
      path: `/uploads/logos/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload logo'
    });
  }
});

module.exports = router;