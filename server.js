const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// تقديم الملفات الثابتة (HTML, CSS, Sounds) من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('مستخدم متصل: ' + socket.id);

    // استقبال رسالة
    socket.on('chat_message', (msgData) => {
        // msgData = { text: "...", user: "...", time: "..." }
        // إعادة إرسالها للجميع بما فيهم المرسل
        io.emit('chat_message', msgData);
    });

    socket.on('disconnect', () => {
        console.log('مستخدم غادر');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
