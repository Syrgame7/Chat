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

// تخزين الرسائل + معلومات المستخدمين (بما في ذلك الصورة الشخصية)
const messages = {
  family: [],
  public: [],
};
const statuses = [];

// تتبع المستخدمين: { socketId: { name, avatar, room } }
const users = {};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('joinRoom', (data) => {
    const { room, name, avatar } = data;
    
    // تحديث بيانات المستخدم
    users[socket.id] = { name, avatar, room };
    socket.join(room);

    // إرسال الرسائل السابقة
    socket.emit('loadMessages', { room, messages: messages[room] || [] });
    socket.emit('loadStatuses', statuses);

    // إرسال تحديث الصورة الشخصية لجميع المستخدمين
    socket.to(room).emit('userAvatarUpdate', { socketId: socket.id, name, avatar });

    // تحديث قائمة المتصلين
    updateOnlineUsers(room);
  });

  socket.on('sendMessage', (data) => {
    const msg = { ...data, type: 'text', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveMessage', { ...data, avatar: users[socket.id]?.avatar });
  });

  socket.on('sendImage', (data) => {
    const msg = { ...data, type: 'image', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveImage', { ...data, avatar: users[socket.id]?.avatar });
  });

  socket.on('sendAudio', (data) => {
    const msg = { ...data, type: 'audio', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveAudio', { ...data, avatar: users[socket.id]?.avatar });
  });

  socket.on('postStatus', (data) => {
    const status = { ...data, time: Date.now() };
    statuses.push(status);
    io.emit('newStatus', data);
  });

  socket.on('updateAvatar', (data) => {
    if (users[socket.id]) {
      users[socket.id].avatar = data.avatar;
      const room = users[socket.id].room;
      // إبلاغ الجميع في الغرفة
      io.to(room).emit('userAvatarUpdate', { 
        socketId: socket.id, 
        name: users[socket.id].name, 
        avatar: data.avatar 
      });
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      delete users[socket.id];
      updateOnlineUsers(user.room);
    }
  });

  function updateOnlineUsers(room) {
    const roomUsers = Object.values(users).filter(u => u.room === room);
    const userList = roomUsers.map(u => u.name);
    io.to(room).emit('onlineUsers', { 
      room, 
      users: userList, 
      count: userList.length 
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ يعمل على المنفذ ${PORT}`);
});
