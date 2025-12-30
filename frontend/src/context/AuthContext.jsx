import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function sendVerification() {
    if (auth.currentUser) {
      return sendEmailVerification(auth.currentUser);
    }
  }

  async function refreshUser() {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setCurrentUser({ ...auth.currentUser }); // Spread into new object to force React update
    }
  }

  function changePassword(newPassword) {
    if (auth.currentUser) {
      return updatePassword(auth.currentUser, newPassword);
    }
  }

  async function updateUserData(data) {
    if (auth.currentUser) {
      // Update Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...data,
        updatedAt: serverTimestamp()
      });
      // Update Firebase Auth profile (name)
      if (data.name) {
        await updateProfile(auth.currentUser, { displayName: data.name });
      }
      return refreshUser();
    }
  }

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            // Create default profile if not exists
            const defaultProfile = {
              email: user.email,
              role: 'staff', // Default to staff
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', user.uid), defaultProfile);
            setUserProfile(defaultProfile);
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    isAdmin: userProfile?.role?.toLowerCase() === 'admin',
    login,
    logout,
    resetPassword,
    sendVerification,
    refreshUser,
    changePassword,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
