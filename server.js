const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // Allow connections from your React Native app

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your React Native app URL if needed
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Set();
const userSocketMap = new Map();

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("setUserId", (userId) => {
    onlineUsers.add(userId);
    userSocketMap.set(socket.id, userId);
    io.emit("userConnected", { userId }); // Notify all clients
  });

  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    const disconnectedUserId = userSocketMap.get(socket.id);
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      userSocketMap.delete(socket.id);
      io.emit("userDisconnected", { userId: disconnectedUserId }); // Notify all clients
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Socket.io server running on port 3001");
});
