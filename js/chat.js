// Chat module - chatroom CRUD, messages, chatbot, notifications
let chatroomsUnsubscribe = null;
let messagesUnsubscribe = null;
let chatrooms = [];
let currentMessages = [];
let selectedChat = null;
let replyToMsg = null;

// Chatbot
const GEMINI_API_KEY = 'AIzaSyDyPuZoS3GYOmSNu_SABR6oBngy5LxCl8g';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Giphy
const GIPHY_API_KEY = 'dSf0vJQmBl2RNVHTVSvnqEE0L4TQmFOz';

// Notifications
let notifPermission = 'default';
async function requestNotifPermission() {
  if (!('Notification' in window)) return;
  notifPermission = await Notification.requestPermission();
}
function showNotification(title, body) {
  if (notifPermission !== 'granted' || document.hasFocus()) return;
  const n = new Notification(title, { body, icon: 'chat-icon.svg', tag: 'chatroom-message', renotify: true });
  n.onclick = () => { window.focus(); n.close(); };
  setTimeout(() => n.close(), 5000);
}

// Listen to chatrooms
function listenToChatrooms(uid, callback) {
  if (chatroomsUnsubscribe) chatroomsUnsubscribe();
  chatroomsUnsubscribe = db.collection('chatrooms')
    .where('participants', 'array-contains', uid)
    .onSnapshot((snapshot) => {
      chatrooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      chatrooms.sort((a, b) => (b.lastMessageAt?.toMillis() || 0) - (a.lastMessageAt?.toMillis() || 0));
      callback(chatrooms);
    });
}

// Listen to messages
function listenToMessages(chatId, callback) {
  if (messagesUnsubscribe) messagesUnsubscribe();
  let isInitial = true;
  let prevCount = 0;
  messagesUnsubscribe = db.collection('chatrooms').doc(chatId).collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot((snapshot) => {
      currentMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!isInitial && currentMessages.length > prevCount) {
        const last = currentMessages[currentMessages.length - 1];
        if (last.senderId !== currentUser.uid && !last.isUnsent) {
          showNotification(last.senderName || 'New message', last.text || 'Sent an attachment');
        }
      }
      prevCount = currentMessages.length;
      isInitial = false;
      callback(currentMessages);
    });
}

// Send message
async function sendMessage(chatId, messageData) {
  const senderName = userProfile?.username || currentUser.displayName || currentUser.email;
  const senderPhoto = userProfile?.photoURL || currentUser.photoURL || '';
  const full = {
    senderId: currentUser.uid, senderName, senderPhoto,
    text: '', imageURL: '', gifURL: '', stickerData: null,
    type: 'text', reactions: {}, isEdited: false, isUnsent: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ...messageData
  };
  if (replyToMsg) {
    full.replyTo = { messageId: replyToMsg.id, text: replyToMsg.text || '', senderName: replyToMsg.senderName || 'User' };
    replyToMsg = null;
  }
  await db.collection('chatrooms').doc(chatId).collection('messages').add(full);
  await db.collection('chatrooms').doc(chatId).update({
    lastMessage: { text: messageData.text || '', type: messageData.type || 'text', senderId: currentUser.uid, senderName, isUnsent: false },
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Chatbot response
async function getChatbotResponse(userMessage) {
  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: 'You are a helpful and friendly chatbot assistant in a chatroom application. Keep your responses concise and helpful. Use emojis occasionally to be friendly.' }] },
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
      })
    });
    const data = await res.json();
    if (data.error) return `Error: ${data.error.message}`;
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text;
    return "Sorry, I couldn't process that. Please try again! 🤔";
  } catch (e) { return "Oops! Something went wrong. 😅"; }
}

// Message operations
async function unsendMessage(chatId, msgId) {
  await db.collection('chatrooms').doc(chatId).collection('messages').doc(msgId).update({
    isUnsent: true, text: '', imageURL: '', gifURL: '', stickerData: null
  });
}
async function editMessage(chatId, msgId, newText) {
  await db.collection('chatrooms').doc(chatId).collection('messages').doc(msgId).update({ text: newText, isEdited: true });
}
async function toggleReaction(chatId, msgId, emoji, uid, currentReactions) {
  const reactions = { ...currentReactions };
  if (reactions[emoji]?.includes(uid)) {
    reactions[emoji] = reactions[emoji].filter(u => u !== uid);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    if (!reactions[emoji]) reactions[emoji] = [];
    reactions[emoji] = [...reactions[emoji], uid];
  }
  await db.collection('chatrooms').doc(chatId).collection('messages').doc(msgId).update({ reactions });
}

