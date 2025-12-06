const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // السماح برفع ملفات حتى 100 ميغا
});

const port = process.env.PORT || 3000;

const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Chat Moon 🌌</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/simple-peer/9.11.1/simplepeer.min.js"></script>

    <style>
        :root {
            --primary: #00e5ff; --secondary: #7c4dff; --bg-dark: #090916;
            --glass: rgba(20, 20, 35, 0.85); --glass-border: rgba(255, 255, 255, 0.1);
            --msg-me: #005c4b; --msg-other: #202c33;
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; user-select: none; }
        body { margin: 0; font-family: 'Tajawal', sans-serif; background: var(--bg-dark); color: white; height: 100vh; overflow: hidden; }

        /* الخلفية والنجوم */
        .stars { position: fixed; inset: 0; background: radial-gradient(circle at bottom, #1b2735 0%, #090a0f 100%); z-index: -1; }
        .screen { position: absolute; inset: 0; display: flex; flex-direction: column; transition: 0.4s; background: var(--bg-dark); z-index: 10; }
        .hidden { display: none !important; }

        /* شاشة الدخول */
        .login-box { margin: auto; padding: 40px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 20px; text-align: center; width: 90%; max-width: 400px; backdrop-filter: blur(10px); }
        .logo { font-size: 60px; color: var(--primary); margin-bottom: 20px; animation: float 3s infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        
        input { width: 100%; padding: 15px; margin: 10px 0; background: rgba(0,0,0,0.3); border: 1px solid #333; border-radius: 12px; color: white; text-align: center; font-size: 16px; font-family: 'Tajawal'; }
        .btn { width: 100%; padding: 15px; background: linear-gradient(90deg, var(--secondary), var(--primary)); border: none; border-radius: 12px; color: white; font-weight: bold; font-size: 18px; margin-top: 20px; cursor: pointer; }

        /* تطبيق الشات */
        .app-layout { display: flex; flex-direction: column; height: 100%; }
        .header { height: 65px; background: rgba(31, 44, 52, 0.95); display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #333; justify-content: space-between; }
        
        .chat-area { flex: 1; background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-color: #0b141a; display: flex; flex-direction: column; position: relative; }
        .messages-list { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 5px; }

        /* الرسائل */
        .msg { max-width: 75%; padding: 8px 12px; border-radius: 10px; font-size: 15px; position: relative; word-wrap: break-word; line-height: 1.4; display: flex; flex-direction: column; }
        .msg.me { align-self: flex-end; background: var(--msg-me); border-top-left-radius: 10px; border-top-right-radius: 0; }
        .msg.other { align-self: flex-start; background: var(--msg-other); border-top-left-radius: 0; }
        .msg-meta { font-size: 10px; color: rgba(255,255,255,0.6); align-self: flex-end; display: flex; gap: 3px; margin-top: 2px; }
        .msg-img { max-width: 100%; border-radius: 8px; margin-top: 5px; cursor: pointer; }
        .sys-msg { align-self: center; background: rgba(0,255,255,0.1); padding: 5px 10px; border-radius: 10px; font-size: 12px; color: #aaa; margin: 5px 0; }

        /* شريط الكتابة */
        .input-bar { min-height: 60px; background: #202c33; display: flex; align-items: center; padding: 5px 10px; gap: 8px; }
        .chat-input { flex: 1; background: #2a3942; border-radius: 20px; padding: 10px 15px; color: white; border: none; font-size: 15px; }
        .icon-btn { color: #8696a0; font-size: 22px; padding: 8px; cursor: pointer; transition: 0.2s; }
        .icon-btn:hover { color: var(--primary); }

        /* واجهة الغرفة الصوتية */
        .voice-room-overlay { position: fixed; top: 65px; left: 0; width: 100%; height: 80px; background: rgba(0,0,0,0.9); backdrop-filter: blur(5px); z-index: 20; display: none; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--primary); }
        .voice-avatar { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #00e676; background: #333; display: flex; align-items: center; justify-content: center; position: relative; margin-right: 5px; }
        .voice-pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.7); } 100% { box-shadow: 0 0 0 15px rgba(0,0,0,0); } }

        /* واجهة التسجيل */
        .recording-ui { position: absolute; bottom: 0; left: 0; width: 100%; height: 60px; background: #202c33; display: none; align-items: center; padding: 0 20px; justify-content: space-between; z-index: 10; }
        .rec-dot { width: 12px; height: 12px; background: red; border-radius: 50%; animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0; } }

        /* القائمة الجانبية */
        .drawer { position: fixed; inset: 0; background: #111; z-index: 50; transform: translateX(100%); transition: 0.3s; }
        .drawer.open { transform: translateX(0); }
        .user-row { padding: 15px; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 10px; }
        .online-dot { width: 10px; height: 10px; background: #00e676; border-radius: 50%; }
    </style>
</head>
<body>

    <div class="stars"></div>

    <!-- تسجيل الدخول -->
    <div id="login-screen" class="screen">
        <div class="login-box">
            <i class="fas fa-meteor logo"></i>
            <h1 style="color:white; margin:0;">Chat Moon</h1>
            <p style="color:#aaa;">سيرفر سوري - صوت مضمون 🔊</p>
            <input type="text" id="username" placeholder="اسمك المستعار">
            <div style="position:relative;">
                <span style="position:absolute; left:15px; top:15px; color:var(--primary); font-weight:bold;">+963</span>
                <input type="tel" id="phone" placeholder="9xx xxx xxx" style="direction:ltr; padding-left:60px; font-weight:bold;">
            </div>
            <button class="btn" onclick="login()">دخول</button>
        </div>
    </div>

    <!-- التطبيق -->
    <div id="app-screen" class="screen hidden">
        <div class="app-layout">
            <div class="header">
                <div style="display:flex; align-items:center; gap:10px;" onclick="toggleDrawer()">
                    <i class="fas fa-bars icon-btn"></i>
                    <div style="font-weight:bold; font-size:18px;">الغرفة العامة</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <i class="fas fa-phone-alt icon-btn" onclick="toggleVoiceRoom()" style="color:#00e676;"></i>
                    <i class="fas fa-ellipsis-v icon-btn"></i>
                </div>
            </div>

            <!-- شريط الغرفة الصوتية -->
            <div id="voice-overlay" class="voice-room-overlay">
                <div style="display:flex; align-items:center;">
                    <div style="margin-left:10px; color:#00e676; font-weight:bold; font-size:12px;">متصل<br>صوتياً</div>
                    <div id="voice-users" style="display:flex; overflow-x:auto;"></div>
                </div>
                <button onclick="toggleVoiceRoom()" style="background:#ff4444; border:none; color:white; padding:8px 15px; border-radius:8px;">خروج</button>
            </div>

            <div class="chat-area">
                <div id="msgs-list" class="messages-list"></div>
                
                <div id="recording-ui" class="recording-ui">
                    <div style="display:flex; align-items:center; gap:10px; color:#ff4444;">
                        <div class="rec-dot"></div> <span id="rec-timer">00:00</span>
                    </div>
                    <i class="fas fa-trash icon-btn" onclick="cancelRecord()" style="color:#ff4444;"></i>
                </div>
            </div>

            <div class="input-bar">
                <i class="far fa-smile icon-btn"></i>
                <label for="img-input"><i class="fas fa-camera icon-btn"></i></label>
                <input type="file" id="img-input" accept="image/*" style="display:none;" onchange="sendImage(this)">
                
                <input type="text" id="msg-input" class="chat-input" placeholder="رسالة" oninput="handleTyping()">
                
                <i id="mic-btn" class="fas fa-microphone icon-btn" onmousedown="startRecord()" onmouseup="stopRecord()" ontouchstart="startRecord()" ontouchend="stopRecord()"></i>
                <i id="send-btn" class="fas fa-paper-plane icon-btn" style="display:none; color:var(--primary);" onclick="sendText()"></i>
            </div>
        </div>
    </div>

    <!-- القائمة الجانبية -->
    <div id="drawer" class="drawer">
        <div style="padding:20px; border-bottom:1px solid #333; display:flex; justify-content:space-between;">
            <h3>المتصلين</h3>
            <i class="fas fa-times icon-btn" onclick="toggleDrawer()"></i>
        </div>
        <div id="users-list" style="padding:10px;"></div>
        <div style="padding:20px; margin-top:auto;">
            <button class="btn" style="background:#333;" onclick="location.reload()">خروج</button>
        </div>
    </div>

    <!-- حاوية مخفية لعناصر الصوت -->
    <div id="audio-container" style="display:none;"></div>

    <script>
        const socket = io();
        let myData = {};
        
        // --- WebRTC المتغيرات (إصلاح الصوت) ---
        let localStream = null;
        let peers = {}; 
        let isVoiceActive = false;
        
        // خوادم STUN لضمان الاتصال عبر الإنترنت
        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ];

        // --- Login ---
        function login() {
            const name = document.getElementById('username').value;
            let phone = document.getElementById('phone').value;

            if(!name) return alert("الرجاء إدخال الاسم");
            phone = phone.replace(/[^0-9]/g, '');
            if(phone.length < 8) return alert("الرقم قصير جداً");

            myData = { name: name, phone: "+963" + phone };
            
            const code = Math.floor(1000 + Math.random() * 9000);
            if(confirm("كود Chat Moon هو: " + code + "\\nهل تريد الدخول؟")) {
                socket.emit('join', myData);
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app-screen').classList.remove('hidden');
            }
        }

        socket.on('update-users', (users) => {
            const list = document.getElementById('users-list');
            list.innerHTML = '';
            users.forEach(u => {
                const div = document.createElement('div');
                div.className = 'user-row';
                div.innerHTML = \`<div class="online-dot"></div> \${u.name} <small style="color:#aaa">\${u.phone}</small>\`;
                list.appendChild(div);
            });
        });

        // --- Chat Logic ---
        const input = document.getElementById('msg-input');
        const micBtn = document.getElementById('mic-btn');
        const sendBtn = document.getElementById('send-btn');

        function handleTyping() {
            if(input.value.length > 0) {
                micBtn.style.display = 'none';
                sendBtn.style.display = 'block';
            } else {
                micBtn.style.display = 'block';
                sendBtn.style.display = 'none';
            }
        }

        function sendText() {
            const txt = input.value;
            if(!txt) return;
            socket.emit('msg', { type: 'text', text: txt, sender: myData.name });
            input.value = '';
            handleTyping();
        }

        function sendImage(elem) {
            const file = elem.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    socket.emit('msg', { type: 'image', content: e.target.result, sender: myData.name });
                };
                reader.readAsDataURL(file);
            }
        }

        socket.on('msg', (data) => {
            const list = document.getElementById('msgs-list');
            const div = document.createElement('div');
            
            if(data.id === 'system') {
                div.className = 'sys-msg';
                div.innerText = data.text;
                list.appendChild(div);
                return;
            }

            const isMe = data.id === socket.id;
            div.className = \`msg \${isMe ? 'me' : 'other'}\`;
            
            let content = '';
            if(data.type === 'text') content = \`<div>\${data.text}</div>\`;
            if(data.type === 'image') content = \`<img src="\${data.content}" class="msg-img" onclick="window.open(this.src)">\`;
            if(data.type === 'audio') content = \`<audio controls src="\${data.content}" style="height:35px; width:200px;"></audio>\`;

            div.innerHTML = \`
                \${!isMe ? \`<small style="color:#00e5ff; font-weight:bold;">\${data.sender}</small>\` : ''}
                \${content}
                <div class="msg-meta">
                    \${new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    \${isMe ? '<i class="fas fa-check-double"></i>' : ''}
                </div>
            \`;
            list.appendChild(div);
            list.scrollTop = list.scrollHeight;
        });

        // --- Voice Room Logic (WebRTC STUN Fixed) ---
        async function toggleVoiceRoom() {
            const overlay = document.getElementById('voice-overlay');
            
            if(isVoiceActive) {
                // مغادرة
                overlay.style.display = 'none';
                if(localStream) {
                    localStream.getTracks().forEach(t => t.stop());
                    localStream = null;
                }
                socket.emit('leave-voice');
                
                Object.values(peers).forEach(p => p.destroy());
                peers = {};
                isVoiceActive = false;
                document.getElementById('voice-users').innerHTML = '';
            } else {
                // دخول
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    overlay.style.display = 'flex';
                    isVoiceActive = true;
                    addVoiceUser(socket.id); 
                    socket.emit('join-voice');
                } catch(e) {
                    alert("يجب السماح باستخدام المايكروفون");
                }
            }
        }

        function addVoiceUser(id) {
            const box = document.getElementById('voice-users');
            if(document.getElementById('v-'+id)) return;
            const div = document.createElement('div');
            div.id = 'v-'+id;
            div.className = 'voice-avatar voice-pulse';
            div.innerHTML = '<i class="fas fa-user-astronaut"></i>';
            box.appendChild(div);
        }

        socket.on('user-connected-voice', (userId) => {
            const peer = createPeer(userId, socket.id, localStream);
            peers[userId] = peer;
            addVoiceUser(userId);
        });

        socket.on('voice-signal', (payload) => {
            const item = peers[payload.callerID];
            if(item) {
                item.signal(payload.signal);
            } else {
                const peer = addPeer(payload.signal, payload.callerID, localStream);
                peers[payload.callerID] = peer;
                addVoiceUser(payload.callerID);
            }
        });

        socket.on('user-left-voice', (id) => {
            if(peers[id]) peers[id].destroy();
            delete peers[id];
            const el = document.getElementById('v-'+id);
            if(el) el.remove();
        });

        function createPeer(userToSignal, callerID, stream) {
            const peer = new SimplePeer({
                initiator: true,
                trickle: false,
                stream: stream,
                config: { iceServers: iceServers } // STUN Config
            });
            peer.on("signal", signal => {
                socket.emit("voice-signal", { userToSignal, callerID, signal });
            });
            peer.on("stream", stream => {
                playStream(stream);
            });
            return peer;
        }

        function addPeer(incomingSignal, callerID, stream) {
            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: stream,
                config: { iceServers: iceServers } // STUN Config
            });
            peer.on("signal", signal => {
                socket.emit("voice-signal", { userToSignal: callerID, callerID: socket.id, signal });
            });
            peer.on("stream", stream => {
                playStream(stream);
            });
            peer.signal(incomingSignal);
            return peer;
        }

        function playStream(stream) {
            const audio = document.createElement('audio');
            audio.srcObject = stream;
            audio.autoplay = true;
            audio.playsInline = true; // مهم للموبايل
            document.getElementById('audio-container').appendChild(audio);
        }

        // --- Recording Logic ---
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        let recInterval;
        
        async function startRecord() {
            if(input.value.length > 0) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                
                mediaRecorder.onstop = () => {
                    if(!isRecording) return;
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        socket.emit('msg', { type: 'audio', content: reader.result, sender: myData.name });
                    };
                };

                mediaRecorder.start();
                isRecording = true;
                document.getElementById('recording-ui').style.display = 'flex';
                
                let sec = 0;
                recInterval = setInterval(() => {
                    sec++;
                    const m = Math.floor(sec / 60).toString().padStart(2, '0');
                    const s = (sec % 60).toString().padStart(2, '0');
                    document.getElementById('rec-timer').innerText = \`\${m}:\${s}\`;
                }, 1000);

            } catch(e) { console.log(e); }
        }

        function stopRecord() {
            if(mediaRecorder && isRecording) {
                mediaRecorder.stop();
                resetRecUI();
            }
        }

        function cancelRecord() {
            isRecording = false;
            if(mediaRecorder) mediaRecorder.stop();
            resetRecUI();
        }

        function resetRecUI() {
            document.getElementById('recording-ui').style.display = 'none';
            clearInterval(recInterval);
            document.getElementById('rec-timer').innerText = "00:00";
        }

        function toggleDrawer() {
            document.getElementById('drawer').classList.toggle('open');
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlContent));

// --- Server Logic ---
let users = {};

io.on('connection', (socket) => {
    
    socket.on('join', (data) => {
        users[socket.id] = data;
        io.emit('update-users', Object.values(users));
        socket.broadcast.emit('msg', { type: 'text', text: `انضم ${data.name}`, sender: 'النظام', id: 'system', timestamp: Date.now() });
    });

    socket.on('msg', (data) => {
        const fullMsg = { ...data, id: socket.id, timestamp: Date.now() };
        io.emit('msg', fullMsg);
    });

    socket.on('join-voice', () => {
        socket.broadcast.emit('user-connected-voice', socket.id);
    });

    socket.on('voice-signal', (payload) => {
        io.to(payload.userToSignal).emit('voice-signal', payload);
    });

    socket.on('leave-voice', () => {
        socket.broadcast.emit('user-left-voice', socket.id);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
        io.emit('user-left-voice', socket.id);
    });
});

http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
