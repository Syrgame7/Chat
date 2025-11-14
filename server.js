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
  let userName = 'زائر';

  // --- الانضمام إلى غرفة ---
  socket.on('joinRoom', (data) => {
    const { room, name } = data;
    userName = name || 'زائر';
    currentRoom = room;

    socket.join(room);
    users[room][socket.id] = userName;

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

    console.log(`اتصال جديد: ${userName} في ${room}`);
  });

  socket.on('loadStatuses', () => {
    socket.emit('allStatuses', messages.status);
  });

  socket.on('sendMessage', (data) => {
    if (!data || !data.room || !data.name) return;
    const msg = { ...data, type: 'text', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveMessage', data);
  });

  socket.on('sendImage', (data) => {
    if (!data || !data.room || !data.name) return;
    const msg = { ...data, type: 'image', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveImage', data);
  });

  socket.on('sendAudio', (data) => {
    if (!data || !data.room || !data.name) return;
    const msg = { ...data, type: 'audio', time: Date.now() };
    messages[data.room].push(msg);
    io.to(data.room).emit('receiveAudio', data);
  });

  socket.on('postStatus', (data) => {
    if (!data || !data.name) return;
    const status = { ...data, type: 'status', time: Date.now() };
    messages.status.push(status);
    io.emit('newStatus', data);
  });

  socket.on('publishPost', (data) => {
    if (!data || !data.name) return;
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

  // --- جاري الكتابة (آمن) ---
  socket.on('typing', (data) => {
    if (data && data.room && data.name) {
      socket.to(data.room).emit('userTyping', { 
        name: data.name, 
        room: data.room 
      });
    }
  });

  socket.on('stopTyping', (data) => {
    if (data && data.room) {
      socket.to(data.room).emit('userStoppedTyping', { 
        name: userName, 
        room: data.room 
      });
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom && users[currentRoom]) {
      delete users[currentRoom][socket.id];
      const userList = Object.values(users[currentRoom] || {});
      io.to(currentRoom).emit('onlineUsers', { 
        room: currentRoom, 
        users: userList, 
        count: userList.length
      });
    }
    console.log(`انفصال: ${userName}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
});
