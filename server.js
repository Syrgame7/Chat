const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});
const path = require('path');

const port = process.env.PORT || 3000;

// هذا السطر هو الذي يشغل ملف التصميم الموجود في مجلد public
app.use(express.static(path.join(__dirname, 'public')));

// متغيرات لتخزين المستخدمين
let users = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // عند دخول مستخدم
    socket.on('join', (data) => {
        users[socket.id] = data;
        io.emit('update-users', Object.values(users));
        // إشعار انضمام
        socket.broadcast.emit('msg', {
            type: 'text',
            text: `انضم ${data.name} للمحادثة`,
            sender: 'النظام',
            id: 'system'
        });
    });

    // استقبال الرسائل
    socket.on('msg', (data) => {
        // إضافة معرف المرسل للرسالة
        const fullMsg = { ...data, id: socket.id };
        io.emit('msg', fullMsg);
    });

    // حالة الكتابة
    socket.on('typing', (status) => {
        socket.broadcast.emit('user-typing', { id: socket.id, status });
    });

    // --- نظام الغرف الصوتية ---
    socket.on('join-voice', () => {
        socket.broadcast.emit('user-connected-voice', socket.id);
    });

    socket.on('voice-signal', (payload) => {
        io.to(payload.userToSignal).emit('voice-signal', payload);
    });

    socket.on('leave-voice', () => {
        socket.broadcast.emit('user-left-voice', socket.id);
    });

    // عند الخروج
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
        io.emit('user-left-voice', socket.id);
    });
});

http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
