require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const { authenticateSocket } = require("./middleware/socketAuth");
const { eventBus } = require("./utils/eventBus");

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Secure Connect API is running", status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "not connected"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

const io = new Server(server, {
  cors: { origin: allowedOrigin === "*" ? "*" : allowedOrigin }
});

// Socket.IO connection is also protected by JWT authentication.
io.use(authenticateSocket);

io.on("connection", (socket) => {
  const user = socket.user;
  console.log(`User connected: ${user.username} (${user.id})`);

  socket.on("join-room", (roomName) => {
    if (typeof roomName !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(roomName)) {
      socket.emit("chat-error", { message: "Invalid room name" });
      return;
    }
    socket.join(roomName);
    socket.emit("room-joined", { room: roomName });
    io.to(roomName).emit("system-message", {
      message: `${user.username} joined ${roomName}`,
      at: new Date().toISOString()
    });
    eventBus.emit("chat:room-joined", { userId: user.id, username: user.username, room: roomName });
  });

  socket.on("chat-message", (payload) => {
    const room = payload && payload.room;
    const message = payload && payload.message;

    if (typeof room !== "string" || typeof message !== "string" || !message.trim()) {
      socket.emit("chat-error", { message: "Room and message are required" });
      return;
    }
    if (message.length > 1000) {
      socket.emit("chat-error", { message: "Message cannot exceed 1000 characters" });
      return;
    }

    const chatMessage = {
      room,
      message: message.trim(),
      sender: { id: user.id, username: user.username },
      at: new Date().toISOString()
    };

    io.to(room).emit("new-message", chatMessage);
    eventBus.emit("chat:message-sent", chatMessage);
  });

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${user.username} (${reason})`);
    eventBus.emit("user:disconnected", { userId: user.id, username: user.username });
  });
});

// Demonstration of Node.js EventEmitter event-driven features.
eventBus.on("user:registered", (data) => {
  console.log(`[EVENT] New user registered: ${data.username} (${data.email})`);
});
eventBus.on("user:logged-in", (data) => {
  console.log(`[EVENT] User logged in: ${data.username}`);
});
eventBus.on("chat:room-joined", (data) => {
  console.log(`[EVENT] ${data.username} joined room ${data.room}`);
});
eventBus.on("chat:message-sent", (data) => {
  console.log(`[EVENT] ${data.sender.username} sent a message in ${data.room}`);
});
eventBus.on("user:disconnected", (data) => {
  console.log(`[EVENT] ${data.username} disconnected`);
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Copy .env.example to .env and add your MongoDB URI.");
    process.exit(1);
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    console.error("JWT_SECRET is missing or too short. Use a random secret of at least 24 characters.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
    server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
