const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

// زيادة الحد الأقصى لحجم الرسالة إلى 10 ميجابايت لدعم الصور والصوت
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // 10 MB
});

app.use(express.static(path.join(__dirname, 'public')));

let users = {};

io.on('connection', (socket) => {
    
    socket.on('join', (username) => {
        users[socket.id] = username;
        io.emit('message', {
            user: 'النظام',
            text: `انضم ${username} إلى المحادثة`,
            type: 'system'
        });
        io.emit('updateUserList', Object.values(users));
    });

    // استقبال الرسالة (نص، صورة، أو صوت)
    socket.on('chatMessage', (data) => {
        // data should be: { type: 'text'|'image'|'audio', content: '...', fileName: '...' }
        const user = users[socket.id];
        
        io.emit('message', {
            user: user,
            type: data.type,       // text, image, audio
            content: data.content, // النص أو بيانات Base64
            fileName: data.fileName || '',
            isMe: false 
        });
    });

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
