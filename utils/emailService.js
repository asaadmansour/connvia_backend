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

    const html = `
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
    `;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL — required for port 465, works better on Railway
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email Address - Connvia",
      html,
    };

    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("SMTP send timeout (8s)")), 8000);
      transporter.sendMail(mailOptions, (err) => {
        clearTimeout(to);
        if (err) return reject(err);
        resolve();
      });
    });

    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

module.exports = { sendVerificationEmail };
