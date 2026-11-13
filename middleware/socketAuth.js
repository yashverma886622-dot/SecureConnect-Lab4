const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authenticateSocket(socket, next) {
  try {
    // Client sends: io(url, { auth: { token: "JWT_HERE" } })
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("_id username email role");
    if (!user) return next(new Error("User not found"));

    socket.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    };
    next();
  } catch (error) {
    next(new Error("Invalid or expired socket token"));
  }
}

module.exports = { authenticateSocket };
