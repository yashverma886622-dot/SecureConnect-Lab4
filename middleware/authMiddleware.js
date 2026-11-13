const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "No token provided. Use Authorization: Bearer <token>" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("_id username email role");

    if (!user) return res.status(401).json({ message: "User no longer exists" });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

module.exports = { protect, allowRoles };
