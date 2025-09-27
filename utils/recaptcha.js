// utils/recaptcha.js
const fetch = require('node-fetch');
require('dotenv').config();

async function verifyRecaptcha(token) {
    // For development/testing purposes only
    const isDevelopmentMode = process.env.NODE_ENV === 'development';
    if (isDevelopmentMode) {
        console.log('Development mode: reCAPTCHA verification bypassed');
        return true;
    }
    
    try {
        const response = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
            }
        );

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error("reCAPTCHA verification error:", error);
        return false;
    }
}

module.exports = { verifyRecaptcha };
