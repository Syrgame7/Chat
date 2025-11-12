const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let messages = [];

app.get('/', (req, res) => {
  res.send('<!DOCTYPE html>' +
'<html lang="ar" dir="rtl">' +
'<head>' +
'  <meta charset="UTF-8" />' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>' +
'  <title>دردشتي</title>' +
'  <style>' +
'    * { margin: 0; padding: 0; box-sizing: border-box; }' +
'    body {' +
'      font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif;' +
'      background: #e5ddd5;' +
'      height: 100vh;' +
'      display: flex;' +
'      flex-direction: column;' +
'      touch-action: manipulation;' +
'      -webkit-tap-highlight-color: transparent;' +
'    }' +
'    .header {' +
'      background: #075e54;' +
'      color: white;' +
'      padding: 12px 16px;' +
'      text-align: center;' +
'      font-weight: bold;' +
'      font-size: 18px;' +
'      box-shadow: 0 2px 6px rgba(0,0,0,0.2);' +
'    }' +
'    .setup {' +
'      padding: 12px;' +
'      background: white;' +
'      text-align: center;' +
'      border-bottom: 1px solid #ddd;' +
'    }' +
'    .setup input {' +
'      padding: 8px;' +
'      font-size: 16px;' +
'      width: 90%;' +
'      max-width: 200px;' +
'      border: 1px solid #ccc;' +
'      border-radius: 6px;' +
'      outline: none;' +
'    }' +
'    .chat-container {' +
'      flex: 1;' +
'      overflow-y: auto;' +
'      padding: 12px;' +
'      background: #e5ddd5;' +
'      display: flex;' +
'      flex-direction: column;' +
'      gap: 8px;' +
'    }' +
'    .message {' +
'      max-width: 70%;' +
'      padding: 8px 12px;' +
'      margin: 4px 0;' +
'      border-radius: 8px;' +
'      word-wrap: break-word;' +
'      line-height: 1.4;' +
'      position: relative;' +
'      font-size: 16px;' +
'    }' +
'    .received {' +
'      background: #fff;' +
'      align-self: flex-start;' +
'      border-bottom-left-radius: 3px;' +
'    }' +
'    .sent {' +
'      background: #dcf8c6;' +
'      align-self: flex-end;' +
'      border-bottom-right-radius: 3px;' +
'    }' +
'    .message-info {' +
'      font-size: 11px;' +
'      color: #666;' +
'      margin-top: 4px;' +
'      text-align: right;' +
'    }' +
'    .input-area {' +
'      display: flex;' +
'      padding: 8px;' +
'      background: #fff;' +
'      border-top: 1px solid #ccc;' +
'      gap: 8px;' +
'    }' +
'    .input-area textarea {' +
'      flex: 1;' +
'      padding: 10px;' +
'      font-size: 16px;' +
'      border: none;' +
'      background: #f0f0f0;' +
'      border-radius: 20px;' +
'      outline: none;' +
'      min-height: 40px;' +
'      max-height: 120px;' +
'      overflow-y: auto;' +
'      resize: none;' +
'    }' +
'    .input-area button {' +
'      border: none;' +
'      background: #075e54;' +
'      color: white;' +
'      padding: 0 16px;' +
'      border-radius: 20px;' +
'      font-weight: bold;' +
'      cursor: pointer;' +
'      min-height: 40px;' +
'    }' +
'    .voice-btn {' +
'      background: #6c757d;' +
'      padding: 0 12px;' +
'      border-radius: 20px;' +
'      font-size: 20px;' +
'      cursor: pointer;' +
'      display: flex;' +
'      align-items: center;' +
'      justify-content: center;' +
'    }' +
'    .voice-btn.recording {' +
'      background: #dc3545;' +
'      animation: pulse 1s infinite;' +
'    }' +
'    @keyframes pulse {' +
'      \'0%\' { transform: scale(1); }' +
'      \'50%\' { transform: scale(1.1); }' +
'      \'100%\' { transform: scale(1); }' +
'    }' +
'    @media (max-width: 480px) {' +
'      \'.message\' {' +
'        max-width: 85%;' +
'        font-size: 14px;' +
'      }' +
'      \'.input-area textarea\' {' +
'        font-size: 14px;' +
'      }' +
'      \'.header\' {' +
'        font-size: 16px;' +
'        padding: 10px 12px;' +
'      }' +
'    }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="header">دردشتي 🌐</div>' +
'  <div class="setup"><input type="text" id="user" placeholder="اسمك" value="زائر"></div>' +
'  <div class="chat-container" id="msgs"></div>' +
'  <div class="input-area">' +
'    <textarea id="txt" placeholder="اكتب رسالتك..." autocomplete="off" rows="1" style="resize:none;"></textarea>' +
'    <button id="sendBtn">إرسال</button>' +
'    <button class="voice-btn" id="voiceBtn">🎤 تسجيل</button>' +
'  </div>' +

'  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>' +
'  <script>' +
'    const socket = io();' +
'    const msgs = document.getElementById(\'msgs\');' +
'    const txt = document.getElementById(\'txt\');' +
'    const user = document.getElementById(\'user\');' +
'    const sendBtn = document.getElementById(\'sendBtn\');' +
'    const voiceBtn = document.getElementById(\'voiceBtn\');' +

'    socket.on(\'prev\', function(m) {' +
'      m.forEach(function(msg) {' +
'        addMessage(msg, msg.id === socket.id ? \'sent\' : \'received\');' +
'      });' +
'    });' +
'    socket.on(\'msg\', function(msg) {' +
'      addMessage(msg, msg.id === socket.id ? \'sent\' : \'received\');' +
'    });' +

'    txt.addEventListener(\'input\', function() {' +
'      this.style.height = \'auto\';' +
'      this.style.height = (this.scrollHeight) + \'px\';' +
'    });' +

'    let isRecording = false;' +
'    let mediaRecorder;' +
'    let audioChunks = [];' +

'    voiceBtn.addEventListener(\'click\', async function() {' +
'      if (!isRecording) {' +
'        try {' +
'          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });' +
'          mediaRecorder = new MediaRecorder(stream);' +
'          audioChunks = [];' +
'          mediaRecorder.ondataavailable = function(e) { audioChunks.push(e.data); };' +
'          mediaRecorder.start();' +
'          isRecording = true;' +
'          voiceBtn.classList.add(\'recording\');' +
'          voiceBtn.textContent = \'🛑 إيقاف\';' +
'        } catch (err) {' +
'          alert(\'لم يتمكن من الوصول للميكروفون: \' + err.message);' +
'        }' +
'      } else {' +
'        mediaRecorder.stop();' +
'        isRecording = false;' +
'        voiceBtn.classList.remove(\'recording\');' +
'        voiceBtn.textContent = \'🎤 تسجيل\';' +

'        mediaRecorder.onstop = async function() {' +
'          const audioBlob = new Blob(audioChunks, { type: \'audio/webm\' });' +
'          const formData = new FormData();' +
'          formData.append(\'file\', audioBlob, \'recording.webm\');' +

'          try {' +
'            const res = await fetch(\'https://tmpfiles.org/api/v1/upload\', { method: \'POST\', body: formData });' +
'            const data = await res.json();' +
'            if (data.status === \'success\') {' +
'              // تحويل الرابط إلى رابط تحميل مباشر' +
'              const directLink = data.data.url.replace(\'https://tmpfiles.org/\', \'https://tmpfiles.org/dl/\');' +
'              socket.emit(\'send\', { u: user.value || \'زائر\', t: directLink, isAudio: true });' +
'            } else {' +
'              alert(\'فشل رفع الصوت. حاول مرة أخرى.\');' +
'            }' +
'          } catch (err) {' +
'            alert(\'❌ فشل في رفع الصوت. حاول مرة أخرى.\');' +
'          }' +
'        };' +
'      }' +
'    });' +

'    sendBtn.addEventListener(\'click\', send);' +
'    txt.addEventListener(\'keypress\', function(e) { if (e.key === \'Enter\') send(); });' +

'    function send() {' +
'      const text = txt.value.trim();' +
'      if (text) {' +
'        socket.emit(\'send\', { u: user.value || \'زائر\', t: text });' +
'        txt.value = \'\';' +
'        txt.style.height = \'auto\';' +
'        txt.focus();' +
'      }' +
'    }' +

'    function addMessage(msg, type) {' +
'      const msgDiv = document.createElement(\'div\');' +
'      msgDiv.className = \'message \' + type;' +
'      const time = msg.time || new Date().toLocaleTimeString(\'ar-EG\');' +
'      let content = \'<strong>\' + (msg.u || \'زائر\') + \':</strong> \';' +

'      if (msg.isAudio) {' +
'        content += \'<br><audio controls src="\' + msg.t + \'" style="width: 100%; margin-top: 5px;"></audio>\';' +
'      } else {' +
'        content += msg.t;' +
'      }' +

'      msgDiv.innerHTML = content + \'<br><small class="message-info">\' + time + \'</small>\';' +
'      msgs.appendChild(msgDiv);' +
'      msgs.scrollTop = msgs.scrollHeight;' +
'    }' +
'  </script>' +
'</body>' +
'</html>');
});

io.on('connection', function(socket) {
  socket.emit('prev', messages);
  socket.on('send', function(data) {
    const msg = {
      id: socket.id,
      u: data.u,
      t: data.t,
      time: new Date().toLocaleTimeString('ar-EG'),
      isAudio: data.isAudio || false
    };
    messages.push(msg);
    if (messages.length > 100) messages.shift();
    io.emit('msg', msg);
  });
});

// دالة لرفع الصوت إلى tmpfiles.org (للاستخدام من الخادم — لكننا نستخدمها من العميل)
// لا حاجة لدالة منفصلة لأننا نستخدم fetch مباشرة في JS

var PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', function() {
  console.log('✅ السيرفر شغال على المنفذ ' + PORT);
});
