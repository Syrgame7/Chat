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

// ✅ تخزين مؤقت للرسائل والصور والحالات في الذاكرة
const messages = {
  family: [],
  public: [],
  status: []
};

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('اتصال جديد:', socket.id);

  // الانضمام إلى غرفة وطلب تحميل الرسائل
  socket.on('joinRoom', (room) => {
    socket.join(room);
    socket.emit('loadMessages', { room, messages: messages[room] || [] });
  });

  // تحميل جميع الحالات
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

  // نشر حالة
  socket.on('postStatus', (data) => {
    const status = { ...data, type: 'status', time: Date.now() };
    messages.status.push(status);
    io.emit('newStatus', data);
  });

  socket.on('disconnect', () => {
    console.log('انفصال:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
