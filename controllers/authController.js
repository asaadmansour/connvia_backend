// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { verifyRecaptcha } = require("../utils/recaptcha");
const { getConnection } = require("../config/db"); // Import getConnection
const { sendVerificationEmail } = require("../utils/emailService");
require("dotenv").config();

// Track login attempts by email (consider using a more robust store like Redis)
// IMPORTANT:  This is IN-MEMORY ONLY.  Will reset on server restart.
const loginAttempts = {};

async function register(req, res) {
  const {
    name,
    email,
    password,
    phoneNumber,
    userType,
    recaptchaToken,
    // Role-specific fields
    businessName,
    website,
    businessType,
    venueName,
    taxNumber,
    logo,
    // Attendee fields
    interests,
    locationPreferences,
    selectedInterests,
    selectedLocations,
    // Other fields
    city,
    gender,
    dateOfBirth,
    organizationType,
    organizerDesc,
  } = req.body;

  // Validate required fields
  if (!name || !email || !password || !phoneNumber || !userType) {
    return res
      .status(400)
      .json({ error: "All required fields must be provided" });
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate password strength
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters long" });
  }

  // Verify reCAPTCHA
  if (!recaptchaToken) {
    return res.status(400).json({
      error: "Please complete the reCAPTCHA verification",
      requireRecaptcha: true,
    });
  }

  const recaptchaValid = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaValid) {
    return res.status(400).json({
      error: "reCAPTCHA verification failed",
      requireRecaptcha: true,
    });
  }

  let connection;
  try {
    connection = await getConnection();

    // Check if user already exists
    const [existingUsers] = await connection.query(
      "SELECT user_ID FROM `user` WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token valid for 24 hours

    // Map user type from frontend to database enum values
    let dbUserType;
    switch (userType) {
      case "eventCreator":
      case "organizer":
        dbUserType = "organizer";
        break;
      case "vendor":
        dbUserType = "vendor";
        break;
      case "admin":
        dbUserType = "admin";
        break;
      case "attendee":
        dbUserType = "regular";
        break;
      case "venueOwner":
        dbUserType = "venue"; // Venue owners are their own type
        break;
      default:
        dbUserType = "regular";
    }

    // Begin transaction
    await connection.beginTransaction();

    // Insert user
    const [result] = await connection.query(
      `INSERT INTO \`user\` (name, email, password, phone, user_type, verification_token, token_expiry, is_verified, 
        city, gender, date_of_birth, date_joined, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Active')`,
      [
        name,
        email,
        hashedPassword,
        phoneNumber || null,
        dbUserType,
        verificationToken,
        tokenExpiry,
        false,
        city || null,
        gender || null,
        dateOfBirth || null,
      ]
    );

    const userId = result.insertId;

    // Insert role-specific information based on user type
    if (dbUserType === "organizer" && businessName) {
      await connection.query(
        `INSERT INTO \`organizer\` (user_ID, company_name, organization_type, organizer_desc) 
         VALUES (?, ?, ?, ?)`,
        [userId, businessName, organizationType || null, organizerDesc || null]
      );
    } else if (dbUserType === "vendor" && businessType) {
      await connection.query(
        `INSERT INTO \`vendor\` (user_ID, vendor_name, vendor_type, website) 
         VALUES (?, ?, ?, ?)`,
        [userId, businessName || null, businessType, website || null]
      );
    } else if (dbUserType === "venue" && venueName) {
      // Insert into venue_owner table
      await connection.query(
        `INSERT INTO \`venue_owner\` (name, tax_number, logo, user_ID) 
         VALUES (?, ?, ?, ?)`,
        [venueName, taxNumber || null, logo || null, userId]
      );
    } else if (dbUserType === "regular") {
      // Process interests and locations data
      let interestsData = interests || null;
      let locationsData = locationPreferences || null;

      // Store JSON data if available
      if (
        selectedInterests &&
        Array.isArray(selectedInterests) &&
        selectedInterests.length > 0
      ) {
        interestsData = JSON.stringify(selectedInterests);
      }

      if (
        selectedLocations &&
        Array.isArray(selectedLocations) &&
        selectedLocations.length > 0
      ) {
        locationsData = JSON.stringify(selectedLocations);
      }

      // Insert into attendee table
      await connection.query(
        `INSERT INTO \`attendee\` (user_ID, interests, location_preferences, created_at, updated_at) 
         VALUES (?, ?, ?, NOW(), NOW())`,
        [userId, interestsData, locationsData]
      );
    }

    // Commit transaction
    await connection.commit();

    // Send verification email
    const emailSent = await sendVerificationEmail(
      email,
      name,
      verificationToken
    );

    if (emailSent) {
      res.status(201).json({
        message:
          "Registration successful! Please check your email to verify your account.",
      });
    } else {
      // If email sending fails, still create the user but inform them
      res.status(201).json({
        message:
          "Registration successful but verification email could not be sent. Please contact support.",
      });
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function verifyEmail(req, res) {
  const { token } = req.params;
  console.log("Verification attempt with token:", token);

  if (!token) {
    console.log("No token provided");
    return res.status(400).json({ error: "Verification token is required" });
  }

  let connection;
  try {
    connection = await getConnection();
    console.log("Database connection established for verification");

    // First check if the token exists at all (regardless of verification status)
    const [allUsers] = await connection.query(
      "SELECT user_ID, email, is_verified, token_expiry FROM `user` WHERE verification_token = ?",
      [token]
    );

    console.log("Users found with this token:", allUsers.length);

    if (allUsers.length === 0) {
      console.log("No users found with token:", token);

      // Check if this email was already verified (token might have been used already)
      // We can't check by token since it would have been nullified after verification
      // Instead, we'll return a more user-friendly message
      return res.status(200).json({
        message:
          "If you've already verified your email, you can now log in. Otherwise, please request a new verification link.",
      });
    }

    // If user is already verified
    if (allUsers[0].is_verified === 1) {
      console.log("User already verified:", allUsers[0].email);
      return res
        .status(200)
        .json({ message: "Email already verified. You can now log in." });
    }

    // Now find unverified users with this token
    const [users] = await connection.query(
      "SELECT user_ID, email, token_expiry FROM `user` WHERE verification_token = ? AND is_verified = 0",
      [token]
    );

    console.log("Unverified users found with this token:", users.length);

    if (users.length === 0) {
      console.log("No unverified users found with token:", token);
      // This means the token exists but user is already verified
      return res
        .status(200)
        .json({ message: "Email already verified. You can now log in." });
    }

    const user = users[0];
    console.log("User found for verification:", user.email);

    // Check if token has expired
    const tokenExpiry = new Date(user.token_expiry);
    console.log("Token expiry:", tokenExpiry, "Current time:", new Date());

    if (tokenExpiry < new Date()) {
      console.log("Token expired for user:", user.email);
      return res.status(400).json({ error: "Verification token has expired" });
    }

    // Update user to verified
    await connection.query(
      "UPDATE `user` SET is_verified = 1, verification_token = NULL, token_expiry = NULL WHERE user_ID = ?",
      [user.user_ID]
    );
    console.log("User verified successfully:", user.email);

    res
      .status(200)
      .json({ message: "Email verified successfully! You can now log in." });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function resendVerification(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  let connection;
  try {
    connection = await getConnection();

    // Find user by email
    const [users] = await connection.query(
      "SELECT user_ID, name, is_verified FROM `user` WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      // Don't reveal that the email doesn't exist
      return res.status(200).json({
        message:
          "If your email exists in our system, a verification link has been sent.",
      });
    }

    const user = users[0];

    // Check if already verified
    if (user.is_verified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token valid for 24 hours

    // Update user with new token
    await connection.query(
      "UPDATE `user` SET verification_token = ?, token_expiry = ? WHERE user_ID = ?",
      [verificationToken, tokenExpiry, user.user_ID]
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(
      email,
      user.name,
      verificationToken
    );

    if (emailSent) {
      res.status(200).json({
        message: "Verification email has been resent. Please check your inbox.",
      });
    } else {
      res.status(500).json({
        error: "Failed to send verification email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function login(req, res) {
  const { email, password, recaptchaToken } = req.body;
  console.log("Login attempt for:", email);

  // Validate required fields
  if (!email || !password) {
    console.log("Missing email or password");
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Skip reCAPTCHA in development mode
  const isDevelopment = process.env.NODE_ENV === "development";
  if (!isDevelopment && !recaptchaToken) {
    console.log("Missing recaptcha token");
    return res.status(400).json({
      error: "Please complete the reCAPTCHA verification",
      requireRecaptcha: true,
    });
  }

  // Verify reCAPTCHA first (skip in development)
  let recaptchaValid = true;
  if (!isDevelopment && recaptchaToken) {
    recaptchaValid = await verifyRecaptcha(recaptchaToken);
    console.log("reCAPTCHA validation result:", recaptchaValid);
  }

  if (!isDevelopment && !recaptchaValid) {
    return res.status(400).json({
      error: "reCAPTCHA verification failed",
      requireRecaptcha: true,
    });
  }

  let connection;
  try {
    connection = await getConnection();
    console.log("Database connection established");

    const [results] = await connection.query(
      "SELECT * FROM `user` WHERE email = ?",
      [email]
    );
    console.log("User query results count:", results.length);

    if (results.length === 0) {
      console.log("No user found with email:", email);
      return res.status(401).json({
        error: "Invalid email or password",
        requireRecaptcha: !isDevelopment,
      });
    }

    const user = results[0];
    console.log("User found:", user.user_ID, user.email);

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", passwordMatch);

    if (!passwordMatch) {
      console.log("Password doesn't match for user:", email);
      return res.status(401).json({
        error: "Invalid email or password",
        requireRecaptcha: !isDevelopment,
      });
    }

    // Check if email is verified
    if (!user.is_verified) {
      console.log("User email not verified:", email);
      return res.status(401).json({
        error: "Please verify your email before logging in",
        emailNotVerified: true,
      });
    }

    const token = jwt.sign(
      {
        userId: user.user_ID,
        email: user.email,
        userType: user.user_type,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    console.log("JWT token generated for user:", email);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.user_ID,
        email: user.email,
        name: user.name,
        userType: user.user_type,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { login, register, verifyEmail, resendVerification };
