import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2ICEhJa2wdwLEpjAmiubsKD5h_qz4rsw",
  authDomain: "askify-c1734.firebaseapp.com",
  projectId: "askify-c1734",
  storageBucket: "askify-c1734.firebasestorage.app",
  messagingSenderId: "598567539886",
  appId: "1:598567539886:web:5dc5c2f1b0196f4ddc493f",
  measurementId: "G-NM40DLG1MS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sync Firebase Auth with localStorage for persistent sessions
onAuthStateChanged(auth, (user) => {
  if (user) {
    localStorage.setItem('askifyUser', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    }));
  } else {
    localStorage.removeItem('askifyUser');
  }
});

/**
 * Checks if the user is currently authenticated via localStorage.
 * Useful for immediate redirects before Firebase Auth initializes.
 */
export const isAuthenticated = () => {
  return localStorage.getItem('askifyUser') !== null;
};

export { auth };



