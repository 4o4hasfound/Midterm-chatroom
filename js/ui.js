// UI helper functions
const EMOJI_LIST = [
  '😀','😂','🥹','😍','🥰','😘','😎','🤩',
  '🤔','😤','😢','😭','🤯','🥳','😱','🤮',
  '👍','👎','❤️','🔥','💯','✨','🎉','👏',
  '🙌','🤝','💪','🙏','💀','👀','🫡','🤡'
];
const STICKER_COLORS = ['#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE','#007AFF','#5856D6','#AF52DE','#FF2D55','#FFFFFF','#8E8E93','#000000'];
const BRUSHES = [{ name:'Fine',size:2 },{ name:'Medium',size:5 },{ name:'Thick',size:10 },{ name:'Bold',size:18 },{ name:'Marker',size:25 }];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getChatName(room) {
  if (room.type === 'group') return room.name || 'Group Chat';
  const otherUid = (room.participants || room.members || []).find(uid => uid !== currentUser.uid)
    || Object.keys(room.memberInfo || {}).find(uid => uid !== currentUser.uid);
  if (otherUid && allUsers[otherUid]) return allUsers[otherUid].username || allUsers[otherUid].email || 'Chat';
  const otherNames = Object.entries(room.memberInfo || {}).filter(([uid]) => uid !== currentUser.uid).map(([, i]) => i.username || i.email || 'User');
  return otherNames.join(', ') || 'Chat';
}

function getChatAvatarHTML(room) {
  if (room.type === 'group') return `<span>${(room.name || 'G')[0].toUpperCase()}</span>`;
  const otherUid = (room.participants || room.members || []).find(uid => uid !== currentUser.uid)
    || Object.keys(room.memberInfo || {}).find(uid => uid !== currentUser.uid);
  if (otherUid && allUsers[otherUid]) {
    const info = allUsers[otherUid];
    if (info.photoURL) return `<img src="${escapeHtml(info.photoURL)}" alt="" />`;
    return `<span>${(info.username || info.email || 'U')[0].toUpperCase()}</span>`;
  }
  return '<span>U</span>';
}

function getLastMessagePreview(room) {
  if (!room.lastMessage) return 'No messages yet';
  if (room.lastMessage.type === 'image') return '📷 Image';
  if (room.lastMessage.type === 'gif') return '🎬 GIF';
  if (room.lastMessage.type === 'sticker') return '🎨 Sticker';
  if (room.lastMessage.isUnsent) return 'Message unsent';
  return room.lastMessage.text || '';
}

// Render emoji picker grid
function renderEmojiGrid(container, onSelect) {
  container.innerHTML = `<div class="emoji-picker"><div class="emoji-grid">${EMOJI_LIST.map(e => `<button class="emoji-btn" data-emoji="${e}">${e}</button>`).join('')}</div></div>`;
  container.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.onclick = () => onSelect(btn.dataset.emoji);
  });
}

// Render GIF picker
function renderGifPicker(container, onSelect, onClose) {
  container.innerHTML = `
    <div class="gif-picker">
      <div class="gif-picker-header"><input type="text" placeholder="Search GIFs..." id="gif-search" /><button class="btn-close-picker" id="gif-close-btn">✕</button></div>
      <div class="gif-grid" id="gif-grid"><div class="gif-loading">Loading GIFs...</div></div>
      <div class="gif-picker-footer"><span>Powered by GIPHY</span></div>
    </div>`;
  const input = container.querySelector('#gif-search');
  const grid = container.querySelector('#gif-grid');
  container.querySelector('#gif-close-btn').onclick = onClose;

  async function load(term) {
    grid.innerHTML = '<div class="gif-loading">Loading GIFs...</div>';
    const gifs = await fetchGifs(term);
    if (gifs.length === 0) { grid.innerHTML = '<div class="gif-loading">No GIFs found</div>'; return; }
    grid.innerHTML = gifs.map(g => `<img class="gif-item" src="${g.images?.fixed_height_small?.url || g.images?.fixed_height?.url}" data-url="${g.images?.fixed_height?.url}" alt="${escapeHtml(g.title)}" loading="lazy" />`).join('');
    grid.querySelectorAll('.gif-item').forEach(img => { img.onclick = () => onSelect(img.dataset.url); });
  }
  load('');
  let timer;
  input.oninput = () => { clearTimeout(timer); timer = setTimeout(() => load(input.value), 400); };
}

