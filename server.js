const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// تخزين بيانات اللاعبين
let players = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // إنشاء لاعب جديد عند الاتصال
    players[socket.id] = {
        x: 0,
        y: 1, // ارتفاع عن الأرض
        z: 0,
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // لون عشوائي
        msg: ""
    };

    // إرسال اللاعبين الموجودين حالياً للاعب الجديد
    socket.emit('currentPlayers', players);

    // إبلاغ الآخرين بوجود لاعب جديد
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // عند حركة اللاعب
    socket.on('playerMovement', (movementData) => {
        if(players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            // إرسال الحركة للجميع
            socket.broadcast.emit('playerMoved', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y, z: players[socket.id].z });
        }
    });

    // عند إرسال رسالة نصية
    socket.on('chatMessage', (msg) => {
        if(players[socket.id]) {
            io.emit('chatMessage', { id: socket.id, msg: msg });
        }
    });

    // عند فصل الاتصال
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        io.emit('userDisconnect', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
