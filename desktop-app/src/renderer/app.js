const getServerUrl = () => {
  if (window.REMOTEDESK_SERVER_URL) {
    return window.REMOTEDESK_SERVER_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:5000';
  return `${protocol}//${host}/ws`;
};
const SERVER_URL = getServerUrl();

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
  shareBtn: document.getElementById('shareBtn'),
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
  
  const wsUrl = SERVER_URL.replace('YOUR_SERVER_URL', window.location.host || 'localhost:5000');
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    updateStatus('online', 'Connected to server');
    elements.connectBtn.disabled = false;
    elements.shareBtn.disabled = false;
    
    ws.send(JSON.stringify({
      type: 'join',
      partnerId: partnerId,
      deviceName: 'Desktop App'
    }));
  };
  
  ws.onclose = () => {
    updateStatus('offline', 'Disconnected from server');
    elements.connectBtn.disabled = true;
    elements.shareBtn.disabled = true;
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
      const accept = confirm(`${formatPartnerId(data.from)} wants to connect. Accept?`);
      if (accept) {
        remotePartnerId = data.from;
        role = 'sharer';
        await startSharing();
      } else {
        sendSignal({ type: 'connection-declined', to: data.from });
      }
      break;
      
    case 'connection-accepted':
      console.log('Connection accepted, waiting for offer...');
      break;
      
    case 'connection-declined':
      alert('Connection was declined');
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
  channel.onopen = () => {
    console.log('Data channel opened');
  };
  
  channel.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleDataChannelMessage(data);
  };
  
  channel.onclose = () => {
    console.log('Data channel closed');
  };
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
        if (window.electronAPI) {
          window.electronAPI.setControlEnabled(controlEnabled);
        }
      } else if (role === 'controller') {
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
      if (role === 'controller') {
        blankScreenEnabled = data.enabled;
        updateBlankScreenStatus();
      }
      break;
  }
}

function sendDataChannelMessage(data) {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(data));
  }
}

