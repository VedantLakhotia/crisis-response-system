// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import{getFirestore} from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDP2qV8g44-LMcAzTa0HmWJMxiBmQOCn10",
  authDomain: "crisisresponse-3be4f.firebaseapp.com",
  projectId: "crisisresponse-3be4f",
  storageBucket: "crisisresponse-3be4f.firebasestorage.app",
  messagingSenderId: "1056363467864",
  appId: "1:1056363467864:web:448fb4a7090e200bdaa62d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db =getFirestore(app);
