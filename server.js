const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// نقطة نهاية لرفع الصوت من العميل
app.post('/upload-audio', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
  try {
    // حفظ الملف مؤقتًا
    const filename = `audio_${Date.now()}.webm`;
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, req.body);

    // رفع الملف إلى 0x0.st باستخدام curl
    const curlCommand = `curl -s -F "file=@${filepath}" https://0x0.st`;

    exec(curlCommand, (error, stdout, stderr) => {
      // حذف الملف المؤقت
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      if (error) {
        console.error('خطأ في curl:', error);
        return res.json({ success: false, error: 'فشل في رفع الملف' });
      }

      const url = stdout.trim();
      if (url.startsWith('http')) {
        res.json({ success: true, url: url });
      } else {
        res.json({ success: false, error: 'رابط غير صحيح' });
      }
    });
  } catch (err) {
    console.error('خطأ في خادم الرفع:', err);
    res.status(500).json({ success: false, error: 'خطأ في الخادم' });
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
  console.log('✅ السيرفر شغال على المنفذ ' + PORT);
});
