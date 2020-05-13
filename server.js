require("dotenv").config();
const config = require("./config");
const client = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_SECRET
);

// var Twilio = require("twilio");
// var client = new Twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_API_SECRET,
//   { accountSid: process.env.TWILIO_ACCOUNT_SID }
// );

const { resolve } = require("path");
const stripe = require("stripe")(process.env.STRIP_SECRET_KEY);

const express = require("express");
const bodyParser = require("body-parser");
const pino = require("express-pino-logger")();
const { chatToken, videoToken, voiceToken } = require("./tokens");
const http = require("http");
const cors = require("cors");
const socketio = require("socket.io");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  addDrinkOrder,
  getAllDrinkOrders,
  removeDrinksPerUser,
} = require("./socketio/users");
//setting up the server
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
const PORT = process.env.PORT || 3001;

app.use(express.static("."));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(pino);

const sendTokenResponse = (token, res) => {
  res.set("Content-Type", "application/json");
  res.send(
    JSON.stringify({
      token: token.toJwt(),
    })
  );
};

const calculateOrderAmount = (tipAmount) => {
  return parseFloat(tipAmount * 100.0);
};

app.post("/create-payment-intent", async (req, res) => {
  const { tipAmount } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(tipAmount),
    currency: "usd",
  });

  res.json({
    clientSecret: paymentIntent.client_secret,
  });
});

app.get("/", (req, res) => {
  res.send("server is running");
});

app.get("/api/greeting", (req, res) => {
  const name = req.query.name || "World";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({ greeting: `Hello ${name}!` }));
});

app.get("/chat/token", (req, res) => {
  const identity = req.query.identity;
  const token = chatToken(identity, config);
  sendTokenResponse(token, res);
});

app.post("/chat/token", (req, res) => {
  const identity = req.body.identity;
  const token = chatToken(identity, config);
  sendTokenResponse(token, res);
});

app.get("/video/token", (req, res) => {
  const identity = req.query.identity;
  const room = req.query.room;
  const token = videoToken(identity, room, config);
  sendTokenResponse(token, res);
});

app.post("/video/token", (req, res) => {
  const identity = req.body.identity;
  const room = req.body.room;
  const token = videoToken(identity, room, config);
  sendTokenResponse(token, res);
});

app.get("/voice/token", (req, res) => {
  const identity = req.body.identity;
  const token = voiceToken(identity, config);
  sendTokenResponse(token, res);
});

app.post("/voice/token", (req, res) => {
  const identity = req.body.identity;
  const token = voiceToken(identity, config);
  sendTokenResponse(token, res);
});

//get the inprogress rooms avalible
app.get("/rooms/:roomName", (req, res) => {
  let roomName = req.params.roomName;
  client.video
    .rooms(roomName)
    .participants.list({ status: "connected" }, (err, participants) => {
      if (err) {
        console.error(err);
        return;
      }
      res.send(participants);
    });
});

//setting up a socket
io.on("connection", (socket) => {
  console.log("We have a new connection");
  socket.on("join", ({ userName, roomName }, callback) => {
    const { error, user } = addUser({ id: socket.id, userName, roomName });
    // console.log("this is the user", user);
    if (error) return callback(error);

    socket.broadcast.to(user.room).emit("message", {
      user: "Chatbot",
      text: `${user.name} joined ${room}`,
    });

    socket.join(user.room);

    io.to(user.room).emit("roomData", {
      users: getUsersInRoom(user.room),
    });

    io.to(user.room).emit("allDrinkOrders", {
      userOrders: getAllDrinkOrders(user.room),
    });

    callback();
  });

  // socket.on("sendMessage", (message, callback) => {
  //   const user = getUser(socket.id);
  //   io.to(user.room).emit("message", { user: user.name, text: message });
  //   callback();
  // });

  socket.on("makingDrink", ({ userName, roomName }) => {
    // console.log("making a drink", userName, roomName);
    removeDrinksPerUser(socket.id);
    io.to(roomName).emit("allDrinkOrders", {
      userOrders: getAllDrinkOrders(roomName),
    });
  });

  socket.on("drinkOrder", ({ userName, roomName, drinkID }) => {
    // console.log("drink order", userName, roomName, drinkID);
    const newOrder = addDrinkOrder({
      id: socket.id,
      userName,
      roomName,
      drinkID,
    });

    io.to(newOrder.room).emit("newOrder", {
      newOrder,
    });

    io.to(newOrder.room).emit("allDrinkOrders", {
      userOrders: getAllDrinkOrders(newOrder.room),
    });
  });

  socket.on("disconnectWhenLoggingOut", () => {
    // console.log("hey discconecting");
    const user = removeUser(socket.id);
    // console.log("hey i am being disconected", user);
    removeDrinksPerUser(socket.id);
    if (user) {
      // console.log("user", user);
      io.to(user.room).emit("message", {
        user: "Chatbot",
        text: `${user.name} disconnected`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
      io.to(user.room).emit("allDrinkOrders", {
        userOrders: getAllDrinkOrders(user.room),
      });
    }
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    console.log("hey i am being disconected", user);
    removeDrinksPerUser(socket.id);
    if (user) {
      console.log("user", user);
      io.to(user.room).emit("message", {
        user: "Chatbot",
        text: `${user.name} disconnected`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
      io.to(user.room).emit("allDrinkOrders", {
        userOrders: getAllDrinkOrders(user.room),
      });
    }
  });
});

server.listen(PORT, () => console.log(`Server is running on ${PORT}`));
