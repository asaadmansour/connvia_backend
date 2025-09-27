// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const createUploadDirs = () => {
  const dirs = [
    './uploads',
    './uploads/venues',
    './uploads/events',
    './uploads/profiles'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Call function to create directories
createUploadDirs();

// Configure storage for venue images
const venueStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/venues');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for event images
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/events');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/profiles');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create upload middleware for venues
const uploadVenueImages = multer({
  storage: venueStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).fields([
  { name: 'images', maxCount: 10 }
]);

// Create upload middleware for events
const uploadEventImage = multer({
  storage: eventStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('image');

// Create upload middleware for profiles
const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
}).single('profileImage');

module.exports = {
  uploadVenueImages,
  uploadEventImage,
  uploadProfileImage
};
