const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

// تقديم ملفات الموقع
app.use(express.static('public'));

// تخزين المستخدمين والرسائل في الذاكرة (بديل قاعدة البيانات)
let users = {};
let messages = [];

io.on('connection', (socket) => {
    console.log('مستخدم اتصل: ' + socket.id);

    // عند دخول مستخدم جديد
    socket.on('join', (userData) => {
        users[socket.id] = userData;
        // إرسال المستخدمين القدامى والرسائل القديمة للمستخدم الجديد
        socket.emit('init-data', { users, messages });
        // إعلام الجميع بمستخدم جديد
        socket.broadcast.emit('user-joined', { id: socket.id, data: userData });
    });

    // استقبال رسالة نصية
    socket.on('send-message', (msgData) => {
        const fullMsg = { ...msgData, id: socket.id, timestamp: Date.now() };
        messages.push(fullMsg);
        // الاحتفاظ بآخر 100 رسالة فقط لتوفير الذاكرة
        if(messages.length > 100) messages.shift();
        io.emit('new-message', fullMsg);
    });

    // --- نظام الغرف الصوتية (WebRTC Signaling) ---
    // عندما يريد مستخدم التحدث، يرسل إشارة للبقية
    socket.on('voice-signal', (data) => {
        io.to(data.target).emit('voice-signal', {
            signal: data.signal,
            callerID: socket.id
        });
    });

    // عند خروج مستخدم
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
