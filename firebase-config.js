// ===============================
// YES Connected Firebase Config
// Modern Firebase v10+ (ES Modules)
// ===============================

import { initializeApp } from "[gstatic.com](https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js)";
import { getAuth } from "[gstatic.com](https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js)";
import { getFirestore } from "[gstatic.com](https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js)";

// ===== Your Firebase Configuration =====
const firebaseConfig = {
  apiKey: "AIzaSyA4mqTVMfzKeyJjZfstcvRVyE3oa9_CO0Y",
  authDomain: "yesconnectedpshe.firebaseapp.com",
  projectId: "yesconnectedpshe",
  storageBucket: "yesconnectedpshe.appspot.com",   // ← Corrected bucket
  messagingSenderId: "1018281902876",
  appId: "1:1018281902876:web:f28e9d77c8a5f55aeb30d9"
};

// ===== Initialise Firebase =====
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