// Build a message element
function buildMessageEl(msg, chatId, searchTerm) {
  const isOwn = msg.senderId === currentUser.uid;
  const isBot = msg.type === 'bot' || msg.senderId === 'chatbot';
  const senderInfo = allUsers[msg.senderId] || {};
  const sName = isBot ? (msg.senderName || '🤖 ChatBot') : (senderInfo.username || msg.senderName || 'User');
  const sPhoto = isBot ? '' : (senderInfo.photoURL || msg.senderPhoto || '');
  const blockedUsers = allUsers[currentUser.uid]?.blockedUsers || [];

  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${isOwn ? 'own' : ''}`;
  wrapper.dataset.msgId = msg.id;

  if (msg.isUnsent) {
    wrapper.innerHTML = `<div class="message unsent"><span class="unsent-text">Message was unsent</span></div>`;
    return wrapper;
  }

  // Avatar
  if (!isOwn) {
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = sPhoto ? `<img src="${escapeHtml(sPhoto)}" alt="" />` : `<span>${(sName || '?')[0].toUpperCase()}</span>`;
    wrapper.appendChild(avatarDiv);
  }

  const content = document.createElement('div');
  content.className = 'message-content';

  if (!isOwn) content.innerHTML = `<div class="message-sender">${escapeHtml(sName)}</div>`;

  // Reply reference
  if (msg.replyTo) {
    const origMsg = currentMessages.find(m => m.id === msg.replyTo.messageId);
    const isUnsent = origMsg?.isUnsent;
    const rSenderId = origMsg?.senderId;
    const rInfo = allUsers[rSenderId] || {};
    const rIsBot = origMsg?.type === 'bot' || rSenderId === 'chatbot';
    const rName = rIsBot ? (origMsg?.senderName || '🤖 ChatBot') : (rInfo.username || msg.replyTo.senderName || 'User');
    const refDiv = document.createElement('div');
    refDiv.className = `reply-reference ${isUnsent ? 'deleted' : ''}`;
    refDiv.innerHTML = `<div class="reply-bar"></div><div class="reply-info">${isUnsent ? '<span class="reply-text deleted">This message was deleted</span>' : `<span class="reply-sender">${escapeHtml(rName)}</span><span class="reply-text">${escapeHtml(msg.replyTo.text || 'Attachment')}</span>`}</div>`;
    if (!isUnsent) refDiv.onclick = () => scrollToMessage(msg.replyTo.messageId);
    content.appendChild(refDiv);
  }

  // Bubble
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isOwn ? 'own' : ''} ${msg.type === 'bot' ? 'bot' : ''}`;
  let bubbleHTML = '';
  if (msg.type === 'bot') bubbleHTML += '<span class="bot-badge">🤖 Bot</span>';
  if (msg.imageURL) bubbleHTML += `<img src="${escapeHtml(msg.imageURL)}" alt="Shared" class="message-image" loading="lazy" />`;
  if (msg.gifURL) bubbleHTML += `<img src="${escapeHtml(msg.gifURL)}" alt="GIF" class="message-gif" loading="lazy" />`;
  if (msg.stickerData) bubbleHTML += `<img src="${msg.stickerData}" alt="Sticker" class="message-sticker" />`;
  if (msg.text) {
    let displayText = escapeHtml(msg.text);
    if (searchTerm) {
      const re = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      displayText = displayText.replace(re, '<mark>$1</mark>');
    }
    bubbleHTML += `<div class="message-text">${displayText}</div>`;
  }
  bubbleHTML += `<div class="message-meta"><span class="message-time">${formatTime(msg.createdAt)}</span>${msg.isEdited ? '<span class="edited-badge">edited</span>' : ''}</div>`;
  bubble.innerHTML = bubbleHTML;
  content.appendChild(bubble);

  // Reactions
  const reactions = msg.reactions || {};
  const entries = Object.entries(reactions).filter(([, u]) => u.length > 0);
  if (entries.length > 0) {
    const rd = document.createElement('div');
    rd.className = 'message-reactions';
    rd.innerHTML = entries.map(([emoji, users]) => `<button class="reaction-chip ${users.includes(currentUser.uid) ? 'own' : ''}" data-emoji="${emoji}" title="${users.length} reaction(s)">${emoji}${users.length > 1 ? ` <span>${users.length}</span>` : ''}</button>`).join('');
    rd.querySelectorAll('.reaction-chip').forEach(btn => {
      btn.onclick = () => toggleReaction(chatId, msg.id, btn.dataset.emoji, currentUser.uid, msg.reactions || {});
    });
    content.appendChild(rd);
  }
  wrapper.appendChild(content);

  // Action buttons (shown on hover)
  const actions = document.createElement('div');
  actions.className = `message-actions ${isOwn ? 'own' : ''}`;
  actions.style.display = 'none';
  let actHTML = `<button class="act-react" title="React">😀</button><button class="act-reply" title="Reply">↩️</button>`;
  if (isOwn) {
    if (msg.type === 'text') actHTML += `<button class="act-edit" title="Edit">✏️</button>`;
    actHTML += `<button class="act-unsend" title="Unsend">🗑️</button>`;
  }
  actions.innerHTML = actHTML;
  wrapper.appendChild(actions);

  // Hover show/hide
  wrapper.onmouseenter = () => { actions.style.display = 'flex'; };
  wrapper.onmouseleave = () => { actions.style.display = 'none'; removeEmojiPopup(wrapper); };

  // Action handlers
  const reactBtn = actions.querySelector('.act-react');
  if (reactBtn) reactBtn.onclick = () => toggleEmojiPopup(wrapper, chatId, msg);
  const replyBtn = actions.querySelector('.act-reply');
  if (replyBtn) replyBtn.onclick = () => setReply(msg);
  const editBtn = actions.querySelector('.act-edit');
  if (editBtn) editBtn.onclick = () => startEdit(bubble, chatId, msg);
  const unsendBtn = actions.querySelector('.act-unsend');
  if (unsendBtn) unsendBtn.onclick = () => unsendMessage(chatId, msg.id);

  return wrapper;
}

