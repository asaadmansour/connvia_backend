const { pool } = require('../config/db');

/**
 * Get all categories
 */
exports.getAllCategories = async (req, res) => {
  try {
    console.log('Fetching all categories...');
    const query = 'SELECT category_ID, name, age_range, description, img_url FROM category';
    
    const [results] = await pool.query(query);
    console.log('Categories fetched:', results);
    
    return res.status(200).json({
      success: true,
      data: {
        categories: results
      }
    });
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get subcategories by category ID
 */
exports.getSubcategoriesByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    if (!categoryId) {
      return res.status(400).json({ success: false, error: 'Category ID is required' });
    }
    
    console.log(`Fetching subcategories for category ID: ${categoryId}`);
    const query = 'SELECT subcategory_id, category_id, name, description, img_url, age_range FROM subcategories WHERE category_id = ?';
    
    const [results] = await pool.query(query, [categoryId]);
    console.log('Subcategories fetched:', results);
    
    return res.status(200).json({
      success: true,
      data: {
        subcategories: results
      }
    });
  } catch (error) {
    console.error('Error in getSubcategoriesByCategoryId:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Get all subcategories
 */
exports.getAllSubcategories = async (req, res) => {
  try {
    console.log('Fetching all subcategories...');
    const query = `
      SELECT s.subcategory_id, s.category_id, s.name, s.description, s.img_url, s.age_range, 
             c.name as category_name
      FROM subcategories s
      JOIN category c ON s.category_id = c.category_ID
    `;
    
    const [results] = await pool.query(query);
    console.log('All subcategories fetched:', results);
    
    return res.status(200).json({
      success: true,
      data: {
        subcategories: results
      }
    });
  } catch (error) {
    console.error('Error in getAllSubcategories:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
