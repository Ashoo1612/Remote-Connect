const SERVER_URL = 'wss://remote-connect--ashoorosh.replit.app/ws';

let ws = null;
let pc = null;
let localStream = null;
let dataChannel = null;
let partnerId = null;
let remotePartnerId = null;
let role = null;
let sessionStartTime = null;
let timerInterval = null;
let controlEnabled = false;
let remoteControlEnabled = false;
let blankScreenEnabled = false;

const elements = {
  partnerId: document.getElementById('partnerId'),
  connectionStatus: document.getElementById('connectionStatus'),
  remoteIdInput: document.getElementById('remoteIdInput'),
  connectBtn: document.getElementById('connectBtn'),
  mainView: document.getElementById('mainView'),
  sessionView: document.getElementById('sessionView'),
  sourceSelector: document.getElementById('sourceSelector'),
  sourcesGrid: document.getElementById('sourcesGrid'),
  cancelSourceBtn: document.getElementById('cancelSourceBtn'),
  remoteVideo: document.getElementById('remoteVideo'),
  sharingIndicator: document.getElementById('sharingIndicator'),
  videoContainer: document.getElementById('videoContainer'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  sessionInfo: document.getElementById('sessionInfo'),
  sessionTimer: document.getElementById('sessionTimer'),
  controlToggle: document.getElementById('controlToggle'),
  controlStatus: document.getElementById('controlStatus'),
};

function generatePartnerId() {
  const digits = '0123456789';
  let id = '';
  for (let i = 0; i < 9; i++) {
    id += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return id;
}

function formatPartnerId(id) {
  if (!id) return '---';
  return id.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
}

function updateStatus(status, message) {
  elements.connectionStatus.className = `status ${status}`;
  elements.connectionStatus.innerHTML = `<span class="status-dot"></span><span>${message}</span>`;
}

function connectWebSocket() {
  partnerId = generatePartnerId();
  elements.partnerId.textContent = formatPartnerId(partnerId);
  
  ws = new WebSocket(SERVER_URL);
  
  ws.onopen = () => {
    updateStatus('online', 'Connected to server');
    elements.connectBtn.disabled = false;
    
    ws.send(JSON.stringify({
      type: 'join',
      from: partnerId,
      to: 'server',
      payload: { name: 'Desktop App' }
    }));
  };
  
  ws.onclose = () => {
    updateStatus('offline', 'Disconnected from server');
    elements.connectBtn.disabled = true;
    setTimeout(connectWebSocket, 3000);
  };
  
  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    updateStatus('offline', 'Connection error');
  };
  
  ws.onmessage = handleSignalingMessage;
}

async function handleSignalingMessage(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data.type);
  
  switch (data.type) {
    case 'connection-request':
      const accept = confirm(`${formatPartnerId(data.from)} wants to connect. Allow access?`);
      if (accept) {
        remotePartnerId = data.from;
        role = 'sharer';
        await startSharing();
      } else {
        sendSignal({ type: 'connection-declined', to: data.from });
      }
      break;
      
    case 'connection-declined':
      alert('Connection was declined');
      elements.connectBtn.disabled = false;
      elements.connectBtn.textContent = 'Connect';
      break;
      
    case 'offer':
      await handleOffer(data.payload, data.from);
      break;
      
    case 'answer':
      await handleAnswer(data.payload);
      break;
      
    case 'ice-candidate':
      await handleIceCandidate(data.payload);
      break;
      
    case 'end-session':
    case 'session-ended':
      endSession();
      break;
  }
}

function sendSignal(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ...message, from: partnerId }));
  }
}

function createPeerConnection(isInitiator) {
  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };
  
  pc = new RTCPeerConnection(config);
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal({
        type: 'ice-candidate',
        to: remotePartnerId,
        payload: event.candidate
      });
    }
  };
  
  pc.ontrack = (event) => {
    console.log('Received remote track');
    elements.remoteVideo.srcObject = event.streams[0];
  };
  
  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      endSession();
    }
  };
  
  if (isInitiator) {
    dataChannel = pc.createDataChannel('control');
    setupDataChannel(dataChannel);
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel(dataChannel);
    };
  }
  
  return pc;
}

function setupDataChannel(channel) {
  channel.onopen = () => console.log('Data channel opened');
  channel.onmessage = (event) => handleDataChannelMessage(JSON.parse(event.data));
  channel.onclose = () => console.log('Data channel closed');
}

