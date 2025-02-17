const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require("multer");
const http = require('http');
const path = require("path");
const authenticateRouter = require('./Auth/authenticate'); // Import authentication routes
// const initializeSocket = require('./Chat/ChatSocket'); // Import the initializeSocket function
// const initializeSocketOne = require('./Chat/ChatSocketOne')
// const  FriendListIo = require('./Chat/FriendList');
// const ListSocketIo = require('./Chat/ListSocket');
// const SearchSocketIo = require('./Chat/SearchSocke');
// const ChatFriendsSocketIo = require("./Chat/ChatFriendsSock")
// const startSocketServer1 = require("./GameServer/server1")
// const startSocketServer11 = require("./GameServer/server11")
// const startSocketServer5 = require("./GameServer/server5")
// const startSocketServer55 = require("./GameServer/server55")

const app = express();
app.use(express.json());

const cors = require('cors');

const LOCALHOST1 = process.env.LOCALHOST1
const LOCALHOST2 = process.env.LOCALHOST2


const allowedOrigins = [`${LOCALHOST1}`, `${LOCALHOST2}`, ];

app.use(cors({ origin: "*" })); // Temporarily allow all for debugging

app.get('/', (req, res) => {
  res.send('Backend is running!');
});


app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow mobile apps
      }
    },
  })
);

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/uploads', express.static('uploads'));

const mongoUsername = process.env.MONGO_USERNAME;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoDatabase = process.env.MONGO_DATABASE;
const mongoCluster = process.env.MONGO_CLUSTER;

const uri = `mongodb+srv://${mongoUsername}:${mongoPassword}@${mongoCluster}.kbgr5.mongodb.net/${mongoDatabase}?retryWrites=true&w=majority`;

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected Successfully"))
.catch(err => console.error("MongoDB Connection Error:", err));

// Use authentication routes
app.use(authenticateRouter);

// Create HTTP servers
// const server1 = http.createServer(express());
// const server11 = http.createServer(express());
// const server5 = http.createServer(express());
// const server55 = http.createServer(express());
const mainServer = http.createServer(app);
// const chatServer = http.createServer();
// const friendListServer = http.createServer();
// const listSocketIo = http.createServer();
// const searchsocketIo = http.createServer();
// const chatfriendssocketIo = http.createServer();

// Initialize socket connections for chat and friend list
//initializeSocket(chatServer);
initializeSocketOne(chatServer);
FriendListIo(friendListServer);
ListSocketIo(listSocketIo);
SearchSocketIo(searchsocketIo);
ChatFriendsSocketIo(chatfriendssocketIo); 

const PORT = process.env.PORT || 4444;
// const CHAT_PORT =  process.env.CHAT_PORT;
// const FRIEND_LIST_PORT =  process.env.FRIEND_LIST_PORT;
// const LIST_PORT = process.env.LIST_PORT;
// const SEARCH_PORT = process.env.SEARCH_PORT;
// const CHATFRIENDS_PORT = process.env.CHATFRIENDS_PORT;
// const PORT_ONE = process.env.PORT_ONE;
// const PORT_ELEVEN = process.env.PORT_ELEVEN;
// const PORT_FIFTY_FIVE = process.env.PORT_FIFTY_FIVE;
// const PORT_FIVE = process.env.PORT_FIVE;

console.log(PORT, 'jdjkdj')

//Listen on different ports
mainServer.listen(PORT, () => {
  console.log(`Main server is running`);
});

// chatServer.listen(CHAT_PORT, () => {
//   console.log(`Chat server is running`);
// });

// friendListServer.listen(FRIEND_LIST_PORT, () => {
//   console.log(`Friend list server is running`);
// });

// listSocketIo.listen(LIST_PORT, () => {
//   console.log(`chatfriend list server is running`);
// });

// searchsocketIo.listen(SEARCH_PORT, () => {
//   console.log(`SEARChlist server is running`);
  
// })

// chatfriendssocketIo.listen(CHATFRIENDS_PORT, () => {
//   console.log(`chatfff ssocket is running`);
  
// })


// server1.listen(PORT_ONE, () => {

//   startSocketServer1(server1)
//   // Socket server is also running now
//   console.log('Socket A server is running')

// });

// server11.listen(PORT_ELEVEN, () => {

//     startSocketServer11(server11)
//     console.log('Socket AA server is running')

//   });

  // server5.listen(PORT_FIVE, () => {
  
  //   startSocketServer5(server5)
  //   console.log('Socket  B server is running')

  // });
  
  // server55.listen(PORT_FIFTY_FIVE, () => {
  
  //   startSocketServer55(server55)
  //   console.log('Socket BB server is running')

  // });


 