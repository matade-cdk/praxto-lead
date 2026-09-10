import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBYysqulmJYm98wmZfcdNJDJx5cvAT7Kt8',
  authDomain: 'praxto-leads.firebaseapp.com',
  projectId: 'praxto-leads',
  storageBucket: 'praxto-leads.firebasestorage.app',
  messagingSenderId: '347125180913',
  appId: '1:347125180913:web:d3a5d79794157faa3b3c50',
  measurementId: 'G-WYY7P5NZWV'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const analytics = await isSupported()
  ? getAnalytics(firebaseApp)
  : null;
