// 🔥 Firebase Configuration - Email/Password Auth
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCxQR3UmWHDxQW3af6Z453RKMtEoztUlWk",
  authDomain: "ankitstore-new.firebaseapp.com",
  projectId: "ankitstore-new",
  storageBucket: "ankitstore-new.firebasestorage.app",
  messagingSenderId: "273863658271",
  appId: "1:273863658271:web:e33d233a3ed2ecea86fe2a",
  measurementId: "G-L2VYC10HQL"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline cache - products load from phone memory even if Firestore is slow!
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('⚠️ Multiple tabs open, persistence enabled in one tab only');
  } else if (err.code === 'unimplemented') {
    console.log('⚠️ Browser does not support offline persistence');
  }
});

console.log('✅ Firebase Email Auth initialized!');