const users = [];
const drinkQue = [];

const addUser = ({ id, userName, roomName }) => {
  name = userName.trim().toLowerCase();
  room = roomName.trim().toLowerCase();

  const existingUser = users.find(
    (user) => user.room === room && user.name == name
  );
  if (existingUser) {
    return {
      error: "Username is taken",
    };
  }
  const user = { id, name, room };
  users.push(user);

  return { user };
};

const removeUser = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

const getUser = (id) => {
  return users.find((user) => user.id === id);
};

const getUsersInRoom = (room) => {
  return users.filter((user) => {
    return user.room === room;
  });
};

const addDrinkOrder = ({ id, userName, roomName, drinkID }) => {
  name = userName.trim().toLowerCase();
  room = roomName.trim().toLowerCase();

  const existingUserDrink = drinkQue.find(
    (user) => user.room === room && user.name == name
  );

  if (existingUserDrink) {
    return {
      error: "Drink in que",
    };
  }
  const userOrder = { id, name, room, drinkID };
  drinkQue.push(userOrder);
  return userOrder;
};

const getAllDrinkOrders = (room) => {
  // console.log("this is the room", room);
  let filtered = drinkQue.filter((user) => {
    return user.room === room;
  });
  return filtered;
};

const removeDrinksPerUser = (id) => {
  for (var i = drinkQue.length - 1; i >= 0; i--) {
    if (drinkQue[i].id == id) {
      drinkQue.splice(i, 1);
    }
  }
  console.log("this is the new drink que", drinkQue);
  return drinkQue;
};

module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  addDrinkOrder,
  getAllDrinkOrders,
  removeDrinksPerUser,
};
