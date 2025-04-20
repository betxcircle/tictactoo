const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const OdinCircledbModel = require("./models/odincircledb");
const BetModel = require("./models/BetModel");
const WinnerModel = require("./models/WinnerModel");
const LoserModel = require("./models/LoserModel");

require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);
// const { v4: uuidv4 } = require('uuid'); // Import UUID for unique room IDs


// MongoDB Connection
const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.kbgr5.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`;

mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const activeRooms = {};

  io.on('connection', (socket) => {
    console.log('A user connectedssss:', socket.id);
  
 socket.on('joinRoom', async ({ playerName, roomId, userId, amount, expoPushToken }) => {
  console.log(`🎮 Player "${playerName}" (ID: ${userId}) is trying to join Room "${roomId}" with Bet: ${amount}`);

  // 🔎 Validate required fields
  if (!playerName || !userId || !roomId || !amount) {
    console.log("❌ Missing required fields");
    return socket.emit('invalidJoin', 'Player name, userId, roomId, and amount are required');
  }

  // 🔧 Check if the room already exists
  let room = activeRooms[roomId];

  if (!room) {
    // 🆕 Create a new room
    room = {
      roomId,
      players: [],
      board: Array(9).fill(null),
      currentPlayer: 0,
      startingPlayer: 0,
      amount, // Bet amount locked to this room
    };
    activeRooms[roomId] = room;
    console.log(`🆕 Room "${roomId}" created with bet: ${amount}`);
  }

  // 🚫 Amount mismatch?
  if (room.players.length > 0 && room.amount !== amount) {
    console.log(`❌ Amount mismatch in Room "${roomId}": expected ${room.amount}, got ${amount}`);
    return socket.emit('invalidBet', 'Amount must match the existing room');
  }

  // 🚫 Room full (2 players max)
  if (room.players.length >= 2) {
    console.log(`🚫 Room "${roomId}" is full.`);
    return socket.emit('roomFull', 'This room already has two players');
  }

  // 🎭 Assign symbol
  const symbols = ['X', 'O'];
  const playerNumber = room.players.length + 1;
  const playerSymbol = symbols[playerNumber - 1];

  // ➕ Add player
  const player = {
    name: playerName,
    userId,
    socketId: socket.id,
    amount,
    playerNumber,
    symbol: playerSymbol,
    expoPushToken,
  };

  room.players.push(player);
  socket.join(roomId);

  console.log(`✅ ${playerName} joined Room "${roomId}" as Player ${playerNumber} (${playerSymbol})`);

  // 📢 Notify others
  socket.to(roomId).emit('playerJoined', `${playerName} joined the room`);

  // 👤 Send info to joining player
  socket.emit('playerInfo', {
    playerNumber,
    symbol: playerSymbol,
    playerName,
    roomId,
    userId,
  });

  // 🔄 Update player list
  io.to(roomId).emit('playersUpdate', room.players);

  // 🎮 Start game if 2 players joined
  if (room.players.length === 2) {
    console.log(`🎉 Game in Room "${roomId}" is ready to start with 2 players`);

    io.to(roomId).emit('gameReady', {
      players: room.players.map(p => ({ name: p.name, symbol: p.symbol })),
      roomId,
    });

    room.currentPlayer = room.startingPlayer;
    io.to(roomId).emit('turnChange', room.currentPlayer);

    // 🔔 Push notifications
    for (const player of room.players) {
      try {
        const recipient = await OdinCircledbModel.findById(player.userId);

        if (recipient?.expoPushToken) {
          await sendPushNotification(
            recipient.expoPushToken,
            'Game Ready!',
            'Your game is ready to start!',
            { roomId }
          );
        }
      } catch (err) {
        console.error(`🔔 Error sending push to ${player.userId}:`, err);
      }
    }
  }
});

  


// Listen for incoming chat messages from clients


        // Function to send push notifications
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  try {
    // Validate if the token is a valid Expo push token
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error(
        `Push token ${expoPushToken} is not a valid Expo push token`
      );
      return;
    }

    // Create the notification payload
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
      icon: 'https://as1.ftcdn.net/v2/jpg/03/06/02/06/1000_F_306020649_Kx1nsIMTl9FKwF0jyYruImTY5zV6mnzw.jpg', // Include the icon if required
    };

    console.log('Sending notification with message:', message);

    // Split messages into chunks for sending
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    // Send the notification in chunks
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    console.log('Push notification tickets:', tickets);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

 


// Function to send notifications to registered devices
async function sendNotificationsToDevices(title, message) {
  try {
    // Fetch all devices from the database
    const devices = await Device.find({});
    console.log('Fetched devices:', devices);

    // Extract the expoPushToken from each device
    const tokens = devices.map((device) => device.expoPushToken);
    console.log('Extracted tokens:', tokens);

    if (tokens.length === 0) {
      console.warn('No devices registered for notifications');
      return;
    }

    // Filter out invalid tokens and prepare messages
    const messages = tokens
      .filter((token) => Expo.isExpoPushToken(token)) // Ensure token is valid
      .map((token) => ({
        to: token,
        sound: 'default',
        title,
        body: message,
      }));

    console.log('Prepared messages:', messages);

    if (messages.length === 0) {
      console.warn('No valid Expo push tokens found');
      return;
    }

    // Chunk messages into batches to send with Expo
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    // Send notifications in chunks
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log('Sent notification chunk:', ticketChunk);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    // Log tickets for debugging
    console.log('Notification tickets:', tickets);
  } catch (error) {
    console.error('Error sending notifications:', error.message);
    console.error('Error stack:', error.stack);
  }
}

function generateUniqueRoomName() {
  return Math.random().toString(36).substr(2, 9); // Generate a random alphanumeric string
}



const startTurnTimer = (roomId) => {
  const room = activeRooms[roomId];

  if (!room) return;

  if (room.turnTimeout) {
    clearTimeout(room.turnTimeout); // Clear any existing timeout
  }

  // Set a new timeout
  room.turnTimeout = setTimeout(() => {
    console.log(`Player took too long. Auto-switching turn for room ${roomId}`);

    room.currentPlayer = (room.currentPlayer + 1) % room.players.length; // Switch turn for 3 players
    io.to(roomId).emit('turnChange', room.currentPlayer);

    // Restart the timer for the next player
    startTurnTimer(roomId);
  }, 3000);
};

socket.on('makeMove', async ({ roomId, index, playerName, symbol }) => {
  const room = activeRooms[roomId];

  if (!room || !Array.isArray(room.players) || room.players.length < 2) {
    return socket.emit('invalidMove', 'Invalid game state or not enough players');
  }

  if (!room.board || room.board.length !== 16) {
    console.error('Invalid game board state:', room.board);
    return socket.emit('invalidMove', 'Invalid board state');
  }

  // Ensure currentPlayer is correctly initialized
  if (typeof room.currentPlayer !== 'number') {
    room.currentPlayer = 0;
  }

  const currentPlayer = room.players[room.currentPlayer];

  if (socket.id !== currentPlayer.socketId) {
    return socket.emit('invalidMove', "It's not your turn");
  }

  if (room.board[index] !== null) {
    return socket.emit('invalidMove', 'Cell already occupied');
  }

  // Make the move
  room.board[index] = currentPlayer.symbol;

  // Emit move event
  io.to(roomId).emit('moveMade', { index, symbol: currentPlayer.symbol, playerName: currentPlayer.name });

  // Check for a winner
  const winnerSymbol = checkWin(room.board);
  if (winnerSymbol) {
    clearTimeout(room.turnTimeout); // Stop turn timer if someone wins

    const winnerPlayer = room.players.find(player => player.symbol === winnerSymbol);
    if (winnerPlayer) {
      io.to(roomId).emit('gameOver', {
        winnerSymbol,
        result: `${winnerPlayer.name} (${winnerSymbol}) wins!`
      });

      return;
    }
  }

  // Check for a draw (all cells filled)
  if (room.board.every(cell => cell !== null)) {
    clearTimeout(room.turnTimeout);
    io.to(roomId).emit('gameDraw', { result: "It's a draw!" });

    return;
  }

  // Switch turn for the next player
  room.currentPlayer = (room.currentPlayer + 1) % room.players.length;
  io.to(roomId).emit('turnChange', room.currentPlayer);

  // Restart the turn timer
  startTurnTimer(roomId);
});


function checkWin(board) {
  // Validate board
  if (!Array.isArray(board) || board.length !== 16) {
      console.error('Invalid game board:', board);
      return null;
  }

  // Define winning patterns for 3-in-a-row on a 4x4 board
  const winPatterns = [
      // Horizontal wins
      [0, 1, 2], [1, 2, 3],
      [4, 5, 6], [5, 6, 7],
      [8, 9, 10], [9, 10, 11],
      [12, 13, 14], [13, 14, 15],

      // Vertical wins
      [0, 4, 8], [4, 8, 12],
      [1, 5, 9], [5, 9, 13],
      [2, 6, 10], [6, 10, 14],
      [3, 7, 11], [7, 11, 15],

      // Diagonal wins
      [0, 5, 10], [1, 6, 11], 
      [4, 9, 14], [5, 10, 15], 
      [3, 6, 9], [2, 5, 8], 
      [7, 10, 13], [6, 9, 12]
  ];

  // Check all winning patterns
  for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[b] === board[c]) {
          return board[a]; // Return the winning symbol (X, O, or A)
      }
  }

  // Check for a draw (all cells are filled)
  if (board.every(cell => cell !== null)) {
      return 'draw'; // Return "draw" if the board is full and no winner
  }

  return null; // No winner yet
}



});


  return io;
};

// Initialize Socket.IO with the server
const io = TictacThreeSocketIo(server);

server.listen(5005, () => {
  console.log("🚀 Socket.io server running on port 5555");
});
