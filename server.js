const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const messages = { family: [], public: [] };
const posts = [];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  let currentRoom = null;
  let userName = 'زائر';

  socket.on('joinRoom', (data) => {
    userName = data.name || 'زائر';
    currentRoom = data.room;
    socket.join(currentRoom);
    
    const count = io.sockets.adapter.rooms.get(currentRoom)?.size || 0;
    io.to(currentRoom).emit('onlineUsers', { room: currentRoom, count });
    socket.emit('loadMessages', { room: currentRoom, messages: messages[currentRoom] || [] });
    socket.emit('allPosts', posts);
  });

  socket.on('sendMessage', (data) => {
    messages[data.room].push(data);
    io.to(data.room).emit('receiveMessage', data);
  });

  socket.on('sendAudio', (data) => {
    messages[data.room].push({ ...data, type: 'audio' });
    io.to(data.room).emit('receiveAudio', data);
  });

  socket.on('publishPost', (data) => {
    const post = { id: Date.now(), ...data, likes: 0, comments: [] };
    posts.push(post);
    io.emit('newPost', post);
  });

  socket.on('likePost', (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.likes++;
      io.emit('updatePost', post);
    }
  });

  socket.on('addComment', (data) => {
    const post = posts.find(p => p.id === data.postId);
    if (post) {
      post.comments.push({ name: data.name, text: data.text });
      io.emit('updatePost', post);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const count = io.sockets.adapter.rooms.get(currentRoom)?.size || 0;
      io.to(currentRoom).emit('onlineUsers', { room: currentRoom, count });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`الخادم يعمل على ${PORT}`);
});
