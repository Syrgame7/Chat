const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- تخزين البيانات ---
const messages = {
  family: [],
  public: [],
  status: []
};

const users = {
  family: {},
  public: {}
};

const posts = [];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  let currentRoom = null;
  let userName = null;

  // --- الانضمام إلى غرفة ---
  socket.on('joinRoom', (data) => {
    const { room, name } = data;
    userName = name;
    currentRoom = room;

    socket.join(room);
    users[room][socket.id] = name;

    // إرسال قائمة المستخدمين
    const userList = Object.values(users[room] || {});
    io.to(room).emit('onlineUsers', { 
      room, 
      users: userList, 
      count: userList.length
    });

    socket.emit('loadMessages', { room, messages: messages[room] || [] });
    socket.emit('loadStatuses', messages.status);
    socket.emit('allPosts', posts);

    updateOnlineUsers(room);
  });

  socket.on('loadStatuses', () => {
    socket.emit('allStatuses', messages.status);
  });

  socket.on('sendMessage', (data) => {
    const msg = { ...data, type: 'text', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveMessage', data);
  });

  socket.on('sendImage', (data) => {
    const msg = { ...data, type: 'image', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveImage', data);
  });

  socket.on('sendAudio', (data) => {
    const msg = { ...data, type: 'audio', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveAudio', data);
  });

  socket.on('postStatus', (data) => {
    const status = { ...data, type: 'status', time: Date.now() };
    messages.status.push(status);
    io.emit('newStatus', data);
  });

  socket.on('publishPost', (data) => {
    const post = {
      id: Date.now(),
      name: data.name,
      text: data.text || '',
      image: data.image || null,
      time: Date.now(),
      likes: 0,
      comments: [],
      likedBy: []
    };
    posts.push(post);
    io.emit('newPost', post);
  });

  socket.on('likePost', (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post && !post.likedBy.includes(socket.id)) {
      post.likes++;
      post.likedBy.push(socket.id);
      io.emit('updatePost', post);
    }
  });

  socket.on('addComment', (data) => {
    const post = posts.find(p => p.id === data.postId);
    if (post) {
      const comment = {
        id: Date.now(),
        name: data.name,
        text: data.text,
        time: Date.now()
      };
      post.comments.push(comment);
      io.emit('updatePost', post);
    }
  });

  socket.on('loadPosts', () => {
    socket.emit('allPosts', posts);
  });

  socket.on('disconnect', () => {
    if (currentRoom && users[currentRoom]) {
      delete users[currentRoom][socket.id];
      updateOnlineUsers(currentRoom);
    }
  });

  function updateOnlineUsers(room) {
    const userList = Object.values(users[room] || {});
    io.to(room).emit('onlineUsers', { 
      room, 
      users: userList, 
      count: userList.length
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
});
