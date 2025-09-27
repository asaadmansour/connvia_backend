// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware to authenticate JWT tokens and attach user data to request object
 */
const authenticateToken = (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('Auth middleware - No authorization header');
            return res.status(401).json({ 
                success: false,
                error: "Unauthorized: No authorization header provided" 
            });
        }

        // Check if the header format is correct
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            console.log('Auth middleware - Invalid authorization format');
            return res.status(401).json({ 
                success: false,
                error: "Unauthorized: Invalid authorization format" 
            });
        }

        const token = parts[1];
        if (!token) {
            console.log('Auth middleware - No token provided');
            return res.status(401).json({ 
                success: false,
                error: "Unauthorized: No token provided" 
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Auth middleware - Decoded token:', decoded);
        
        // Make sure we have the userId in the decoded token
        if (!decoded.userId) {
            console.log('Auth middleware - Token missing userId');
            return res.status(403).json({ 
                success: false,
                error: "Forbidden: Invalid token format" 
            });
        }
        
        // Attach the user data to the request object
        req.user = decoded;
        
        // Continue to the next middleware or route handler
        next();
    } catch (err) {
        console.log('Auth middleware - Token verification error:', err.message);
        return res.status(403).json({ 
            success: false,
            error: "Forbidden: Invalid token" 
        });
    }
};

/**
 * Utility function to verify a token without middleware
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.error('Token verification error:', err.message);
        return null;
    }
};

module.exports = { authenticateToken, verifyToken };
