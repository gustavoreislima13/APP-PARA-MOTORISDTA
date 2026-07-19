import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  projectId: "gen-lang-client-0746242697",
  appId: "1:725626472954:web:c37fec10a60a95705c3c43",
  apiKey: "AIzaSyDdxe2ZFPIHQIIP2SMdnjgOl1b_zHKjwMI",
  authDomain: "gen-lang-client-0746242697.firebaseapp.com",
  storageBucket: "gen-lang-client-0746242697.firebasestorage.app",
  messagingSenderId: "725626472954"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User } | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (error: any) {
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      console.warn('Sign in popup closed by user or blocked by browser.');
    } else {
      console.error('Sign in error:', error);
    }
    throw error;
  }
};

export const logout = async () => {
  await auth.signOut();
};
