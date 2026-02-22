// 🔥 Firebase Configuration File
// This connects your Ankit Store app to Firebase

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // 🔥 NEW - for Phone Auth
import { getFirestore } from 'firebase/firestore';

// Your Firebase config (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyCr_IqY8bb0U5noZ7srDkvOWxjnshnvx-k",
  authDomain: "ankitstore-487e7.firebaseapp.com",
  projectId: "ankitstore-487e7",
  storageBucket: "ankitstore-487e7.firebasestorage.app",
  messagingSenderId: "78955712918",
  appId: "1:78955712918:web:bead19a3e3b03b56f38db7",
  measurementId: "G-G5527434W2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore Database
export const db = getFirestore(app);

// 🔥 Initialize Auth (for Real OTP)
export const auth = getAuth(app);

console.log('✅ Firebase initialized!');
console.log('📦 Project:', firebaseConfig.projectId);

