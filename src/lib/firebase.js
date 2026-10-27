import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

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

// On this computer the app talks only to the emulators, under a "demo-"
// project ID: Firebase never lets a demo project reach a live one, so local
// testing can't touch real accounts, data or secrets.
export const LOCAL_PROJECT_ID = "demo-fola";
export const onLocalEmulators = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const app = initializeApp(
  onLocalEmulators ? { ...firebaseConfig, projectId: LOCAL_PROJECT_ID } : firebaseConfig,
);

export const auth = getAuth(app);
export const db = getFirestore(app);
// Must match the region the callable functions are deployed to.
export const functions = getFunctions(app, "africa-south1");

if (onLocalEmulators) {
  // Our own banner says we're local; the SDK's banner would cover the
  // bottom navigation.
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
