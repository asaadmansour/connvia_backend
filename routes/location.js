// routes/location.js
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Get all governorates
router.get('/governorates', locationController.getAllGovernorates);

// Get districts by governorate ID
router.get('/districts/:governorateId', locationController.getDistrictsByGovernorate);

// Get all locations (governorates with districts)
router.get('/all', locationController.getAllLocations);

module.exports = router;
