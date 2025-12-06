const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

const port = process.env.PORT || 3000;

// ==========================================
// كود الصفحة (HTML + CSS + JS) مدمج هنا
// لضمان عدم ضياع الملفات وتشغيل الزر 100%
// ==========================================
const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Chat Moon 🌌</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- مكتبات الاتصال من روابط خارجية مضمونة -->
    <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/simple-peer/9.11.1/simplepeer.min.js"></script>

    <style>
        :root { --primary: #00f2ff; --bg: #090919; --glass: rgba(255,255,255,0.08); }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
        body { margin: 0; font-family: 'Tajawal', sans-serif; background: var(--bg); color: white; height: 100vh; overflow: hidden; }

        /* الخلفية */
        .stars { position: fixed; inset: 0; background: radial-gradient(circle at bottom, #1a1a40 0%, #000 100%); z-index: -1; }
        
        /* الشاشات */
        .screen { position: absolute; inset: 0; display: flex; flex-direction: column; transition: 0.3s; background: var(--bg); z-index: 10; }
        .hidden { display: none !important; }

        /* شاشة الدخول */
        .login-wrapper { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .login-box { padding: 40px 30px; background: var(--glass); border-radius: 20px; text-align: center; width: 90%; max-width: 400px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 0 20px rgba(0, 242, 255, 0.1); }
        
        input { width: 100%; padding: 15px; margin: 10px 0; background: rgba(0,0,0,0.5); border: 1px solid #333; border-radius: 12px; color: white; text-align: center; font-size: 16px; font-family: 'Tajawal'; transition: 0.3s; }
        input:focus { border-color: var(--primary); }
        
        .btn { width: 100%; padding: 15px; background: var(--primary); color: #000; font-weight: bold; border: none; border-radius: 12px; cursor: pointer; font-size: 18px; margin-top: 20px; transition: 0.2s; }
        .btn:active { transform: scale(0.95); }
        .btn:disabled { background: #555; cursor: not-allowed; }

        /* التطبيق */
        .app-layout { display: flex; height: 100%; width: 100%; flex-direction: column; }
        
        .header { padding: 10px 15px; height: 60px; background: rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
        .chat-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        
        .messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .msg { padding: 10px 15px; border-radius: 15px; max-width: 80%; font-size: 15px; word-wrap: break-word; position: relative; }
        .msg.me { align-self: flex-end; background: var(--primary); color: #000; border-bottom-left-radius: 2px; }
        .msg.other { align-self: flex-start; background: #222; border-bottom-right-radius: 2px; }
        .sender-name { font-size: 10px; margin-bottom: 3px; opacity: 0.7; }

        .input-bar { padding: 10px; background: rgba(0,0,0,0.8); display: flex; gap: 10px; border-top: 1px solid #333; }
        
        /* الغرفة الصوتية */
        .voice-btn { color: #ff4081; cursor: pointer; font-size: 22px; padding: 0 10px; transition: 0.3s; }
        .voice-active { color: #00e676; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { text-shadow: 0 0 0 rgba(0, 230, 118, 0.7); } 100% { text-shadow: 0 0 20px rgba(0,0,0,0); } }

        /* القائمة الجانبية (للموبايل) */
        .drawer { position: fixed; top: 0; right: -250px; width: 250px; height: 100%; background: #111; z-index: 100; transition: 0.3s; border-left: 1px solid #333; padding: 20px; }
        .drawer.open { right: 0; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; display: none; }
        .overlay.show { display: block; }

        .user-item { padding: 10px; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 10px; }
        .dot { width: 8px; height: 8px; background: #00e676; border-radius: 50%; }

    </style>
</head>
<body>

    <div class="stars"></div>

    <!-- شاشة الدخول -->
    <div id="login-screen" class="screen">
        <div class="login-wrapper">
            <div class="login-box">
                <h1 style="color:var(--primary); margin:0 0 10px;">Chat Moon</h1>
                <p style="color:#aaa; margin-bottom: 30px;">سيرفر سوري خاص 🇸🇾</p>
                
                <input type="text" id="username" placeholder="اسمك المستعار">
                <div style="position:relative;">
                    <span style="position:absolute; left:15px; top:15px; color:var(--primary); font-weight:bold;">+963</span>
                    <input type="tel" id="phone" placeholder="9xx xxx xxx" style="direction:ltr; padding-left:60px; font-weight:bold;">
                </div>
                
                <button id="login-btn" class="btn" onclick="attemptLogin()">دخول</button>
                <p id="status" style="margin-top:15px; font-size:12px; color:#aaa;"></p>
            </div>
        </div>
    </div>

    <!-- شاشة التطبيق -->
    <div id="app-screen" class="screen hidden">
        <div class="app-layout">
            <div class="header">
                <div style="display:flex; align-items:center; gap:15px;">
                    <i class="fas fa-bars" style="font-size:20px; cursor:pointer;" onclick="toggleDrawer()"></i>
                    <div style="font-weight:bold;">الغرفة العامة 🚀</div>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <i id="mic-icon" class="fas fa-microphone voice-btn" onclick="toggleVoice()"></i>
                </div>
            </div>

            <div id="msgs-area" class="messages"></div>

            <div class="input-bar">
                <input type="text" id="msg-input" placeholder="اكتب رسالة..." onkeypress="if(event.key==='Enter') sendMsg()">
                <button class="btn" style="width:auto; margin:0; padding:10px 20px;" onclick="sendMsg()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    </div>

    <!-- القائمة الجانبية -->
    <div id="overlay" class="overlay" onclick="toggleDrawer()"></div>
    <div id="drawer" class="drawer">
        <h3 style="margin-top:0;">المتصلين</h3>
        <div id="users-list"></div>
        <button class="btn" style="background:#ff4444; margin-top:auto;" onclick="location.reload()">خروج</button>
    </div>

    <!-- الصوت -->
    <div id="audio-container"></div>

    <script>
        // إعداد الاتصال بالسيرفر
        const socket = io();
        let myData = {};
        let peers = {};
        let myStream = null;

        // التأكد من الاتصال
        socket.on('connect', () => {
            document.getElementById('status').innerText = "تم الاتصال بالسيرفر ✅";
            document.getElementById('status').style.color = "#00e676";
        });

        socket.on('disconnect', () => {
            document.getElementById('status').innerText = "جاري الاتصال...";
            document.getElementById('status').style.color = "yellow";
        });

        function attemptLogin() {
            const name = document.getElementById('username').value;
            let phone = document.getElementById('phone').value;
            const btn = document.getElementById('login-btn');

            if(!name) return alert("الرجاء كتابة الاسم");
            
            // تنظيف الرقم
            phone = phone.replace(/[^0-9]/g, '');
            if(phone.length < 8) return alert("الرقم قصير جداً");

            btn.innerText = "جاري الدخول...";
            btn.disabled = true;

            // محاكاة سريعة للكود (بدون prompt لأنه يسبب مشاكل)
            setTimeout(() => {
                const code = Math.floor(1000 + Math.random() * 9000);
                // استخدام confirm بدلاً من prompt لأنه مدعوم أكثر
                const userConfirmed = confirm(\`كود التحقق الخاص بك هو: \${code}\\n\\nهل تريد الدخول؟\`);
                
                if(userConfirmed) {
                    myData = { name: name, phone: "+963" + phone };
                    socket.emit('join-user', myData);
                    
                    document.getElementById('login-screen').classList.add('hidden');
                    document.getElementById('app-screen').classList.remove('hidden');
                } else {
                    btn.innerText = "دخول";
                    btn.disabled = false;
                }
            }, 800);
        }

        // --- إدارة الشات ---
        socket.on('update-users', (users) => {
            const list = document.getElementById('users-list');
            list.innerHTML = '';
            users.forEach(u => {
                const div = document.createElement('div');
                div.className = 'user-item';
                div.innerHTML = \`<div class="dot"></div> \${u.name}\`;
                list.appendChild(div);
            });
        });

        socket.on('receive-msg', (msg) => {
            const area = document.getElementById('msgs-area');
            const div = document.createElement('div');
            const isMe = msg.id === socket.id;
            
            div.className = \`msg \${isMe ? 'me' : 'other'}\`;
            div.innerHTML = \`
                \${!isMe ? \`<div class="sender-name">\${msg.name}</div>\` : ''}
                \${msg.text}
            \`;
            area.appendChild(div);
            area.scrollTop = area.scrollHeight;
        });

        function sendMsg() {
            const input = document.getElementById('msg-input');
            const txt = input.value;
            if(!txt) return;
            
            socket.emit('send-msg', { text: txt, name: myData.name });
            input.value = '';
        }

        function toggleDrawer() {
            document.getElementById('drawer').classList.toggle('open');
            document.getElementById('overlay').classList.toggle('show');
        }

        // --- نظام الصوت (WebRTC) ---
        async function toggleVoice() {
            const icon = document.getElementById('mic-icon');
            
            if(myStream) {
                // إغلاق المايك
                myStream.getTracks().forEach(t => t.stop());
                myStream = null;
                icon.classList.remove('voice-active');
                socket.emit('voice-end');
                // إعادة التحميل لتنظيف الاتصالات
                alert("تم إنهاء المكالمة");
                location.reload(); 
            } else {
                try {
                    myStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    icon.classList.add('voice-active');
                    
                    // إعلام الجميع أنني بدأت التحدث
                    socket.emit('voice-start');
                    
                } catch(e) {
                    alert("لا يمكن الوصول للمايكروفون. تأكد أن الرابط HTTPS");
                }
            }
        }

        // استقبال إشارة صوتية
        socket.on('voice-signal', (data) => {
            const peer = new SimplePeer({
                initiator: false,
                stream: myStream,
                trickle: false
            });
            
            peer.on('signal', signal => {
                socket.emit('return-signal', { signal, callerId: data.callerId });
            });

            peer.on('stream', stream => {
                const audio = document.createElement('audio');
                audio.srcObject = stream;
                audio.play();
                document.getElementById('audio-container').appendChild(audio);
            });

            peer.signal(data.signal);
        });

        socket.on('user-joined-voice', (callerId) => {
            // أنا موجود، وشخص جديد دخل ويريد التحدث، سأتصل به
            if(myStream) {
                const peer = new SimplePeer({
                    initiator: true,
                    stream: myStream,
                    trickle: false
                });

                peer.on('signal', signal => {
                    socket.emit('offer-signal', { signal, targetId: callerId });
                });

                peers[callerId] = peer;
            }
        });

        socket.on('receive-return-signal', (data) => {
            if(peers[data.id]) {
                peers[data.id].signal(data.signal);
            }
        });

    </script>
</body>
</html>
`;

// مسار السيرفر الأساسي
app.get('/', (req, res) => {
    res.send(htmlContent);
});

// متغيرات السيرفر
let users = [];

io.on('connection', (socket) => {
    
    socket.on('join-user', (user) => {
        users.push({ id: socket.id, ...user });
        io.emit('update-users', users);
        io.emit('receive-msg', { id: 'sys', name: 'System', text: `انضم ${user.name} للمحادثة` });
    });

    socket.on('send-msg', (data) => {
        io.emit('receive-msg', { id: socket.id, name: data.name, text: data.text });
    });

    // WebRTC Signaling
    socket.on('voice-start', () => {
        socket.broadcast.emit('user-joined-voice', socket.id);
    });

    socket.on('offer-signal', (data) => {
        io.to(data.targetId).emit('voice-signal', { signal: data.signal, callerId: socket.id });
    });

    socket.on('return-signal', (data) => {
        io.to(data.callerId).emit('receive-return-signal', { signal: data.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        users = users.filter(u => u.id !== socket.id);
        io.emit('update-users', users);
    });
});

http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
