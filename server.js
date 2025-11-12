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

// نقطة نهاية لرفع الصوت (POST)
app.post('/upload-audio', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
  try {
    const form = new FormData();
    form.append('file', req.body, 'recording.webm');

    const response = await axios.post('https://www.file.io/', form, {
      headers: form.getHeaders(),
      timeout: 10000 // 10 ثوانٍ كحد أقصى
    });

    if (response.data && response.data.success) {
      res.json({ success: true, url: response.data.link });
    } else {
      res.json({ success: false, error: 'فشل الرفع: استجابة غير صالحة' });
    }
  } catch (err) {
    console.error('خطأ في رفع الصوت:', err.message);
    res.status(500).json({ success: false, error: 'خطأ في الخادم أثناء الرفع' });
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
