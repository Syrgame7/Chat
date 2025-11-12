const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let messages = [];

// تسليم واجهة الدردشة عند فتح الجذر
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>دردشتي</title>
  <style>
    body{font-family:Arial;background:#e5ddd5;margin:0;padding:0;height:100vh;display:flex;flex-direction:column}
    .header{background:#075e54;color:white;padding:12px;text-align:center;font-weight:bold}
    .chat{flex:1;overflow-y:auto;padding:16px;background:#e5ddd5;display:flex;flex-direction:column}
    .msg{max-width:70%;padding:8px 12px;margin:6px 0;border-radius:8px;word-wrap:break-word}
    .in{background:#fff;align-self:flex-start}
    .out{background:#dcf8c6;align-self:flex-end}
    .input{display:flex;padding:8px;background:#fff}
    .input input{flex:1;padding:10px;border:none;background:#f0f0f0;border-radius:20px;margin:0 8px;outline:none}
    .input button{border:none;background:#075e54;color:white;padding:0 16px;border-radius:20px;cursor:pointer}
    #setup{padding:12px;background:white;text-align:center}
    #setup input{padding:8px;width:180px;border:1px solid #ccc;border-radius:6px}
  </style>
</head>
<body>
  <div class="header">دردشتي 🌐</div>
  <div id="setup"><input type="text" id="user" placeholder="اسمك" value="زائر"></div>
  <div class="chat" id="msgs"></div>
  <div class="input">
    <input type="text" id="txt" placeholder="اكتب...">
    <button onclick="send()">إرسال</button>
  </div>

  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  <script>
    const socket = io();
    const msgs = document.getElementById('msgs');
    const txt = document.getElementById('txt');
    const user = document.getElementById('user');

    socket.on('prev', m => m.forEach(add));
    socket.on('msg', add);

    function send() {
      const t = txt.value.trim();
      if (t) {
        socket.emit('send', { u: user.value || 'زائر', t });
        txt.value = '';
      }
    }

    txt.onkeypress = e => { if(e.key==='Enter') send(); };

    function add(m) {
      const d = document.createElement('div');
      d.className = 'msg ' + (m.id === socket.id ? 'out' : 'in');
      d.innerHTML = '<b>' + m.u + ':</b> ' + m.t + '<br><small>' + m.time + '</small>';
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }
  </script>
</body>
</html>
  `);
});

io.on('connection', (socket) => {
  socket.emit('prev', messages);
  socket.on('send', (data) => {
    const msg = {
      id: socket.id,
      u: data.u,
      t: data.t,
      time: new Date().toLocaleTimeString('ar-EG')
    };
    messages.push(msg);
    // نحتفظ بآخر 100 رسالة فقط
    if (messages.length > 100) messages.shift();
    io.emit('msg', msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('السيرفر شغال');
});