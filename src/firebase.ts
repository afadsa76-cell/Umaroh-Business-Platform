import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, getDoc, getDocs, updateDoc, addDoc, setDoc, deleteDoc, query, where, writeBatch, serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, startAfter, endBefore, runTransaction } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export { 
  collection, onSnapshot, doc, getDoc, getDocs, updateDoc, addDoc, setDoc, deleteDoc, query, where, writeBatch, 
  serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, startAfter, endBefore, runTransaction,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
};
