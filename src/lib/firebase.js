import { initializeApp } from "firebase/app";

// Firebase web config for the "Fola web" app. These values identify the
// project to the client SDK; they are not secrets.
export const firebaseConfig = {
  apiKey: "AIzaSyBg6YnaJA2E8X1EEYXloOSlZxQa_hCf_DY",
  authDomain: "vot-health-za.firebaseapp.com",
  projectId: "vot-health-za",
  storageBucket: "vot-health-za.firebasestorage.app",
  messagingSenderId: "858004013937",
  appId: "1:858004013937:web:74e825940d6c1c00e72cd0",
};

export const app = initializeApp(firebaseConfig);
