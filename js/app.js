// Main application logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loginPage = document.getElementById('login-page');
  const chatPage = document.getElementById('chat-page');
  const loginForm = document.getElementById('login-form');
  const switchBtn = document.getElementById('switch-btn');
  const switchText = document.getElementById('switch-text');
  const usernameGroup = document.getElementById('username-group');
  const errorAlert = document.getElementById('error-alert');
  const errorText = document.getElementById('error-text');
  const googleBtn = document.getElementById('google-btn');
  const loginBtn = document.getElementById('login-btn');
  const loginSubtitle = document.getElementById('login-subtitle');

  let isSignUp = false;

  // Init auth listener
  initAuth(handleLogin, handleLogout);
  requestNotifPermission();

  // Login / Signup Toggle
  switchBtn.onclick = () => {
    isSignUp = !isSignUp;
    errorAlert.style.display = 'none';
    if (isSignUp) {
      usernameGroup.style.display = 'block';
      document.getElementById('username-input').required = true;
      loginBtn.textContent = 'Create Account';
      switchText.textContent = 'Already have an account?';
      switchBtn.textContent = 'Sign In';
      loginSubtitle.textContent = 'Create your account';
    } else {
      usernameGroup.style.display = 'none';
      document.getElementById('username-input').required = false;
      loginBtn.textContent = 'Sign In';
      switchText.textContent = "Don't have an account?";
      switchBtn.textContent = 'Sign Up';
      loginSubtitle.textContent = 'Welcome back';
    }
  };

  function showError(msg) {
    errorText.textContent = msg;
    errorAlert.style.display = 'flex';
  }

  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    errorAlert.style.display = 'none';
    const email = document.getElementById('email-input').value;
    const pwd = document.getElementById('password-input').value;
    const username = document.getElementById('username-input').value;

    loginBtn.disabled = true;
    try {
      if (isSignUp) await signupWithEmail(email, pwd, username);
      else await loginWithEmail(email, pwd);
    } catch (err) {
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'Email already in use';
      if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters';
      if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password';
      showError(msg);
    }
    loginBtn.disabled = false;
  };

  googleBtn.onclick = async () => {
    errorAlert.style.display = 'none';
    googleBtn.disabled = true;
    try { 
      await loginWithGoogle(); 
    } catch (err) { 
      console.error(err);
      showError(err.message || 'Google sign-in failed.'); 
    }
    googleBtn.disabled = false;
  };

  function handleLogin(user) {
    loginPage.style.display = 'none';
    chatPage.style.display = 'flex';
    document.getElementById('sidebar-username').textContent = userProfile?.username || user.email;
    document.getElementById('sidebar-avatar').innerHTML = userProfile?.photoURL ? `<img src="${escapeHtml(userProfile.photoURL)}"/>` : `<span>${(userProfile?.username || user.email)[0].toUpperCase()}</span>`;
    
    listenToChatrooms(user.uid, renderChatList);
  }

  function handleLogout() {
    loginPage.style.display = 'flex';
    chatPage.style.display = 'none';
    selectedChat = null;
    document.getElementById('chatroom').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
  }

  document.getElementById('logout-btn').onclick = () => logout();

  // Sidebar & Modals
  const userMenu = document.getElementById('user-menu');
  document.getElementById('user-info-btn').onclick = () => {
    userMenu.style.display = userMenu.style.display === 'none' ? 'block' : 'none';
    document.getElementById('chevron-icon').classList.toggle('open');
  };

  document.getElementById('edit-profile-btn').onclick = () => {
    userMenu.style.display = 'none';
    document.getElementById('profile-modal').style.display = 'flex';
    document.getElementById('profile-username').value = userProfile?.username || '';
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-phone').value = userProfile?.phone || '';
    document.getElementById('profile-address').value = userProfile?.address || '';
    const img = document.getElementById('profile-photo-img');
    const pl = document.getElementById('profile-photo-placeholder');
    if (userProfile?.photoURL) { img.src = userProfile.photoURL; img.style.display = 'block'; pl.style.display = 'none'; }
    else { img.style.display = 'none'; pl.style.display = 'flex'; document.getElementById('profile-photo-letter').textContent = (userProfile?.username || currentUser.email)[0].toUpperCase(); }
  };
  document.getElementById('close-profile-modal').onclick = () => document.getElementById('profile-modal').style.display = 'none';

  // Photo upload
  const pPhotoInput = document.getElementById('profile-photo-input');
  document.getElementById('profile-photo-container').onclick = () => pPhotoInput.click();
  pPhotoInput.onchange = async (e) => {
    if (!e.target.files[0]) return;
    const url = await uploadProfilePhoto(currentUser.uid, e.target.files[0]);
    await saveProfile(currentUser.uid, { photoURL: url });
    document.getElementById('profile-photo-img').src = url;
    document.getElementById('profile-photo-img').style.display = 'block';
    document.getElementById('profile-photo-placeholder').style.display = 'none';
    document.getElementById('sidebar-avatar').innerHTML = `<img src="${url}"/>`;
  };

  document.getElementById('save-profile-btn').onclick = async () => {
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    await saveProfile(currentUser.uid, {
      username: document.getElementById('profile-username').value,
      phone: document.getElementById('profile-phone').value,
      address: document.getElementById('profile-address').value
    });
    btn.textContent = '✓ Saved!';
    setTimeout(() => { btn.textContent = 'Save Changes'; btn.disabled = false; }, 2000);
    document.getElementById('sidebar-username').textContent = userProfile?.username || currentUser.email;
  };

  document.getElementById('manage-blocked-btn').onclick = () => {
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('block-modal').style.display = 'flex';
    renderBlockedUsers();
  };
  document.getElementById('close-block-modal').onclick = () => document.getElementById('block-modal').style.display = 'none';

  // Create Chat
  const cModal = document.getElementById('create-chat-modal');
  let createMode = 'private';
  let cSelectedUsers = [];
  document.getElementById('new-chat-btn').onclick = () => {
    cModal.style.display = 'flex'; cSelectedUsers = []; document.getElementById('user-search-input').value = '';
    renderCreateUsers([]); renderSelectedCreateUsers();
  };
  document.getElementById('close-create-modal').onclick = () => cModal.style.display = 'none';
  document.getElementById('tab-private').onclick = (e) => { createMode = 'private'; document.getElementById('tab-private').classList.add('active'); document.getElementById('tab-group').classList.remove('active'); document.getElementById('group-name-section').style.display = 'none'; cSelectedUsers=[]; renderSelectedCreateUsers(); };
  document.getElementById('tab-group').onclick = (e) => { createMode = 'group'; document.getElementById('tab-group').classList.add('active'); document.getElementById('tab-private').classList.remove('active'); document.getElementById('group-name-section').style.display = 'block'; cSelectedUsers=[]; renderSelectedCreateUsers(); };

  let cSearchTimer;
  document.getElementById('user-search-input').oninput = (e) => {
    clearTimeout(cSearchTimer);
    cSearchTimer = setTimeout(async () => {
      const u = await searchUsers(e.target.value, [currentUser.uid]);
      renderCreateUsers(u);
    }, 300);
  };

  function renderCreateUsers(users) {
    document.getElementById('user-results').innerHTML = users.map(u => `
      <div class="user-result-item" data-uid="${u.uid}">
        <div class="user-result-avatar">${u.photoURL ? `<img src="${u.photoURL}"/>` : `<span>${(u.username||u.email)[0].toUpperCase()}</span>`}</div>
        <div class="user-result-info"><div class="user-result-name">${escapeHtml(u.username||'User')}</div><div class="user-result-email">${escapeHtml(u.email)}</div></div>
      </div>
    `).join('');
    document.getElementById('user-results').querySelectorAll('.user-result-item').forEach(el => {
      el.onclick = () => {
        const u = users.find(x => x.uid === el.dataset.uid);
        if (createMode === 'private') cSelectedUsers = [u];
        else {
          if (cSelectedUsers.find(x => x.uid === u.uid)) cSelectedUsers = cSelectedUsers.filter(x => x.uid !== u.uid);
          else cSelectedUsers.push(u);
        }
        renderSelectedCreateUsers();
      };
    });
  }
  function renderSelectedCreateUsers() {
    document.getElementById('selected-users').innerHTML = cSelectedUsers.map(u => `<div class="selected-user-chip"><span>${escapeHtml(u.username||u.email)}</span><button data-uid="${u.uid}">✕</button></div>`).join('');
    document.getElementById('selected-users').querySelectorAll('button').forEach(b => {
      b.onclick = () => { cSelectedUsers = cSelectedUsers.filter(x => x.uid !== b.dataset.uid); renderSelectedCreateUsers(); };
    });
    document.getElementById('create-chat-btn').disabled = cSelectedUsers.length === 0;
  }
  document.getElementById('create-chat-btn').onclick = async () => {
    const chat = await createChat(createMode, cSelectedUsers, document.getElementById('group-name-input').value);
    cModal.style.display = 'none';
    selectChat(chat);
  };

  // Chat List
  document.getElementById('sidebar-search-input').oninput = () => renderChatList(chatrooms);
  function renderChatList(rooms) {
    const term = document.getElementById('sidebar-search-input').value.toLowerCase();
    const filtered = rooms.filter(r => (getChatName(r)||'').toLowerCase().includes(term));
    const pending = filtered.filter(r => (r.pendingMembers||[]).includes(currentUser.uid));
    const active = filtered.filter(r => (r.members||[]).includes(currentUser.uid));

    let html = '';
    if (filtered.length === 0) html = '<div class="no-chats"><p>No conversations found</p></div>';
    if (pending.length > 0) {
      html += `<div class="chat-section"><div class="section-title">Invitations (${pending.length})</div>`;
      html += pending.map(r => renderRoomItem(r, true)).join('');
      html += '</div>';
    }
    if (active.length > 0) {
      html += `<div class="chat-section">`;
      html += active.map(r => renderRoomItem(r, false)).join('');
      html += '</div>';
    }
    document.getElementById('chat-list').innerHTML = html;

    // Attach listeners
    document.getElementById('chat-list').querySelectorAll('.chat-item').forEach(el => {
      const rid = el.dataset.id;
      if (el.classList.contains('pending')) {
        el.querySelector('.btn-accept').onclick = (e) => { e.stopPropagation(); acceptInvite(rid, currentUser.uid); };
        el.querySelector('.btn-decline').onclick = (e) => { e.stopPropagation(); declineInvite(rid, currentUser.uid); };
      } else {
        el.onclick = () => selectChat(chatrooms.find(x => x.id === rid));
      }
    });
  }

  function renderRoomItem(r, isPending) {
    return `
      <div class="chat-item ${selectedChat?.id === r.id ? 'active' : ''} ${isPending ? 'pending' : ''}" data-id="${r.id}">
        <div class="chat-avatar ${r.type==='group'?'group':''}">${getChatAvatarHTML(r)}</div>
        <div class="chat-item-info">
          <div class="chat-item-top"><span class="chat-item-name">${escapeHtml(getChatName(r))}</span><span class="chat-item-time">${formatRelativeTime(r.lastMessageAt)}</span></div>
          <div class="chat-item-bottom">
            ${isPending ? `<div class="invite-actions"><button class="btn-accept">Accept</button><button class="btn-decline">Decline</button></div>` :
              `<span class="chat-item-preview">${escapeHtml(getLastMessagePreview(r))}</span>${r.type==='group'?`<span class="chat-item-badge">${r.members?.length||0}</span>`:''}`}
          </div>
        </div>
      </div>
    `;
  }

  // Mobile sidebar
  document.getElementById('close-sidebar-btn').onclick = () => document.getElementById('sidebar-container').classList.remove('show');
  document.getElementById('open-sidebar-btn').onclick = () => document.getElementById('sidebar-container').classList.add('show');

  // Select Chat
  function selectChat(chat) {
    selectedChat = chat;
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('chatroom').style.display = 'flex';
    document.getElementById('chat-title').textContent = getChatName(chat);
    document.getElementById('chat-subtitle').textContent = chat.type === 'group' ? `${chat.members?.length||0} members` : 'Private chat';
    if (window.innerWidth < 768) document.getElementById('sidebar-container').classList.remove('show');
    renderChatList(chatrooms);

    document.getElementById('chat-invite-btn').style.display = chat.type === 'group' ? 'flex' : 'none';

    // Block logic
    const isBlocked = chat.type === 'private' && (allUsers[chat.members.find(x=>x!==currentUser.uid)]?.blockedUsers?.includes(currentUser.uid) || userProfile.blockedUsers?.includes(chat.members.find(x=>x!==currentUser.uid)));
    document.getElementById('blocked-warning').style.display = isBlocked ? 'flex' : 'none';
    document.getElementById('message-input-container').style.display = isBlocked ? 'none' : 'block';

    listenToMessages(chat.id, (msgs) => {
      const search = document.getElementById('msg-search-input').value;
      renderMessages(msgs, search);
    });
  }

  document.getElementById('chat-back-btn').onclick = () => {
    selectedChat = null;
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('chatroom').style.display = 'none';
    document.getElementById('sidebar-container').classList.add('show');
    renderChatList(chatrooms);
  };

  // Messages render
  function renderMessages(msgs, search) {
    const cont = document.getElementById('messages-container');
    cont.innerHTML = '';
    let filtered = msgs;
    if (selectedChat.type === 'group') filtered = filtered.filter(m => !userProfile.blockedUsers?.includes(m.senderId));
    if (search) filtered = filtered.filter(m => (m.text||'').toLowerCase().includes(search.toLowerCase()));
    
    filtered.forEach(m => cont.appendChild(buildMessageEl(m, selectedChat.id, search)));
    cont.scrollTop = cont.scrollHeight;
    if (search) document.getElementById('msg-search-count').textContent = `${filtered.length} result(s)`;
  }

  // Message Search
  const mSearch = document.getElementById('msg-search-bar');
  document.getElementById('chat-search-btn').onclick = () => mSearch.style.display = mSearch.style.display === 'none' ? 'flex' : 'none';
  document.getElementById('msg-search-close').onclick = () => { mSearch.style.display='none'; document.getElementById('msg-search-input').value=''; renderMessages(currentMessages,''); };
  document.getElementById('msg-search-input').oninput = (e) => renderMessages(currentMessages, e.target.value);

  // Send message
  document.getElementById('text-input').oninput = (e) => document.getElementById('send-btn').disabled = !e.target.value.trim();
  document.getElementById('message-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('text-input');
    const txt = input.value.trim();
    if (!txt) return;
    input.value = ''; document.getElementById('send-btn').disabled = true;
    document.getElementById('reply-preview').style.display = 'none';
    
    if (txt.toLowerCase().startsWith('@bot ')) {
      await sendMessage(selectedChat.id, { text: txt });
      const reply = await getChatbotResponse(txt.slice(5));
      await sendMessage(selectedChat.id, { text: reply, type: 'bot', senderId: 'chatbot', senderName: '🤖 ChatBot', senderPhoto: '' });
    } else {
      await sendMessage(selectedChat.id, { text: txt });
    }
    input.focus();
  };

  // Image
  document.getElementById('image-btn').onclick = () => document.getElementById('image-input').click();
  document.getElementById('image-input').onchange = async (e) => {
    if (!e.target.files[0]) return;
    const url = await uploadImage(selectedChat.id, e.target.files[0]);
    await sendMessage(selectedChat.id, { type: 'image', imageURL: url });
  };

  // Cancel reply
  document.getElementById('cancel-reply-btn').onclick = () => { replyToMsg=null; document.getElementById('reply-preview').style.display='none'; };

  // Gif
  document.getElementById('gif-btn').onclick = () => {
    const pop = document.getElementById('gif-picker-popup');
    if (pop.style.display === 'block') { pop.style.display = 'none'; return; }
    document.getElementById('emoji-input-popup').style.display = 'none';
    renderGifPicker(pop, async (url) => { await sendMessage(selectedChat.id, { type: 'gif', gifURL: url }); pop.style.display = 'none'; }, () => pop.style.display='none');
    pop.style.display = 'block';
  };

  // Emoji input
  document.getElementById('emoji-input-btn').onclick = () => {
    const pop = document.getElementById('emoji-input-popup');
    if (pop.style.display === 'block') { pop.style.display = 'none'; return; }
    document.getElementById('gif-picker-popup').style.display = 'none';
    renderEmojiGrid(pop, (e) => {
      const inp = document.getElementById('text-input');
      inp.value += e; document.getElementById('send-btn').disabled = false;
      pop.style.display = 'none'; inp.focus();
    });
    pop.classList.add('input-mode');
    pop.style.display = 'block';
  };

  // Sticker
  document.getElementById('sticker-btn').onclick = () => {
    document.getElementById('message-input-container').style.display = 'none';
    document.getElementById('sticker-container').style.display = 'flex';
    initStickerCanvas();
  };
  document.getElementById('cancel-sticker-btn').onclick = () => {
    document.getElementById('sticker-container').style.display = 'none';
    document.getElementById('message-input-container').style.display = 'block';
  };
  document.getElementById('send-sticker-btn').onclick = async () => {
    const cvs = document.getElementById('sticker-canvas');
    await sendMessage(selectedChat.id, { type: 'sticker', stickerData: cvs.toDataURL('image/png') });
    document.getElementById('cancel-sticker-btn').click();
  };

  // Invites
  const invModal = document.getElementById('invite-modal');
  document.getElementById('chat-invite-btn').onclick = () => {
    invModal.style.display = 'flex';
    document.getElementById('current-members-title').textContent = `Current Members (${selectedChat.members?.length||0})`;
    document.getElementById('current-members-list').innerHTML = Object.entries(selectedChat.memberInfo||{}).map(([uid,info])=>`
      <div class="member-item"><div class="member-avatar">${info.photoURL?`<img src="${info.photoURL}"/>`:`<span>${(info.username||info.email||'U')[0].toUpperCase()}</span>`}</div><span class="member-name">${escapeHtml(info.username||info.email)}${uid===currentUser.uid?' (You)':''}</span></div>
    `).join('');
    document.getElementById('invite-search-input').value = '';
    document.getElementById('invite-results').innerHTML = '';
  };
  document.getElementById('close-invite-modal').onclick = () => invModal.style.display = 'none';
  let invTimer;
  document.getElementById('invite-search-input').oninput = (e) => {
    clearTimeout(invTimer);
    invTimer = setTimeout(async () => {
      const excl = (selectedChat.participants||[]).concat(selectedChat.members||[]);
      const u = await searchUsers(e.target.value, [currentUser.uid, ...excl]);
      document.getElementById('invite-results').innerHTML = u.map(usr => `
        <div class="invite-result-item"><div class="member-avatar">${usr.photoURL?`<img src="${usr.photoURL}"/>`:`<span>${(usr.username||usr.email)[0].toUpperCase()}</span>`}</div>
        <div class="invite-result-info"><span class="member-name">${escapeHtml(usr.username||usr.email)}</span></div>
        <button class="btn-invite" onclick="window._inviteUser('${usr.uid}', '${escapeHtml(usr.username||'')}', '${escapeHtml(usr.email)}', '${escapeHtml(usr.photoURL||'')}')">Invite</button></div>
      `).join('');
    }, 300);
  };
  window._inviteUser = async (uid, username, email, photoURL) => {
    await inviteUser(selectedChat.id, { uid, username, email, photoURL });
    document.getElementById('chat-invite-btn').click(); // refresh
  };

  // Block User modal logic
  let bSearchTimer;
  document.getElementById('block-search-input').oninput = (e) => {
    clearTimeout(bSearchTimer);
    bSearchTimer = setTimeout(async () => {
      const u = await searchUsers(e.target.value, [currentUser.uid, ...(userProfile.blockedUsers||[])]);
      document.getElementById('block-results').innerHTML = u.map(usr => `
        <div class="block-result-item"><div class="blocked-avatar">${usr.photoURL?`<img src="${usr.photoURL}"/>`:`<span>${(usr.username||usr.email)[0].toUpperCase()}</span>`}</div>
        <div class="blocked-info"><span class="blocked-name">${escapeHtml(usr.username||usr.email)}</span></div>
        <button class="btn-block" onclick="window._blockUser('${usr.uid}')">Block</button></div>
      `).join('');
    }, 300);
  };
  window._blockUser = async (uid) => {
    await blockUser(currentUser.uid, uid);
    await fetchUserProfile(currentUser.uid);
    renderBlockedUsers();
    document.getElementById('block-search-input').value = ''; document.getElementById('block-results').innerHTML='';
  };
  window._unblockUser = async (uid) => {
    await unblockUser(currentUser.uid, uid);
    await fetchUserProfile(currentUser.uid);
    renderBlockedUsers();
  };
  function renderBlockedUsers() {
    const list = userProfile.blockedUsers || [];
    document.getElementById('blocked-list-section').style.display = list.length ? 'block' : 'none';
    document.getElementById('blocked-list').innerHTML = list.map(uid => {
      const usr = allUsers[uid] || { email: uid };
      return `<div class="blocked-item"><div class="blocked-avatar">${usr.photoURL?`<img src="${usr.photoURL}"/>`:`<span>${(usr.username||usr.email)[0].toUpperCase()}</span>`}</div>
        <div class="blocked-info"><span class="blocked-name">${escapeHtml(usr.username||usr.email)}</span></div>
        <button class="btn-unblock" onclick="window._unblockUser('${uid}')">Unblock</button></div>`;
    }).join('');
  }
});
