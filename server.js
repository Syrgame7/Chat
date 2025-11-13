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

// تخزين الرسائل: نصوص، صور، صوتيات، حالات
const messages = {
  family: [],
  public: [],
  status: []
};

// تتبع المستخدمين المتصلين في كل غرفة
const users = {
  family: {},
  public: {}
};

// خدمة الملفات الثابتة (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// اتصال عميل جديد
io.on('connection', (socket) => {
  let currentRoom = null;
  let userName = null;

  // الانضمام إلى غرفة
  socket.on('joinRoom', (data) => {
    const { room, name } = data;
    userName = name;
    currentRoom = room;

    socket.join(room);
    users[room][socket.id] = name;

    // إرسال الرسائل المحفوظة (نصوص، صور، صوتيات)
    socket.emit('loadMessages', { room, messages: messages[room] || [] });

    // تحديث قائمة المتصلين
    updateOnlineUsers(room);
  });

  // تحميل الحالات
  socket.on('loadStatuses', () => {
    socket.emit('allStatuses', messages.status);
  });

  // إرسال رسالة نصية
  socket.on('sendMessage', (data) => {
    const msg = { ...data, type: 'text', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveMessage', data);
  });

  // إرسال صورة
  socket.on('sendImage', (data) => {
    const msg = { ...data, type: 'image', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveImage', data);
  });

  // ✅ إرسال رسالة صوتية
  socket.on('sendAudio', (data) => {
    const msg = { ...data, type: 'audio', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveAudio', data);
  });

  // نشر حالة
  socket.on('postStatus', (data) => {
    const status = { ...data, type: 'status', time: Date.now() };
    messages.status.push(status);
    io.emit('newStatus', data);
  });

  // عند انفصال المستخدم
  socket.on('disconnect', () => {
    if (currentRoom && users[currentRoom]) {
      delete users[currentRoom][socket.id];
      updateOnlineUsers(currentRoom);
    }
  });

  // دالة تحديث قائمة المتصلين
  function updateOnlineUsers(room) {
    const userList = Object.values(users[room] || {});
    io.to(room).emit('onlineUsers', { room, users: userList, count: userList.length });
  }
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
});
