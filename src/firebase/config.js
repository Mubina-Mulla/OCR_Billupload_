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
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
export const storage = getStorage(app);

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
// 🔥 STORAGE HELPERS
// -------------------------------------------------------
/**
 * Upload a bill image to Firebase Storage
 * @param {File} file - The image file (jpg/png)
 * @param {string} customerId - Customer ID for organizing files
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadBillImage = async (file, customerId = 'temp') => {
  try {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image (jpg/png)');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `${customerId}_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `images/${fileName}`);

    console.log('📤 Uploading image to Storage:', fileName);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('✅ Image uploaded successfully');

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('🔗 Image URL:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};

// -------------------------------------------------------
// Disable IndexedDB persistence to prevent internal assertion errors
// enableIndexedDbPersistence(database).catch(() => {});
export default app;
