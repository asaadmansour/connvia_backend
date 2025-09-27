const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Get all categories
router.get('/categories', categoryController.getAllCategories);

// Get subcategories by category ID
router.get('/subcategories/:categoryId', categoryController.getSubcategoriesByCategoryId);

// Get all subcategories
router.get('/subcategories', categoryController.getAllSubcategories);

module.exports = router;