// Upload image
async function uploadImage(chatId, file) {
  const storageRef = storage.ref(`chat-images/${chatId}/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  return await storageRef.getDownloadURL();
}

// Upload profile photo
async function uploadProfilePhoto(uid, file) {
  const storageRef = storage.ref(`profile-photos/${uid}/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  return await storageRef.getDownloadURL();
}

// Create chat
async function createChat(mode, selectedUsers, groupName) {
  const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
  const currentUserData = currentUserDoc.data() || {};
  const participants = [currentUser.uid, ...selectedUsers.map(u => u.uid)];
  const members = [currentUser.uid];
  const pendingMembers = selectedUsers.map(u => u.uid);
  const memberInfo = {
    [currentUser.uid]: {
      username: currentUserData.username || currentUser.displayName || currentUser.email,
      email: currentUser.email, photoURL: currentUserData.photoURL || currentUser.photoURL || ''
    }
  };
  selectedUsers.forEach(u => {
    memberInfo[u.uid] = { username: u.username || u.email, email: u.email, photoURL: u.photoURL || '' };
  });

  if (mode === 'private' && selectedUsers.length === 1) {
    const snapshot = await db.collection('chatrooms').where('type', '==', 'private').where('participants', 'array-contains', currentUser.uid).get();
    const existing = snapshot.docs.find(d => {
      const data = d.data();
      return (data.participants || data.members).includes(selectedUsers[0].uid) && (data.participants || data.members).length === 2;
    });
    if (existing) return { id: existing.id, ...existing.data() };
  }

  const chatData = {
    type: mode === 'private' ? 'private' : 'group',
    name: mode === 'group' ? (groupName || 'Group Chat') : '',
    participants, members, pendingMembers, memberInfo,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessage: null, lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const docRef = await db.collection('chatrooms').add(chatData);
  return { id: docRef.id, ...chatData };
}

// Search users
async function searchUsers(term, excludeUids) {
  const snapshot = await db.collection('users').get();
  return snapshot.docs
    .filter(d => !excludeUids.includes(d.id))
    .map(d => ({ uid: d.id, ...d.data() }))
    .filter(u => (u.username || '').toLowerCase().includes(term.toLowerCase()) || (u.email || '').toLowerCase().includes(term.toLowerCase()));
}

// Invite user to group
async function inviteUser(chatId, user) {
  await db.collection('chatrooms').doc(chatId).update({
    participants: firebase.firestore.FieldValue.arrayUnion(user.uid),
    pendingMembers: firebase.firestore.FieldValue.arrayUnion(user.uid),
    [`memberInfo.${user.uid}`]: { username: user.username || user.email, email: user.email, photoURL: user.photoURL || '' }
  });
}

// Accept / decline invitation
async function acceptInvite(roomId, uid) {
  await db.collection('chatrooms').doc(roomId).update({
    pendingMembers: firebase.firestore.FieldValue.arrayRemove(uid),
    members: firebase.firestore.FieldValue.arrayUnion(uid)
  });
}
async function declineInvite(roomId, uid) {
  await db.collection('chatrooms').doc(roomId).update({
    pendingMembers: firebase.firestore.FieldValue.arrayRemove(uid),
    participants: firebase.firestore.FieldValue.arrayRemove(uid)
  });
}

// Block / unblock
async function blockUser(uid, targetUid) {
  await db.collection('users').doc(uid).update({ blockedUsers: firebase.firestore.FieldValue.arrayUnion(targetUid) });
}
async function unblockUser(uid, targetUid) {
  await db.collection('users').doc(uid).update({ blockedUsers: firebase.firestore.FieldValue.arrayRemove(targetUid) });
}

// Save profile
async function saveProfile(uid, data) {
  await db.collection('users').doc(uid).update(data);
  await fetchUserProfile(uid);
}

// Giphy
async function fetchGifs(term) {
  const endpoint = term ? `search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(term)}&limit=20&rating=g` : `trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
  const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}`);
  const data = await res.json();
  return data.data || [];
}
