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

    // Explicitly configure the transporter to use port 587 to avoid hosting provider blocks
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false, // Brevo uses STARTTLS on port 587
      auth: {
        user: process.env.EMAIL_USER, // e.g., 9808cc001@smtp-brevo.com
        pass: process.env.EMAIL_PASS, // your master password
      },
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

    // Send email with a manual timeout to prevent hanging
    console.log("Attempting to send email...");
    const sendMailPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Email sending timed out after 20 seconds"));
      }, 20000); // 20-second timeout

      transporter.sendMail(mailOptions, (error, info) => {
        clearTimeout(timeout);
        if (error) {
          return reject(error);
        }
        resolve(info);
      });
    });

    const info = await sendMailPromise;
    console.log("Email sent successfully: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
}

module.exports = { sendVerificationEmail };
