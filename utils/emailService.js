// utils/emailService.js
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
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

    // Prefer Brevo HTTP API over SMTP to avoid blocked ports/timeouts on hosts
    const brevoApiKey = process.env.BREVO_API_KEY;
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

    // If API key present, use HTTPS API with 8s timeout
    if (brevoApiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
          },
          body: JSON.stringify({
            sender: { email: process.env.EMAIL_FROM || process.env.EMAIL_USER },
            to: [{ email }],
            subject: "Verify Your Email Address - Connvia",
            htmlContent: html,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("Brevo API error status:", resp.status, text?.slice(0, 200));
          // Fall through to SMTP fallback
        } else {
          return true;
        }
      } catch (e) {
        console.error("Brevo API request failed:", String(e).slice(0, 200));
        // Fall through to SMTP fallback
      }
    }

    // Fallback to SMTP (STARTTLS 587) with 8s timeout
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
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
    console.error("sendVerificationEmail failed:", String(error).slice(0, 200));
    return false;
  }
}

module.exports = { sendVerificationEmail };
