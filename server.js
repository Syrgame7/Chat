const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// نقطة نهاية لرفع الصوت باستخدام 0x0.st
app.post('/upload-audio', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
  try {
    const form = new FormData();
    form.append('file', req.body, 'recording.webm');

    const response = await axios.post('https://0x0.st', form, {
      headers: form.getHeaders(),
      timeout: 15000
    });

    const directLink = response.data.trim();

    if (directLink.startsWith('http')) {
      res.json({ success: true, url: directLink });
    } else {
      res.json({ success: false, error: 'رابط غير صالح' });
    }
  } catch (err) {
    console.error('خطأ في رفع الصوت:', err.message);
    res.status(500).json({ success: false, error: 'فشل الاتصال بالخدمة' });
  }
});

let messages = [];

io.on('connection', function(socket) {
  socket.emit('prev', messages);
  socket.on('send', function(data) {
    const msg = {
      id: socket.id,
      u: data.u,
      t: data.t,
      time: new Date().toLocaleTimeString('ar-EG'),
      isAudio: data.isAudio || false
    };
    messages.push(msg);
    if (messages.length > 100) messages.shift();
    io.emit('msg', msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', function() {
  console.log('✅ الخادم شغال على المنفذ ' + PORT);
});
