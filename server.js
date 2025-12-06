const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // السماح بملفات كبيرة (صور/صوت)
});
const path = require('path');

const port = process.env.PORT || 3000;

// توجيه السيرفر لقراءة ملف HTML من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

let users = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. دخول المستخدم
    socket.on('join', (data) => {
        users[socket.id] = data;
        io.emit('update-users', Object.values(users));
        // رسالة ترحيبية للنظام
        socket.broadcast.emit('msg', {
            type: 'text',
            text: `انضم ${data.name} للمجرة 🚀`,
            sender: 'Chat Moon',
            id: 'system',
            timestamp: Date.now()
        });
    });

    // 2. معالجة الرسائل (نص، صور، صوت)
    socket.on('msg', (data) => {
        const fullMsg = { 
            ...data, 
            id: socket.id, 
            timestamp: Date.now() 
        };
        io.emit('msg', fullMsg);
    });

    // 3. مؤشر الكتابة
    socket.on('typing', (status) => {
        socket.broadcast.emit('user-typing', { id: socket.id, status });
    });

    // ============================
    // 4. نظام الغرف الصوتية (WebRTC Signaling)
    // ============================
    
    // عند دخول شخص للغرفة الصوتية
    socket.on('join-voice', () => {
        // إخبار الآخرين أن هناك شخص جديد دخل لكي يتصلوا به
        socket.broadcast.emit('user-connected-voice', socket.id);
    });

    // تمرير إشارات الاتصال (Signaling) بين الأطراف
    socket.on('voice-signal', (payload) => {
        io.to(payload.userToSignal).emit('voice-signal', payload);
    });

    // عند الخروج من الغرفة الصوتية
    socket.on('leave-voice', () => {
        socket.broadcast.emit('user-left-voice', socket.id);
    });

    // 5. عند قطع الاتصال نهائياً
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
        io.emit('user-left-voice', socket.id); // إخراجه من الصوت أيضاً
    });
});

http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
