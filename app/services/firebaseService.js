// Firebase Database Services
// src/services/firebaseService.js

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ========== USER OPERATIONS ==========

// Create new user
export const createUser = async (userId, userData) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ User created in Firebase:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating user:', error);
    return { success: false, error: error.message };
  }
};

// Get user by phone number
export const getUserByPhone = async (phone) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phone', '==', phone));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
};

// Update user data
export const updateUser = async (userId, updates) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return { success: false, error: error.message };
  }
};

// ========== PRODUCT OPERATIONS ==========

// Get all products
export const getAllProducts = async () => {
  try {
    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    return products;
  } catch (error) {
    console.error('❌ Error getting products:', error);
    return [];
  }
};

// Add product (admin only - call from Firebase Console or admin panel)
export const addProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error adding product:', error);
    return { success: false, error: error.message };
  }
};

// Update product stock
export const updateProductStock = async (productId, newStock) => {
  try {
    await updateDoc(doc(db, 'products', productId), {
      stock: newStock,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating stock:', error);
    return { success: false, error: error.message };
  }
};

// ========== ORDER OPERATIONS ==========

// Create new order
export const createOrder = async (userId, orderData) => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      userId,
      ...orderData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ Order created:', docRef.id);
    return { success: true, orderId: docRef.id };
  } catch (error) {
    console.error('❌ Error creating order:', error);
    return { success: false, error: error.message };
  }
};

// Get user's orders
export const getUserOrders = async (userId) => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by date (newest first)
    orders.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    
    return orders;
  } catch (error) {
    console.error('❌ Error getting orders:', error);
    return [];
  }
};

// Update order status
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    return { success: false, error: error.message };
  }
};

// ========== CART OPERATIONS (Cloud Sync) ==========

// Save cart to cloud
export const saveCartToCloud = async (userId, cartItems) => {
  try {
    await setDoc(doc(db, 'carts', userId), {
      items: cartItems,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving cart:', error);
    return { success: false, error: error.message };
  }
};

// Get cart from cloud
export const getCartFromCloud = async (userId) => {
  try {
    const cartDoc = await getDoc(doc(db, 'carts', userId));
    
    if (cartDoc.exists()) {
      return cartDoc.data().items || [];
    }
    return [];
  } catch (error) {
    console.error('❌ Error getting cart:', error);
    return [];
  }
};

// Clear cart from cloud
export const clearCartFromCloud = async (userId) => {
  try {
    await deleteDoc(doc(db, 'carts', userId));
    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing cart:', error);
    return { success: false, error: error.message };
  }
};