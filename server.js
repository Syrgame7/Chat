const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // في الإنتاج: غيّر إلى نطاقك فقط
    methods: ["GET", "POST"]
  }
});

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// جذور التطبيق
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تخزين غرف الدردشة (بسيط — بدون قاعدة بيانات)
const rooms = {
  family: [],
  public: [],
  status: [] // الحالات يمكن معالجتها لاحقًا
};

io.on('connection', (socket) => {
  console.log('مستخدم متصل:', socket.id);

  // الانضمام إلى غرفة
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`انضم ${socket.id} إلى غرفة: ${room}`);
  });

  // إرسال رسالة
  socket.on('sendMessage', (data) => {
    io.to(data.room).emit('receiveMessage', data);
  });

  // إرسال صورة (كـ data URL)
  socket.on('sendImage', (data) => {
    io.to(data.room).emit('receiveImage', data);
  });

  // إرسال حالة
  socket.on('postStatus', (data) => {
    io.emit('newStatus', data); // للجميع
  });

  socket.on('disconnect', () => {
    console.log('مستخدم غير متصل:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
