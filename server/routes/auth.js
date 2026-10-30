const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const router = express.Router();

const isTransientDatabaseError = (error) =>
  /MongoNetworkError|MongoServerSelectionError|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|tlsv1 alert|SSL routines|socket hang up|connection.*closed/i.test(
    `${error?.name || ""} ${error?.code || ""} ${error?.message || ""}`
  );

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function findLoginUserWithRetry(email) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await User.findOne({ email });
    } catch (error) {
      if (attempt === 0 && isTransientDatabaseError(error)) {
        await wait(400);
        continue;
      }
      throw error;
    }
  }
  return null;
}

// Authentication middleware for protected account-management endpoints.
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "Server authentication is not configured." });
  }

  try {
    const decoded = jwt.verify(authHeader.slice("Bearer ".length), process.env.JWT_SECRET);
    if (!decoded.userId || !mongoose.isValidObjectId(decoded.userId)) {
      return res.status(401).json({ message: "Invalid login session. Please log in again." });
    }
    if (!(await User.exists({ _id: decoded.userId }))) {
      return res.status(401).json({ message: "Account not found. Please log in again." });
    }
    req.userId = decoded.userId;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }
}

// GET /api/auth/me - validate the JWT and return the current user
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "Server authentication is not configured" });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("name email");

    if (!user) {
      return res.status(401).json({ message: "Session is invalid. Please log in again." });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }
});

// PATCH /api/auth/profile - update the signed-in user's name and email.
router.patch("/profile", authenticateToken, async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    }
    if (email.length > 254 || !emailPattern.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const existingUser = await User.findOne({ email, _id: { $ne: req.userId } }).select("_id");
    if (existingUser) {
      return res.status(409).json({ message: "That email address is already used by another account." });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { name, email } },
      { new: true, runValidators: true }
    ).select("name email");

    if (!user) return res.status(404).json({ message: "Account not found." });

    return res.json({
      message: "Profile updated successfully.",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email address is already used by another account." });
    }
    console.error("Profile update error:", error.message);
    return res.status(500).json({ message: "Unable to update profile. Please try again." });
  }
});

// POST /api/auth/change-password - verify the existing password before updating it.
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (typeof currentPassword !== "string" || !currentPassword ||
        typeof newPassword !== "string" || !newPassword ||
        typeof confirmPassword !== "string" || !confirmPassword) {
      return res.status(400).json({ message: "Complete all password fields." });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ message: "The new password must be between 8 and 128 characters." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "The new passwords do not match." });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: "Choose a new password different from your current password." });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "Account not found." });

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) return res.status(400).json({ message: "Your current password is incorrect." });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Password change error:", error.message);
    return res.status(500).json({ message: "Unable to change password. Please try again." });
  }
});

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Account created successfully",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    console.error("Signup error:", error.message);
    return res.status(500).json({ message: "Unable to create account. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await findLoginUserWithRetry(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server authentication is not configured" });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error.name || "Error", error.code || "", error.message);
    if (isTransientDatabaseError(error) || mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "The database connection is temporarily unstable. Please try again in a few seconds.",
      });
    }
    return res.status(500).json({ message: "Unable to login. Please try again." });
  }
});

module.exports = router;
