//imports
const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const router = require("../routes/router");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");
const cors = require("cors");

//setting up the server
const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const io = socketio(server);

//Middlewear
app.use(router);
app.use(cors());

//Socket code
io.on("connection", (socket) => {
  console.log("We have a new connection");
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.emit("message", {
      user: "Chatbot",
      text: `Welcome ${user.name} to ${room}`,
    });
    socket.broadcast.to(user.room).emit("message", {
      user: "Chatbot",
      text: `${user.name} joined ${room}`,
    });

    socket.join(user.room);

    io.to(user.room).emit("roomData", {
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("message", { user: user.name, text: message });
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "Chatbot",
        text: `${user.name} disconnected`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
