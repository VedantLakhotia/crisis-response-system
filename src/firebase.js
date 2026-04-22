// 1. Import the necessary tools from Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 2. This is the configuration from your photo (The Address)
const firebaseConfig = {
  apiKey: "AIzaSyDP2qv8g44-LMcAzTa0HmWJMxiBmQOCn10",
  authDomain: "crisisresponse-3be4f.firebaseapp.com",
  projectId: "crisisresponse-3be4f",
  storageBucket: "crisisresponse-3be4f.appspot.com",
  messagingSenderId: "1056363467864",
  appId: "1:1056363467864:web:448fb4a7090e200bdaa62d"
};

// 3. Initialize the app
const app = initializeApp(firebaseConfig);

// 4. Initialize the Database and EXPORT it
// This 'db' variable is what App.jsx uses to send/receive alerts
export const db = getFirestore(app);