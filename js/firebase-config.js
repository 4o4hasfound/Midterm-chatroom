// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyD3EghY7JhrOLIM6BceCKKuq78VSkxhHss",
  authDomain: "midterm-chatroom-2672b.firebaseapp.com",
  projectId: "midterm-chatroom-2672b",
  storageBucket: "midterm-chatroom-2672b.firebasestorage.app",
  messagingSenderId: "265621543323",
  appId: "1:265621543323:web:771ca33469b804188b293e"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();
