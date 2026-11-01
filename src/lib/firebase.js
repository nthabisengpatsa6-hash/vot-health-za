import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { FUNCTION_REGION } from "../../functions/shared/runtime.mjs";
import { emulatorConfig, installLocalNetworkPolicy, shouldUseEmulators } from "./firebaseSettings.js";

// Firebase web config for the "Fola web" app. These values identify the
// project to the client SDK; they are not secrets. authDomain is the live
// domain (a Hosting custom domain, which serves /__/auth/handler), so
// Google's account chooser names lemoha.co.za rather than the
// firebaseapp.com address. The local emulators don't use it.
export const firebaseConfig = {
  apiKey: "AIzaSyBg6YnaJA2E8X1EEYXloOSlZxQa_hCf_DY",
  authDomain: "lemoha.co.za",
  projectId: "vot-health-za",
  storageBucket: "vot-health-za.firebasestorage.app",
  messagingSenderId: "858004013937",
  appId: "1:858004013937:web:74e825940d6c1c00e72cd0",
};

// Local and unknown hosts fail closed to a separate demo configuration.
export { LOCAL_PROJECT_ID } from "./firebaseSettings.js";
export const onLocalEmulators = shouldUseEmulators(window.location.hostname, import.meta.env.DEV);
if (onLocalEmulators) installLocalNetworkPolicy(document);
export const app = initializeApp(onLocalEmulators ? emulatorConfig : firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Must match the region the callable functions are deployed to.
export const functions = getFunctions(app, FUNCTION_REGION);

if (onLocalEmulators) {
  // Our own banner says we're local; the SDK's banner would cover the
  // bottom navigation.
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
