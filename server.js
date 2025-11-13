const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const messages = { family: [], public: [] };
const users = { family: {}, public: {} };

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('اتصال جديد');

  socket.on('joinRoom', (data) => {
    const { room, name } = data;
    socket.join(room);
    users[room][socket.id] = name;

    // إرسال الرسائل القديمة
    socket.emit('loadMessages', { room, messages: messages[room] || [] });

    // تحديث عدد المتصلين
    const count = Object.keys(users[room]).length;
    io.to(room).emit('onlineUsers', { room, count });
  });

  socket.on('sendMessage', (data) => {
    messages[data.room].push(data);
    io.to(data.room).emit('receiveMessage', data);
  });

  socket.on('disconnect', () => {
    // تحديث عدد المتصلين عند الانفصال
    ['family', 'public'].forEach(room => {
      if (users[room][socket.id]) {
        delete users[room][socket.id];
        const count = Object.keys(users[room]).length;
        io.to(room).emit('onlineUsers', { room, count });
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
