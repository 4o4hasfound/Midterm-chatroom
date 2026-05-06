// Authentication module
let currentUser = null;
let userProfile = null;
let allUsers = {};
let usersUnsubscribe = null;

function initAuth(onLogin, onLogout) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await fetchUserProfile(user.uid);
      listenToAllUsers();
      onLogin(user);
    } else {
      currentUser = null;
      userProfile = null;
      if (usersUnsubscribe) usersUnsubscribe();
      onLogout();
    }
  });
}

async function fetchUserProfile(uid) {
  const doc = await db.collection('users').doc(uid).get();
  if (doc.exists) {
    userProfile = { uid, ...doc.data() };
  }
  return userProfile;
}

function listenToAllUsers() {
  if (usersUnsubscribe) usersUnsubscribe();
  usersUnsubscribe = db.collection('users').onSnapshot((snapshot) => {
    const map = {};
    snapshot.docs.forEach(d => { map[d.id] = d.data(); });
    allUsers = map;
    if (typeof onAllUsersUpdate === 'function') onAllUsersUpdate();
  });
}

async function signupWithEmail(email, password, username) {
  const result = await auth.createUserWithEmailAndPassword(email, password);
  await result.user.updateProfile({ displayName: username });
  await db.collection('users').doc(result.user.uid).set({
    username, email, phone: '', address: '', photoURL: '', blockedUsers: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return result;
}

function loginWithEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

async function loginWithGoogle() {
  const result = await auth.signInWithPopup(googleProvider);
  const userDoc = await db.collection('users').doc(result.user.uid).get();
  if (!userDoc.exists) {
    await db.collection('users').doc(result.user.uid).set({
      username: result.user.displayName || 'User',
      email: result.user.email,
      phone: '', address: '',
      photoURL: result.user.photoURL || '',
      blockedUsers: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  return result;
}

function logout() {
  return auth.signOut();
}
