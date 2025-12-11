// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  addDoc,
  deleteDoc,
  collection as fsCollection
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDr1U08ZXQYy2aZbFJugHbplNDDVQlhvGA",
  authDomain: "my-crd-53479.firebaseapp.com",
  projectId: "my-crd-53479",
  storageBucket: "my-crd-53479.firebasestorage.app",
  messagingSenderId: "904372944777",
  appId: "1:904372944777:web:c2c1bd341c763e856dab58",
  measurementId: "G-JLLDM9VQNX"
};

// Init
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const database = getFirestore(app);
export const db = database;

// -------------------------------------------------------
// 🔥 CORRECT BASE PATH
// -------------------------------------------------------
// Firestore collection path helpers
const BASE_PATH = 'mainData/Billuload';

// Helpers
export const getCollectionRef = (collectionName) =>
  collection(database, ...BASE_PATH.split('/'), collectionName);

export const getDocRef = (collectionName, docId) =>
  doc(database, ...BASE_PATH.split('/'), collectionName, docId);

// -------------------------------------------------------
// 🔥 CORRECT ADMIN TICKET PATH
// -------------------------------------------------------
export const getAdminTicketsCollectionRef = (adminId) => {
  return fsCollection(database, 'mainData', 'Billuload', 'users', adminId, 'tickets');
};

export const getAdminTicketDocRef = (adminId, ticketId) => {
  return doc(database, 'mainData', 'Billuload', 'users', adminId, 'tickets', ticketId);
};

// -------------------------------------------------------
// Disable IndexedDB persistence to prevent internal assertion errors
// enableIndexedDbPersistence(database).catch(() => {});
export default app;
