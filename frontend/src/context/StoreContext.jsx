import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const StoreContext = createContext();

export function useStore() {
  return useContext(StoreContext);
}

export function StoreProvider({ children }) {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [stores, setStores] = useState([]);
  const [currentStore, setCurrentStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !userProfile) {
      setStores([]);
      setCurrentStore(null);
      setLoading(false);
      return;
    }

    let unsubscribe;

    if (isAdmin) {
      // Admins see ALL stores in the system
      console.log("StoreContext: Loading all stores for Admin...");
      const q = query(collection(db, 'stores'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const storeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStores(storeData);
        initializeStore(storeData);
        setLoading(false);
      }, (error) => {
        console.error("StoreContext: Admin fetch error", error);
        setLoading(false);
      });
    } else {
      // Staff/Regular users only see stores they are assigned to
      const allowedIds = userProfile?.allowedStoreIds || [];
      console.log("StoreContext: Loading stores for user", allowedIds);

      if (allowedIds.length === 0) {
        setStores([]);
        setCurrentStore(null);
        setLoading(false);
      } else {
        const q = query(collection(db, 'stores'), where('__name__', 'in', allowedIds));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const storeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setStores(storeData);
          initializeStore(storeData);
          setLoading(false);
        }, (error) => {
          console.error("StoreContext: User fetch error", error);
          setLoading(false);
        });
      }
    }

    const timeout = setTimeout(() => {
      console.warn("StoreContext: Loading timeout reached");
      setLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      unsubscribe && unsubscribe();
    };
  }, [currentUser, userProfile, isAdmin]);

  function initializeStore(availableStores) {
    if (availableStores.length === 0) {
      setCurrentStore(null);
      return;
    }

    const savedStoreId = localStorage.getItem('shophub_current_store_id');
    const matchedStore = availableStores.find(s => s.id === savedStoreId);
    
    if (matchedStore) {
      setCurrentStore(matchedStore);
    } else {
      setCurrentStore(availableStores[0]);
    }
  }

  function switchStore(storeId) {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setCurrentStore(store);
      localStorage.setItem('shophub_current_store_id', storeId);
    }
  }

  async function updateStore(storeId, newData) {
    try {
      const storeRef = doc(db, 'stores', storeId);
      await updateDoc(storeRef, newData);
    } catch (err) {
      console.error("StoreContext: Update error", err);
      throw err;
    }
  }

  async function deleteStore(storeId) {
    try {
      // 1. Delete the store document
      await deleteDoc(doc(db, 'stores', storeId));
      
      // 2. If we just deleted the current store, switch to another one
      if (currentStore?.id === storeId) {
        const remainingStores = stores.filter(s => s.id !== storeId);
        if (remainingStores.length > 0) {
          switchStore(remainingStores[0].id);
        } else {
          setCurrentStore(null);
          localStorage.removeItem('shophub_current_store_id');
        }
      }
    } catch (err) {
      console.error("StoreContext: Delete error", err);
      throw err;
    }
  }

  const value = {
    stores,
    currentStore,
    loading,
    switchStore,
    updateStore,
    deleteStore
  };

  console.log("StoreContext Status:", { loading, currentStoreId: currentStore?.id, storesCount: stores.length });

  return (
    <StoreContext.Provider value={value}>
      {!loading && children}
    </StoreContext.Provider>
  );
}
