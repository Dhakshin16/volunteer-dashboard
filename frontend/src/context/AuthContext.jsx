import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile } from '@/lib/firebase';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const { data } = await api.get('/user/me');
      setProfile(data);
      return data;
    } catch (e) {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [refreshProfile]);

  const loginEmail = (email, pwd) => signInWithEmailAndPassword(auth, email, pwd);
  const signupEmail = async (email, pwd, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pwd);
    if (name) await updateProfile(cred.user, { displayName: name });
    return cred;
  };
  const loginGoogle = () => signInWithPopup(auth, googleProvider);
  const logout = () => fbSignOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, profileLoading, refreshProfile, loginEmail, signupEmail, loginGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
