const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // السماح بملفات حتى 100 ميغا (للصور والصوت)
});

const port = process.env.PORT || 3000;

// ========================================================
// واجهة التطبيق (HTML/CSS/JS) مدمجة لضمان العمل
// ========================================================
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
            --msg-me: #005c4b; --msg-other: #202c33; --accent: #00a884;
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; user-select: none; }
        body { margin: 0; font-family: 'Tajawal', sans-serif; background: var(--bg-dark); color: white; height: 100vh; overflow: hidden; }

        /* الخلفية الفضائية */
        .stars { position: fixed; inset: 0; background: radial-gradient(circle at bottom, #1b2735 0%, #090a0f 100%); z-index: -1; }
        .stars::after { content: ""; position: absolute; inset: 0; background-image: radial-gradient(white 1px, transparent 1px); background-size: 50px 50px; opacity: 0.1; }

        /* الشاشات */
        .screen { position: absolute; inset: 0; display: flex; flex-direction: column; transition: 0.4s; background: var(--bg-dark); z-index: 10; }
        .hidden { display: none !important; }

        /* شاشة الدخول */
        .login-box { margin: auto; padding: 40px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 20px; text-align: center; width: 90%; max-width: 400px; box-shadow: 0 0 30px rgba(0, 229, 255, 0.1); backdrop-filter: blur(10px); }
        .logo { font-size: 60px; color: var(--primary); animation: float 3s infinite ease-in-out; margin-bottom: 20px; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        
        input { width: 100%; padding: 15px; margin: 10px 0; background: rgba(0,0,0,0.3); border: 1px solid #333; border-radius: 12px; color: white; text-align: center; font-size: 16px; font-family: 'Tajawal'; }
        .btn { width: 100%; padding: 15px; background: linear-gradient(90deg, var(--secondary), var(--primary)); border: none; border-radius: 12px; color: white; font-weight: bold; font-size: 18px; margin-top: 20px; cursor: pointer; }

        /* تصميم الشات (واتساب ستايل) */
        .app-layout { display: flex; flex-direction: column; height: 100%; }
        
        /* الهيدر */
        .header { height: 65px; background: rgba(31, 44, 52, 0.95); display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #333; justify-content: space-between; }
        .chat-info { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background: #555; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .typing-indicator { font-size: 11px; color: var(--primary); display: none; }

        /* منطقة الرسائل */
        .chat-area { flex: 1; background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-color: #0b141a; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .messages-list { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 5px; }
        
        /* فقاعات الرسائل */
        .msg { max-width: 75%; padding: 8px 12px; border-radius: 10px; font-size: 15px; position: relative; word-wrap: break-word; line-height: 1.4; display: flex; flex-direction: column; }
        .msg.me { align-self: flex-end; background: var(--msg-me); border-top-left-radius: 10px; border-top-right-radius: 0; }
        .msg.other { align-self: flex-start; background: var(--msg-other); border-top-left-radius: 0; }
        
        .msg-content { margin-bottom: 5px; }
        .msg-meta { font-size: 10px; color: rgba(255,255,255,0.6); align-self: flex-end; display: flex; align-items: center; gap: 3px; }
        .tick { color: #4fc3f7; font-size: 12px; } /* الأزرق لصحين القراءة */

        /* الصور والصوت */
        .msg-img { max-width: 100%; border-radius: 8px; margin-top: 5px; cursor: pointer; }
        audio { height: 35px; width: 220px; filter: invert(0.9); margin-top: 5px; }

        /* شريط الكتابة */
        .input-bar { min-height: 60px; background: #202c33; display: flex; align-items: center; padding: 5px 10px; gap: 8px; z-index: 5; }
        .chat-input { flex: 1; background: #2a3942; border-radius: 20px; padding: 10px 15px; color: white; border: none; font-family: inherit; font-size: 15px; max-height: 100px; overflow-y: auto; }
        .icon-btn { color: #8696a0; font-size: 22px; padding: 8px; cursor: pointer; transition: 0.2s; }
        .icon-btn:hover { color: var(--primary); }
        
        /* تسجيل الصوت */
        .recording-ui { position: absolute; bottom: 0; left: 0; width: 100%; height: 60px; background: #202c33; display: none; align-items: center; padding: 0 20px; justify-content: space-between; z-index: 10; animation: slideUp 0.3s; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .rec-dot { width: 12px; height: 12px; background: red; border-radius: 50%; animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0; } }

        /* الغرفة الصوتية (Overlay) */
        .voice-room-overlay { position: fixed; top: 65px; left: 0; width: 100%; height: 100px; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 20; display: none; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--primary); }
        .active-users-voice { display: flex; gap: 10px; overflow-x: auto; }
        .voice-avatar { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #00e676; background: #333; display: flex; align-items: center; justify-content: center; position: relative; }
        .speaking { box-shadow: 0 0 15px #00e676; }

        /* الرد على رسالة */
        .reply-preview { position: absolute; bottom: 60px; left: 0; width: 100%; background: #15181f; padding: 10px; border-top: 2px solid var(--primary); display: none; z-index: 4; }
        .reply-content { background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 5px; color: #ccc; font-size: 13px; border-right: 4px solid var(--secondary); }

        /* القائمة الجانبية (Users) */
        .drawer { position: fixed; inset: 0; background: #111; z-index: 50; transform: translateX(100%); transition: 0.3s; display: flex; flex-direction: column; }
        .drawer.open { transform: translateX(0); }
        .user-row { padding: 15px; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 15px; }
        .online-dot { width: 10px; height: 10px; background: #00e676; border-radius: 50%; }

    </style>
</head>
<body>

    <div class="stars"></div>

    <!-- 1. شاشة الدخول -->
    <div id="login-screen" class="screen">
        <div class="login-box">
            <i class="fas fa-meteor logo"></i>
            <h1 style="color:white; margin:0;">Chat Moon</h1>
            <p style="color:#aaa;">تحديث واتساب الفضائي</p>
            
            <input type="text" id="username" placeholder="اسمك الظاهر">
            <div style="position:relative;">
                <span style="position:absolute; left:15px; top:15px; color:var(--primary); font-weight:bold;">+963</span>
                <input type="tel" id="phone" placeholder="9xx xxx xxx" style="direction:ltr; padding-left:60px; font-weight:bold;">
            </div>
            
            <button class="btn" onclick="login()">دخول</button>
        </div>
    </div>

    <!-- 2. الشات الرئيسي -->
    <div id="app-screen" class="screen hidden">
        <div class="app-layout">
            
            <!-- الهيدر -->
            <div class="header">
                <div class="chat-info" onclick="toggleDrawer()">
                    <i class="fas fa-bars icon-btn"></i>
                    <div style="font-weight:bold; font-size:18px;">المجموعة العامة</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <i class="fas fa-phone-alt icon-btn" onclick="toggleVoiceRoom()"></i>
                    <i class="fas fa-video icon-btn"></i>
                    <i class="fas fa-ellipsis-v icon-btn"></i>
                </div>
            </div>

            <!-- شريط الغرفة الصوتية -->
            <div id="voice-overlay" class="voice-room-overlay">
                <div style="color:#00e676; font-weight:bold;">
                    <i class="fas fa-microphone-alt"></i> الغرفة الصوتية
                </div>
                <div id="voice-users" class="active-users-voice"></div>
                <button onclick="toggleVoiceRoom()" style="background:#ff4444; border:none; color:white; padding:5px 10px; border-radius:5px;">خروج</button>
            </div>

            <!-- الرسائل -->
            <div id="chat-area" class="chat-area">
                <div id="msgs-list" class="messages-list"></div>
                
                <!-- معاينة الرد -->
                <div id="reply-preview" class="reply-preview">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span style="color:var(--primary); font-size:12px;">الرد على رسالة</span>
                        <i class="fas fa-times" style="cursor:pointer;" onclick="cancelReply()"></i>
                    </div>
                    <div id="reply-text" class="reply-content">نص الرسالة...</div>
                </div>
            </div>

            <!-- واجهة التسجيل -->
            <div id="recording-ui" class="recording-ui">
                <div style="display:flex; align-items:center; gap:10px; color:#ff4444;">
                    <div class="rec-dot"></div>
                    <span id="rec-timer">00:00</span>
                </div>
                <div style="color:#aaa;">جاري التسجيل...</div>
                <i class="fas fa-trash icon-btn" onclick="cancelRecord()" style="color:#ff4444;"></i>
            </div>

            <!-- شريط الإدخال -->
            <div class="input-bar">
                <i class="far fa-smile icon-btn"></i>
                
                <!-- زر الصور -->
                <label for="img-input">
                    <i class="fas fa-camera icon-btn"></i>
                </label>
                <input type="file" id="img-input" accept="image/*" style="display:none;" onchange="sendImage(this)">

                <input type="text" id="msg-input" class="chat-input" placeholder="رسالة" oninput="handleTyping()">
                
                <i class="fas fa-paperclip icon-btn"></i>
                
                <!-- زر التسجيل/الإرسال -->
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
            <button class="btn" style="background:#333;" onclick="location.reload()">تسجيل الخروج</button>
        </div>
    </div>

    <script>
        const socket = io();
        let myData = {};
        
        // --- متغيرات الصوت والغرف ---
        let localStream = null;
        let peers = {}; 
        let isVoiceActive = false;

        // --- متغيرات التسجيل ---
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        let recStartTime;
        let recInterval;

        // --- متغيرات الرد ---
        let replyingTo = null;

        // ==========================================
        // 1. الدخول والتوثيق
        // ==========================================
        function login() {
            const name = document.getElementById('username').value;
            let phone = document.getElementById('phone').value;

            if(!name) return alert("الاسم مطلوب");
            phone = phone.replace(/[^0-9]/g, '');
            if(phone.length < 8) return alert("الرقم غير صحيح");

            myData = { name: name, phone: "+963" + phone };

            // محاكاة التحقق
            if(confirm("هل أنت متأكد من الرقم " + myData.phone + "؟")) {
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
                div.innerHTML = \`<div class="online-dot"></div> <div>\${u.name} <small style="color:#aaa;">\${u.phone}</small></div>\`;
                list.appendChild(div);
            });
            // تحديث الهيدر بعدد المتصلين
            // document.querySelector('.header small').innerText = \`\${users.length} متصل\`;
        });

        // ==========================================
        // 2. الشات (نص، صور، صوت)
        // ==========================================
        
        // الكتابة
        const input = document.getElementById('msg-input');
        const micBtn = document.getElementById('mic-btn');
        const sendBtn = document.getElementById('send-btn');

        function handleTyping() {
            if(input.value.length > 0) {
                micBtn.style.display = 'none';
                sendBtn.style.display = 'block';
                socket.emit('typing', true);
            } else {
                micBtn.style.display = 'block';
                sendBtn.style.display = 'none';
                socket.emit('typing', false);
            }
        }

        function sendText() {
            const txt = input.value;
            if(!txt) return;

            const msgData = {
                type: 'text',
                text: txt,
                sender: myData.name,
                reply: replyingTo
            };
            
            socket.emit('msg', msgData);
            input.value = '';
            handleTyping();
            cancelReply();
        }

        // إرسال صورة
        function sendImage(elem) {
            const file = elem.files[0];
            if(!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                // ضغط الصورة (اختياري) ولكن نرسل Base64 مباشرة
                socket.emit('msg', {
                    type: 'image',
                    content: e.target.result,
                    sender: myData.name
                });
            };
            reader.readAsDataURL(file);
        }

        // استقبال الرسائل
        socket.on('msg', (data) => {
            const list = document.getElementById('msgs-list');
            const div = document.createElement('div');
            const isMe = data.id === socket.id;

            div.className = \`msg \${isMe ? 'me' : 'other'}\`;
            
            // محتوى الرد
            let replyHtml = '';
            if(data.reply) {
                replyHtml = \`
                    <div style="background:rgba(0,0,0,0.2); padding:5px; border-radius:5px; margin-bottom:5px; border-right:3px solid var(--secondary); font-size:12px;">
                        <strong>\${data.reply.sender}</strong><br>\${data.reply.text}
                    </div>
                \`;
            }

            // محتوى الرسالة حسب النوع
            let contentHtml = '';
            if(data.type === 'text') {
                contentHtml = \`<div class="msg-content">\${data.text}</div>\`;
            } else if (data.type === 'image') {
                contentHtml = \`<img src="\${data.content}" class="msg-img" onclick="window.open(this.src)">\`;
            } else if (data.type === 'audio') {
                contentHtml = \`<audio controls src="\${data.content}"></audio>\`;
            }

            // الاسم والتوقيت والصحين
            div.innerHTML = \`
                \${!isMe ? \`<div style="font-weight:bold; color:\${stringToColor(data.sender)}; font-size:12px; margin-bottom:2px;">\${data.sender}</div>\` : ''}
                \${replyHtml}
                \${contentHtml}
                <div class="msg-meta">
                    \${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    \${isMe ? '<i class="fas fa-check-double tick"></i>' : ''}
                </div>
            \`;

            // إضافة خاصية الرد عند النقر
            if(data.type === 'text') {
                div.ondblclick = () => setReply({ sender: data.sender, text: data.text });
            }

            list.appendChild(div);
            list.scrollTop = list.scrollHeight;
        });

        // ==========================================
        // 3. تسجيل الصوت (Voice Notes)
        // ==========================================
        async function startRecord() {
            if(input.value.length > 0) return; // إذا كان يكتب نصاً لا تسجل
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    if(!isRecording) return; // تم الإلغاء
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob); 
                    reader.onloadend = () => {
                        const base64data = reader.result;
                        socket.emit('msg', {
                            type: 'audio',
                            content: base64data,
                            sender: myData.name
                        });
                    };
                };

                mediaRecorder.start();
                isRecording = true;
                
                // UI Update
                document.getElementById('recording-ui').style.display = 'flex';
                recStartTime = Date.now();
                recInterval = setInterval(() => {
                    const diff = Math.floor((Date.now() - recStartTime) / 1000);
                    const m = Math.floor(diff / 60).toString().padStart(2, '0');
                    const s = (diff % 60).toString().padStart(2, '0');
                    document.getElementById('rec-timer').innerText = \`\${m}:\${s}\`;
                }, 1000);

            } catch(e) {
                alert("يرجى السماح بالمايكروفون");
            }
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

        // ==========================================
        // 4. الغرفة الصوتية (WebRTC + STUN)
        // ==========================================
        async function toggleVoiceRoom() {
            const overlay = document.getElementById('voice-overlay');
            
            if(isVoiceActive) {
                // خروج
                overlay.style.display = 'none';
                if(localStream) {
                    localStream.getTracks().forEach(t => t.stop());
                    localStream = null;
                }
                // قطع الاتصال
                Object.values(peers).forEach(p => p.destroy());
                peers = {};
                isVoiceActive = false;
                socket.emit('leave-voice');
                document.getElementById('voice-users').innerHTML = '';
            } else {
                // دخول
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    overlay.style.display = 'flex';
                    isVoiceActive = true;
                    
                    // إضافة صورتي
                    addVoiceUser(socket.id, myData.name, true);
                    
                    socket.emit('join-voice');
                    
                } catch(e) {
                    alert("فشل الوصول للمايكروفون");
                }
            }
        }

        // استقبال إشارة الدخول للغرفة الصوتية
        socket.on('user-connected-voice', (userId) => {
            const peer = createPeer(userId, socket.id, localStream);
            peers[userId] = peer;
            // إضافة أيقونة المستخدم (سنطلب الاسم لاحقاً)
            addVoiceUser(userId, "مستخدم", false); 
        });

        socket.on('voice-signal', payload => {
            const item = peers[payload.callerID];
            if (item) {
                item.signal(payload.signal);
            } else {
                // الرد على اتصال وارد
                const peer = addPeer(payload.signal, payload.callerID, localStream);
                peers[payload.callerID] = peer;
                addVoiceUser(payload.callerID, "مستخدم", false);
            }
        });

        socket.on('user-left-voice', id => {
            if(peers[id]) peers[id].destroy();
            delete peers[id];
            const el = document.getElementById('v-user-'+id);
            if(el) el.remove();
        });

        // دوال WebRTC المساعدة (SimplePeer مع STUN)
        function createPeer(userToSignal, callerID, stream) {
            const peer = new SimplePeer({
                initiator: true,
                trickle: false,
                stream: stream,
                config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } // الحل السحري للصوت
            });

            peer.on("signal", signal => {
                socket.emit("voice-signal", { userToSignal, callerID, signal });
            });

            peer.on("stream", stream => {
                const audio = document.createElement('audio');
                audio.srcObject = stream;
                audio.play();
                document.body.appendChild(audio); // إضافة الصوت للصفحة
            });

            return peer;
        }

        function addPeer(incomingSignal, callerID, stream) {
            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: stream,
                config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
            });

            peer.on("signal", signal => {
                socket.emit("voice-signal", { userToSignal: callerID, callerID: socket.id, signal });
            });

            peer.on("stream", stream => {
                const audio = document.createElement('audio');
                audio.srcObject = stream;
                audio.play();
                document.body.appendChild(audio);
            });

            peer.signal(incomingSignal);
            return peer;
        }

        function addVoiceUser(id, name, isMe) {
            const container = document.getElementById('voice-users');
            if(document.getElementById('v-user-'+id)) return;
            
            const div = document.createElement('div');
            div.id = 'v-user-'+id;
            div.className = 'voice-avatar ' + (isMe ? 'speaking' : '');
            div.innerHTML = '<i class="fas fa-user-astronaut"></i>';
            container.appendChild(div);
        }

        // ==========================================
        // أدوات مساعدة UI
        // ==========================================
        function toggleDrawer() {
            document.getElementById('drawer').classList.toggle('open');
        }

        function setReply(msg) {
            replyingTo = msg;
            document.getElementById('reply-preview').style.display = 'block';
            document.getElementById('reply-text').innerText = msg.text.substring(0, 50) + '...';
            document.getElementById('msg-input').focus();
        }

        function cancelReply() {
            replyingTo = null;
            document.getElementById('reply-preview').style.display = 'none';
        }

        function stringToColor(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
            return '#' + "00000".substring(0, 6 - c.length) + c;
        }

    </script>
</body>
</html>
`;

// ========================================================
// منطق السيرفر (Backend)
// ========================================================
app.get('/', (req, res) => res.send(htmlContent));

const users = {};
const socketToRoom = {};

io.on('connection', (socket) => {
    
    // الانضمام للتطبيق
    socket.on('join', (data) => {
        users[socket.id] = data;
        io.emit('update-users', Object.values(users));
    });

    // الرسائل
    socket.on('msg', (data) => {
        const fullMsg = { ...data, id: socket.id };
        io.emit('msg', fullMsg);
    });

    socket.on('typing', (isTyping) => {
        socket.broadcast.emit('user-typing', { id: socket.id, isTyping });
    });

    // الغرف الصوتية Signaling
    socket.on("join-voice", () => {
        // إعلام الآخرين أنني دخلت الغرفة الصوتية
        socket.broadcast.emit("user-connected-voice", socket.id);
    });

    socket.on("voice-signal", payload => {
        io.to(payload.userToSignal).emit('voice-signal', payload);
    });

    socket.on('leave-voice', () => {
        socket.broadcast.emit('user-left-voice', socket.id);
    });

    // الخروج
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
        io.emit('user-left-voice', socket.id);
    });
});

http.listen(port, () => {
    console.log(\`Server running on port \${port}\`);
});
