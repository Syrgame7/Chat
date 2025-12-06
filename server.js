const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});
const path = require('path');

const port = process.env.PORT || 3000;

// هذا السطر يخبر السيرفر أن ملفات الموقع موجودة في مجلد public
app.use(express.static(path.join(__dirname, 'public')));

let users = {};

io.on('connection', (socket) => {
    
    // عند دخول مستخدم
    socket.on('join', (data) => {
        users[socket.id] = data;
        io.emit('update-users', Object.values(users));
        // رسالة نظام
        socket.broadcast.emit('msg', {
            id: 'system',
            text: `انضم ${data.name} للمجرة`,
            sender: 'النظام',
            timestamp: Date.now()
        });
    });

    // استقبال الرسائل
    socket.on('msg', (data) => {
        const fullMsg = { ...data, id: socket.id, timestamp: Date.now() };
        io.emit('msg', fullMsg);
    });

    // --- نظام الصوت (WebRTC Signaling) ---
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