function handleDataChannelMessage(data) {
  switch (data.type) {
    case 'mouse-move':
      if (role === 'sharer' && controlEnabled && window.electronAPI) {
        window.electronAPI.sendMouseMove(data.x, data.y);
      }
      break;
    case 'mouse-click':
      if (role === 'sharer' && controlEnabled && window.electronAPI) {
        window.electronAPI.sendMouseClick(data.x, data.y, data.button);
      }
      break;
    case 'mouse-scroll':
      if (role === 'sharer' && controlEnabled && window.electronAPI) {
        window.electronAPI.sendMouseScroll(data.deltaX, data.deltaY);
      }
      break;
    case 'key-event':
      if (role === 'sharer' && controlEnabled && window.electronAPI) {
        window.electronAPI.sendKeyEvent(data.key, data.eventType, data.ctrlKey, data.shiftKey, data.altKey);
      }
      break;
    case 'control-toggle':
      if (role === 'sharer') {
        controlEnabled = data.enabled;
        updateControlStatus();
        if (window.electronAPI) window.electronAPI.setControlEnabled(controlEnabled);
      } else {
        remoteControlEnabled = data.enabled;
        updateControllerStatus();
      }
      break;
    case 'blank-screen':
      if (role === 'sharer' && window.electronAPI) {
        window.electronAPI.blankScreen(data.enabled, data.mode, data.html);
        blankScreenEnabled = data.enabled;
        sendDataChannelMessage({ type: 'blank-screen-ack', enabled: data.enabled });
      }
      break;
    case 'blank-screen-ack':
      blankScreenEnabled = data.enabled;
      updateBlankScreenStatus();
      break;
  }
}

function sendDataChannelMessage(data) {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(data));
  }
}

async function showSourceSelector() {
  if (!window.electronAPI) return null;
  
  const sources = await window.electronAPI.getSources();
  elements.sourcesGrid.innerHTML = '';
  
  return new Promise((resolve) => {
    sources.forEach(source => {
      const item = document.createElement('div');
      item.className = 'source-item';
      item.innerHTML = `<img src="${source.thumbnail}" alt="${source.name}"><div class="name">${source.name}</div>`;
      item.onclick = () => {
        elements.sourceSelector.classList.remove('active');
        resolve(source.id);
      };
      elements.sourcesGrid.appendChild(item);
    });
    
    elements.sourceSelector.classList.add('active');
    elements.cancelSourceBtn.onclick = () => {
      elements.sourceSelector.classList.remove('active');
      resolve(null);
    };
  });
}

async function startSharing() {
  try {
    const sourceId = await showSourceSelector();
    if (!sourceId) {
      sendSignal({ type: 'connection-declined', to: remotePartnerId });
      return;
    }
    
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } }
    });
    
    pc = createPeerConnection(true);
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ type: 'offer', to: remotePartnerId, payload: offer });
    
    showSessionView();
    elements.sharingIndicator.style.display = 'block';
    elements.remoteVideo.style.display = 'none';
    elements.controlToggle.style.display = 'flex';
  } catch (err) {
    console.error('Error:', err);
    alert('Failed to start screen sharing');
  }
}

async function handleOffer(offer, from) {
  remotePartnerId = from;
  role = 'controller';
  
  pc = createPeerConnection(false);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  sendSignal({ type: 'answer', to: remotePartnerId, payload: answer });
  
  showSessionView();
  elements.sharingIndicator.style.display = 'none';
  elements.remoteVideo.style.display = 'block';
  document.getElementById('controllerStatusBadge').style.display = 'inline-block';
  document.getElementById('blankScreenControls').style.display = 'flex';
  
  setupControllerEvents();
}

