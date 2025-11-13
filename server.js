const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// تخزين الرسائل
const messages = {
  family: [],
  public: [],
  status: []
};

// تتبع المستخدمين المتصلين
const users = {
  family: {},
  public: {}
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  let currentRoom = null;
  let userName = null;

  socket.on('joinRoom', (data) => {
    const { room, name } = data;
    userName = name;
    currentRoom = room;

    socket.join(room);
    users[room][socket.id] = name;

    socket.emit('loadMessages', { room, messages: messages[room] || [] });
    updateOnlineUsers(room);
  });

  socket.on('loadStatuses', () => {
    socket.emit('allStatuses', messages.status);
  });

  socket.on('sendMessage', (data) => {
    const msg = { ...data, type: 'text', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveMessage', data);
  });

  socket.on('sendImage', (data) => {
    const msg = { ...data, type: 'image', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveImage', data);
  });

  socket.on('postStatus', (data) => {
    const status = { ...data, type: 'status', time: Date.now() };
    messages.status.push(status);
    io.emit('newStatus', data);
  });

  socket.on('disconnect', () => {
    if (currentRoom && users[currentRoom]) {
      delete users[currentRoom][socket.id];
      updateOnlineUsers(currentRoom);
    }
  });

  function updateOnlineUsers(room) {
    const userList = Object.values(users[room] || {});
    io.to(room).emit('onlineUsers', { room, users: userList, count: userList.length });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على: http://localhost:${PORT}`);
});
