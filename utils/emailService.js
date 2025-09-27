// utils/emailService.js
const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} verificationToken - Verification token
 * @returns {Promise<boolean>} - Success status
 */
async function sendVerificationEmail(email, name, verificationToken) {
  try {
    // Create verification URL (ensure no double slashes)
    const baseUrl =
      process.env.FRONTEND_URL?.replace(/\/$/, "") ||
      "https://connvia-production.up.railway.app";
    const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;

    // Log the verification URL (for debugging purposes)
    console.log(`Verification URL for ${email}: ${verificationUrl}`);

    // Create a transporter with timeout settings
    const transporter = nodemailer.createTransport({
      service: "gmail", // or your preferred email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Add timeout settings to prevent hanging
      connectionTimeout: 15000, // 15 seconds
      greetingTimeout: 15000, // 15 seconds
      socketTimeout: 15000, // 15 seconds
      // Add retry settings
      pool: false, // Don't use pool for single emails
      maxConnections: 1,
      maxMessages: 1,
      rateLimit: 5, // max 5 emails per second
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email Address - Connvia",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering with Connvia. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can also click on the link below or copy it to your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
          <p>Best regards,<br>The Connvia Team</p>
        </div>
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
}

module.exports = { sendVerificationEmail };
