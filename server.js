const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// تقديم ملفات الواجهة
app.use(express.static(path.join(__dirname, 'public')));

let users = {}; // تخزين المتصلين: { socketId: username }

io.on('connection', (socket) => {
    // 1. عند دخول مستخدم جديد
    socket.on('join', (username) => {
        users[socket.id] = username;
        
        // إرسال رسالة ترحيب للجميع
        io.emit('message', {
            user: 'النظام',
            text: `انضم ${username} إلى المحادثة`,
            type: 'system'
        });

        // تحديث قائمة المتصلين للجميع
        io.emit('updateUserList', Object.values(users));
    });

    // 2. استقبال رسالة وإعادة بثها
    socket.on('chatMessage', (msg) => {
        const user = users[socket.id];
        io.emit('message', {
            user: user,
            text: msg,
            type: 'chat',
            isMe: false // سيتم تعديلها في العميل
        });
    });

    // 3. عند خروج مستخدم
    socket.on('disconnect', () => {
        const username = users[socket.id];
        if(username) {
            delete users[socket.id];
            io.emit('message', {
                user: 'النظام',
                text: `غادر ${username} المحادثة`,
                type: 'system'
            });
            io.emit('updateUserList', Object.values(users));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
