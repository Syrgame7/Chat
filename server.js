const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// تهيئة Cloudinary من المتغيرات البيئية
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// نقطة نهاية لرفع الصوت إلى Cloudinary
app.post('/upload-audio', express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req, res) => {
  const filename = `audio_${Date.now()}.webm`;
  const filepath = path.join(__dirname, filename);

  // حفظ الملف مؤقتًا
  fs.writeFileSync(filepath, req.body);

  // رفع إلى Cloudinary
  cloudinary.uploader.upload(filepath, { resource_type: 'auto' }, (error, result) => {
    // حذف الملف المؤقت
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    if (error) {
      console.error('خطأ في رفع Cloudinary:', error.message);
      return res.status(500).json({ success: false, error: 'فشل رفع الصوت' });
    }

    // إرجاع الرابط المباشر
    res.json({ success: true, url: result.secure_url });
  });
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
