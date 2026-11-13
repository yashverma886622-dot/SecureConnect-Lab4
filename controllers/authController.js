const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { eventBus } = require("../utils/eventBus");

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

async function signup(req, res, next) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(409).json({ message: "Email is already registered" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    eventBus.emit("user:registered", { userId: user._id.toString(), username: user.username, email: user.email });

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Email is already registered" });
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return res.status(401).json({ message: "Invalid email or password" });

    const token = createToken(user);
    eventBus.emit("user:logged-in", { userId: user._id.toString(), username: user.username });

    return res.json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { signup, login };