async function showSourceSelector() {
  if (!window.electronAPI) {
    console.error('Electron API not available');
    return null;
  }
  
  const sources = await window.electronAPI.getSources();
  elements.sourcesGrid.innerHTML = '';
  
  return new Promise((resolve) => {
    sources.forEach(source => {
      const item = document.createElement('div');
      item.className = 'source-item';
      item.innerHTML = `
        <img src="${source.thumbnail}" alt="${source.name}">
        <div class="name">${source.name}</div>
      `;
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
    let sourceId = null;
    
    if (window.electronAPI) {
      sourceId = await showSourceSelector();
      if (!sourceId) {
        sendSignal({ type: 'connection-declined', to: remotePartnerId });
        return;
      }
    }
    
    const constraints = {
      audio: false,
      video: sourceId ? {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      } : true
    };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    pc = createPeerConnection(true);
    
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    sendSignal({
      type: 'offer',
      to: remotePartnerId,
      payload: offer
    });
    
    showSessionView();
    elements.sharingIndicator.style.display = 'block';
    elements.remoteVideo.style.display = 'none';
    elements.controlToggle.style.display = 'flex';
    
  } catch (err) {
    console.error('Error starting share:', err);
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
  
  sendSignal({
    type: 'answer',
    to: remotePartnerId,
    payload: answer
  });
  
  showSessionView();
  elements.sharingIndicator.style.display = 'none';
  elements.remoteVideo.style.display = 'block';
  
  const controllerBadge = document.getElementById('controllerStatusBadge');
  if (controllerBadge) {
    controllerBadge.style.display = 'inline-block';
  }
  
  const blankControls = document.getElementById('blankScreenControls');
  if (blankControls) {
    blankControls.style.display = 'block';
  }
  
  setupControllerEvents();
}

async function handleAnswer(answer) {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIceCandidate(candidate) {
  if (pc) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

function setupControllerEvents() {
  const container = elements.videoContainer;
  
  container.onmousemove = (e) => {
    if (!remoteControlEnabled) return;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    sendDataChannelMessage({ type: 'mouse-move', x, y });
  };
  
  container.onclick = (e) => {
    if (!remoteControlEnabled) return;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    sendDataChannelMessage({ type: 'mouse-click', x, y, button: e.button });
  };
  
  container.oncontextmenu = (e) => {
    if (!remoteControlEnabled) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    sendDataChannelMessage({ type: 'mouse-click', x, y, button: 2 });
  };
  
  container.onwheel = (e) => {
    if (!remoteControlEnabled) return;
    sendDataChannelMessage({ type: 'mouse-scroll', deltaX: e.deltaX, deltaY: e.deltaY });
  };
  
  document.onkeydown = (e) => {
    if (!remoteControlEnabled) return;
    if (e.target.tagName === 'INPUT') return;
    e.preventDefault();
    sendDataChannelMessage({
      type: 'key-event',
      key: e.key,
      eventType: 'keydown',
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey
    });
  };
  
  document.onkeyup = (e) => {
    if (!remoteControlEnabled) return;
    if (e.target.tagName === 'INPUT') return;
    sendDataChannelMessage({
      type: 'key-event',
      key: e.key,
      eventType: 'keyup'
    });
  };
}

function updateControllerStatus() {
  const statusEl = document.getElementById('controllerStatusBadge');
  if (statusEl) {
    statusEl.textContent = remoteControlEnabled ? 'Control: ON' : 'Control: OFF';
    statusEl.className = remoteControlEnabled ? 'badge badge-success' : 'badge badge-info';
  }
}

function updateBlankScreenStatus() {
  const blankBtn = document.getElementById('blankScreenBtn');
  if (blankBtn) {
    blankBtn.textContent = blankScreenEnabled ? 'Show Screen' : 'Blank Screen';
    blankBtn.className = blankScreenEnabled ? 'btn btn-warning' : 'btn btn-secondary';
  }
}

function toggleBlankScreen() {
  const newState = !blankScreenEnabled;
  const customHtml = document.getElementById('blankScreenMessage')?.value;
  
  sendDataChannelMessage({ 
    type: 'blank-screen', 
    enabled: newState,
    mode: customHtml ? 'html' : 'black',
    html: customHtml ? generateBlankHtml(customHtml) : null
  });
}

function generateBlankHtml(message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
        }
        .message {
          text-align: center;
          padding: 40px;
          max-width: 80%;
        }
        h1 { font-size: 32px; margin-bottom: 16px; }
        p { font-size: 18px; opacity: 0.7; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="message">
        <h1>Remote Session Active</h1>
        <p>${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
    </body>
    </html>
  `;
}

function showSessionView() {
  elements.mainView.style.display = 'none';
  elements.sessionView.classList.add('active');
  elements.sessionInfo.textContent = `Partner: ${formatPartnerId(remotePartnerId)}`;
  
  sessionStartTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');
  elements.sessionTimer.textContent = `${mins}:${secs}`;
}

function updateControlStatus() {
  elements.controlStatus.textContent = controlEnabled ? 'ON' : 'OFF';
  elements.controlToggle.classList.toggle('active', controlEnabled);
}

function endSession() {
  if (pc) {
    pc.close();
    pc = null;
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  dataChannel = null;
  remotePartnerId = null;
  role = null;
  controlEnabled = false;
  
  elements.sessionView.classList.remove('active');
  elements.mainView.style.display = 'block';
  elements.remoteVideo.srcObject = null;
  
  if (window.electronAPI) {
    window.electronAPI.setControlEnabled(false);
    window.electronAPI.blankScreen(false, 'black', null);
  }
  
  blankScreenEnabled = false;
  const blankControls = document.getElementById('blankScreenControls');
  if (blankControls) {
    blankControls.style.display = 'none';
  }
}

elements.connectBtn.onclick = () => {
  const remoteId = elements.remoteIdInput.value.replace(/\D/g, '');
  if (remoteId.length !== 9) {
    alert('Please enter a valid 9-digit Partner ID');
    return;
  }
  
  remotePartnerId = remoteId;
  role = 'controller';
  
  sendSignal({
    type: 'connection-request',
    to: remoteId
  });
  
  elements.connectBtn.disabled = true;
  elements.connectBtn.textContent = 'Connecting...';
  
  setTimeout(() => {
    elements.connectBtn.disabled = false;
    elements.connectBtn.textContent = 'Connect';
  }, 10000);
};

elements.shareBtn.onclick = async () => {
  const remoteId = elements.remoteIdInput.value.replace(/\D/g, '');
  if (remoteId.length !== 9) {
    alert('Please enter a valid 9-digit Partner ID to share with');
    return;
  }
  
  remotePartnerId = remoteId;
  role = 'sharer';
  await startSharing();
};

elements.disconnectBtn.onclick = () => {
  sendSignal({ type: 'end-session', to: remotePartnerId });
  endSession();
};

elements.controlToggle.onclick = () => {
  controlEnabled = !controlEnabled;
  updateControlStatus();
  
  if (window.electronAPI) {
    window.electronAPI.setControlEnabled(controlEnabled);
  }
  
  sendDataChannelMessage({ type: 'control-toggle', enabled: controlEnabled });
};

elements.remoteIdInput.oninput = (e) => {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 9) value = value.slice(0, 9);
  if (value.length > 6) {
    value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6);
  } else if (value.length > 3) {
    value = value.slice(0, 3) + '-' + value.slice(3);
  }
  e.target.value = value;
};

connectWebSocket();