function toggleEmojiPopup(wrapper, chatId, msg) {
  removeEmojiPopup(wrapper);
  const popup = document.createElement('div');
  popup.className = `emoji-picker-popup ${msg.senderId === currentUser.uid ? 'own' : ''}`;
  renderEmojiGrid(popup, (emoji) => {
    toggleReaction(chatId, msg.id, emoji, currentUser.uid, msg.reactions || {});
    popup.remove();
  });
  wrapper.appendChild(popup);
}
function removeEmojiPopup(wrapper) {
  const p = wrapper.querySelector('.emoji-picker-popup');
  if (p) p.remove();
}

function setReply(msg) {
  replyToMsg = msg;
  document.getElementById('reply-preview').style.display = 'flex';
  document.getElementById('reply-preview-name').textContent = 'Replying to ' + (msg.senderName || 'User');
  document.getElementById('reply-preview-text').textContent = msg.text || 'Attachment';
  document.getElementById('text-input').focus();
}

function startEdit(bubble, chatId, msg) {
  const origHTML = bubble.innerHTML;
  bubble.innerHTML = `<div class="edit-mode"><input type="text" value="${escapeHtml(msg.text || '')}" /><div class="edit-actions"><button class="btn-save">Save</button><button class="btn-cancel">Cancel</button></div></div>`;
  const input = bubble.querySelector('input');
  input.focus();
  bubble.querySelector('.btn-save').onclick = async () => {
    if (input.value.trim()) await editMessage(chatId, msg.id, input.value.trim());
  };
  bubble.querySelector('.btn-cancel').onclick = () => { bubble.innerHTML = origHTML; };
  input.onkeydown = (e) => {
    if (e.key === 'Enter') bubble.querySelector('.btn-save').click();
    if (e.key === 'Escape') bubble.querySelector('.btn-cancel').click();
  };
}

function scrollToMessage(msgId) {
  const el = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('.message-bubble')?.classList.add('highlight-pulse');
    setTimeout(() => el.querySelector('.message-bubble')?.classList.remove('highlight-pulse'), 2000);
  }
}

// Sticker canvas state
let stickerColor = '#FF3B30';
let stickerBrushIndex = 1;
let stickerHistory = [];
let stickerDrawing = false;
let stickerLastPos = null;

function initStickerCanvas() {
  const canvas = document.getElementById('sticker-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stickerHistory = [ctx.getImageData(0, 0, canvas.width, canvas.height)];

  // Color palette
  const palette = document.getElementById('color-palette');
  palette.innerHTML = STICKER_COLORS.map(c => `<button class="color-btn ${c === stickerColor ? 'active' : ''}" style="background:${c}" data-color="${c}"></button>`).join('');
  palette.querySelectorAll('.color-btn').forEach(btn => {
    btn.onclick = () => { stickerColor = btn.dataset.color; palette.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); };
  });

  // Brushes
  const brushOpts = document.getElementById('brush-options');
  brushOpts.innerHTML = BRUSHES.map((b, i) => `<button class="brush-btn ${i === stickerBrushIndex ? 'active' : ''}" data-idx="${i}"><div class="brush-preview" style="width:${Math.min(b.size,20)}px;height:${Math.min(b.size,20)}px"></div><span>${b.name}</span></button>`).join('');
  brushOpts.querySelectorAll('.brush-btn').forEach(btn => {
    btn.onclick = () => { stickerBrushIndex = parseInt(btn.dataset.idx); brushOpts.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); };
  });

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  }
  function startDraw(e) {
    e.preventDefault(); stickerDrawing = true;
    const pos = getPos(e); stickerLastPos = pos;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, BRUSHES[stickerBrushIndex].size / 2, 0, Math.PI * 2);
    ctx.fillStyle = stickerColor; ctx.fill();
  }
  function draw(e) {
    e.preventDefault(); if (!stickerDrawing) return;
    const pos = getPos(e);
    ctx.beginPath(); ctx.moveTo(stickerLastPos.x, stickerLastPos.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = stickerColor; ctx.lineWidth = BRUSHES[stickerBrushIndex].size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    stickerLastPos = pos;
  }
  function endDraw(e) {
    if (e) e.preventDefault(); if (!stickerDrawing) return;
    stickerDrawing = false;
    stickerHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }
  canvas.onmousedown = startDraw; canvas.onmousemove = draw; canvas.onmouseup = endDraw; canvas.onmouseleave = endDraw;
  canvas.ontouchstart = startDraw; canvas.ontouchmove = draw; canvas.ontouchend = endDraw;

  document.getElementById('undo-btn').onclick = () => {
    if (stickerHistory.length <= 1) return;
    stickerHistory.pop();
    ctx.putImageData(stickerHistory[stickerHistory.length - 1], 0, 0);
  };
  document.getElementById('clear-canvas-btn').onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stickerHistory = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  };
}
