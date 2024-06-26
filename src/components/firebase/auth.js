import { auth } from './firebase_config.js';
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

const logInWithEmailAndPassword = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

const logout = () => {
  signOut(auth);
};

export { logInWithEmailAndPassword, logout };
