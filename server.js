const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

// زيادة الحجم لاستيعاب الصور
const io = new Server(server, {
    maxHttpBufferSize: 1e7 
});

app.use(express.static(path.join(__dirname, 'public')));

let users = {};
let statuses = []; // تخزين الحالات: { id, user, text, likes, time }

io.on('connection', (socket) => {
    
    socket.on('join', (username) => {
        users[socket.id] = username;
        
        // إعلام الجميع بدخول مستخدم (نوع خاص للتميز الصوتي)
        io.emit('message', {
            user: 'النظام',
            text: `انضم ${username} إلى المحادثة`,
            type: 'join_notification' // نوع جديد لتشغيل صوت الدخول
        });
        
        io.emit('updateUserList', Object.values(users));
        // إرسال الحالات الحالية للمستخدم الجديد
        socket.emit('updateStatuses', statuses);
    });

    // استقبال الرسائل
    socket.on('chatMessage', (data) => {
        const user = users[socket.id];
        io.emit('message', {
            user: user,
            type: data.type,
            content: data.content,
            isMe: false 
        });
    });

    // --- نظام الحالات ---
    socket.on('publishStatus', (text) => {
        const user = users[socket.id];
        if (!user || !text) return;

        const newStatus = {
            id: Date.now(), // معرف فريد بسيط
            user: user,
            text: text,
            likes: 0
        };
        
        statuses.unshift(newStatus); // إضافة للأحدث
        if (statuses.length > 20) statuses.pop(); // الاحتفاظ بآخر 20 حالة فقط
        
        io.emit('updateStatuses', statuses);
    });

    socket.on('likeStatus', (statusId) => {
        const status = statuses.find(s => s.id === statusId);
        if (status) {
            status.likes += 1;
            io.emit('updateStatuses', statuses);
        }
    });
    // -------------------

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