async function handleAnswer(answer) {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIceCandidate(candidate) {
  if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

function setupControllerEvents() {
  const container = elements.videoContainer;
  
  container.onmousemove = (e) => {
    if (!remoteControlEnabled) return;
    const rect = container.getBoundingClientRect();
    sendDataChannelMessage({ type: 'mouse-move', x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  };
  
  container.onclick = (e) => {
    if (!remoteControlEnabled) return;
    const rect = container.getBoundingClientRect();
    sendDataChannelMessage({ type: 'mouse-click', x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height, button: e.button });
  };
  
  container.oncontextmenu = (e) => {
    if (!remoteControlEnabled) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    sendDataChannelMessage({ type: 'mouse-click', x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height, button: 2 });
  };
  
  container.onwheel = (e) => {
    if (!remoteControlEnabled) return;
    sendDataChannelMessage({ type: 'mouse-scroll', deltaX: e.deltaX, deltaY: e.deltaY });
  };
  
  document.onkeydown = (e) => {
    if (!remoteControlEnabled || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    sendDataChannelMessage({ type: 'key-event', key: e.key, eventType: 'keydown', ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey });
  };
  
  document.onkeyup = (e) => {
    if (!remoteControlEnabled || e.target.tagName === 'INPUT') return;
    sendDataChannelMessage({ type: 'key-event', key: e.key, eventType: 'keyup' });
  };
}

function updateControllerStatus() {
  const el = document.getElementById('controllerStatusBadge');
  if (el) {
    el.textContent = remoteControlEnabled ? 'Control: ON' : 'Control: OFF';
    el.className = remoteControlEnabled ? 'badge badge-success' : 'badge badge-info';
  }
}

function updateBlankScreenStatus() {
  const btn = document.getElementById('blankScreenBtn');
  if (btn) {
    btn.textContent = blankScreenEnabled ? 'Show Screen' : 'Blank Screen';
    btn.className = blankScreenEnabled ? 'btn btn-warning' : 'btn btn-secondary';
  }
}

function toggleBlankScreen() {
  const msg = document.getElementById('blankScreenMessage')?.value;
  sendDataChannelMessage({ 
    type: 'blank-screen', 
    enabled: !blankScreenEnabled,
    mode: msg ? 'html' : 'black',
    html: msg ? `<!DOCTYPE html><html><head><style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#fff}.m{text-align:center;padding:40px}h1{font-size:32px;margin-bottom:16px}p{font-size:18px;opacity:.7}</style></head><body><div class="m"><h1>Remote Session Active</h1><p>${msg.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></div></body></html>` : null
  });
}

function showSessionView() {
  elements.mainView.style.display = 'none';
  elements.sessionView.classList.add('active');
  elements.sessionInfo.textContent = `Partner: ${formatPartnerId(remotePartnerId)}`;
  sessionStartTime = Date.now();
  timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - sessionStartTime) / 1000);
    elements.sessionTimer.textContent = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }, 1000);
}

function updateControlStatus() {
  elements.controlStatus.textContent = controlEnabled ? 'ON' : 'OFF';
  elements.controlToggle.classList.toggle('active', controlEnabled);
}

function endSession() {
  if (pc) { pc.close(); pc = null; }
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  dataChannel = null; remotePartnerId = null; role = null; controlEnabled = false; remoteControlEnabled = false;
  elements.sessionView.classList.remove('active');
  elements.mainView.style.display = 'block';
  elements.remoteVideo.srcObject = null;
  if (window.electronAPI) { window.electronAPI.setControlEnabled(false); window.electronAPI.blankScreen(false, 'black', null); }
  blankScreenEnabled = false;
  document.getElementById('blankScreenControls').style.display = 'none';
  elements.connectBtn.disabled = false;
  elements.connectBtn.textContent = 'Connect';
}

elements.connectBtn.onclick = () => {
  const id = elements.remoteIdInput.value.replace(/\D/g, '');
  if (id.length !== 9) { alert('Enter a valid 9-digit Partner ID'); return; }
  remotePartnerId = id;
  role = 'controller';
  sendSignal({ type: 'connection-request', to: id });
  elements.connectBtn.disabled = true;
  elements.connectBtn.textContent = 'Connecting...';
  setTimeout(() => {
    if (elements.connectBtn.textContent === 'Connecting...') {
      elements.connectBtn.disabled = false;
      elements.connectBtn.textContent = 'Connect';
      alert('Connection timed out');
    }
  }, 30000);
};

elements.disconnectBtn.onclick = () => {
  sendSignal({ type: 'end-session', to: remotePartnerId });
  endSession();
};

elements.controlToggle.onclick = () => {
  controlEnabled = !controlEnabled;
  updateControlStatus();
  if (window.electronAPI) window.electronAPI.setControlEnabled(controlEnabled);
  sendDataChannelMessage({ type: 'control-toggle', enabled: controlEnabled });
};

elements.remoteIdInput.oninput = (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 9);
  if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
  else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
  e.target.value = v;
};

connectWebSocket();
