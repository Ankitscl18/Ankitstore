import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CartScreen from './cart';
import CheckoutScreen from './checkout';
import MyOrdersScreen from './Myorders';

import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const { width } = Dimensions.get('window');

// Types
interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  badge?: string;
  imageUrl: string;
  weight: string;
  emoji?: string; // kept for cart.tsx compatibility
}

interface CartItem extends Product {
  quantity: number;
}

interface User {
  name: string;
  phone: string;
  email: string;
  address: string;
  password: string;
}

export type { CartItem };

// Firebase config for RecaptchaVerifierModal
const firebaseConfig = {
  apiKey: "AIzaSyCr_IqY8bb0U5noZ7srDkvOWxjnshnvx-k",
  authDomain: "ankitstore-487e7.firebaseapp.com",
  projectId: "ankitstore-487e7",
  storageBucket: "ankitstore-487e7.firebasestorage.app",
  messagingSenderId: "78955712918",
  appId: "1:78955712918:web:bead19a3e3b03b56f38db7",
};

// ========== FIREBASE FUNCTIONS ==========
const DEMO_USERS: { [key: string]: User } = {
  '9876543210': { name: 'Demo User', phone: '9876543210', email: 'demo@ankitstore.com', address: 'Demo Address, Demo City', password: 'demo123' }
};

const addUserToFirebase = async (phone: string, user: User): Promise<boolean> => {
  try { await setDoc(doc(db, 'users', phone), user); return true; }
  catch (error) { Alert.alert('Error', 'Failed to save user. Please try again.'); return false; }
};

const checkUserExistsFirebase = async (phone: string): Promise<User | null> => {
  try {
    if (DEMO_USERS[phone]) return DEMO_USERS[phone];
    const userDoc = await getDoc(doc(db, 'users', phone));
    if (userDoc.exists()) return userDoc.data() as User;
    return null;
  } catch (error) { return null; }
};

const saveLoggedInUser = (user: User) => {
  try { if (typeof window !== 'undefined' && window.localStorage) localStorage.setItem('LOGGED_IN_USER', JSON.stringify(user)); }
  catch (error) {}
};

const loadLoggedInUser = (): User | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('LOGGED_IN_USER');
      if (stored) return JSON.parse(stored);
    }
  } catch (error) {}
  return null;
};

const clearLoggedInUser = () => {
  try { if (typeof window !== 'undefined' && window.localStorage) localStorage.removeItem('LOGGED_IN_USER'); }
  catch (error) {}
};



const CATEGORIES = [
  { id: 'All', label: 'All', emoji: '🛒' },
  { id: 'Rice & Grains', label: 'Rice', emoji: '🌾' },
  { id: 'Dal & Pulses', label: 'Dal', emoji: '🫘' },
  { id: 'Dairy', label: 'Dairy', emoji: '🥛' },
  { id: 'Vegetables', label: 'Veggies', emoji: '🥦' },
  { id: 'Atta & Flour', label: 'Atta', emoji: '🌿' },
  { id: 'Oils', label: 'Oils', emoji: '🫙' },
  { id: 'Spices', label: 'Spices', emoji: '🌶️' },
  { id: 'Bakery', label: 'Bakery', emoji: '🍞' },
];

const BADGE_COLORS: { [key: string]: { bg: string; text: string } } = {
  'BESTSELLER': { bg: '#F8CB46', text: '#1A3C2E' },
  'SALE': { bg: '#FF3E3E', text: '#FFFFFF' },
  'FRESH': { bg: '#279F5E', text: '#FFFFFF' },
  'POPULAR': { bg: '#FF6B35', text: '#FFFFFF' },
  'ORGANIC': { bg: '#5C9E31', text: '#FFFFFF' },
  'HOT': { bg: '#FF3E3E', text: '#FFFFFF' },
  'NEW': { bg: '#7B2FBE', text: '#FFFFFF' },
};

// Separate component so useState works correctly
function ProductCard({ item, qty, onAdd, onUpdateQty }: {
  item: Product;
  qty: number;
  onAdd: () => void;
  onUpdateQty: (change: number) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const badge = item.badge ? BADGE_COLORS[item.badge] : null;
  const discount = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;

  const getCategoryEmoji = (category: string) => {
    switch(category) {
      case 'Rice & Grains': return '🌾';
      case 'Dal & Pulses': return '🫘';
      case 'Dairy': return '🥛';
      case 'Vegetables': return '🥬';
      case 'Atta & Flour': return '🌿';
      case 'Oils': return '🫙';
      case 'Spices': return '🌶️';
      case 'Bakery': return '🍞';
      default: return '📦';
    }
  };

  return (
    <View style={styles.productCard}>
      <View style={styles.productImageBox}>
        {!imgError ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.productImage}
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Text style={{ fontSize: 56 }}>{getCategoryEmoji(item.category)}</Text>
        )}
        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{item.badge}</Text>
          </View>
        )}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productWeight}>{item.weight}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productBrand}>{item.brand}</Text>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.productPrice}>₹{item.price}</Text>
            {item.originalPrice && (
              <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
            )}
          </View>

          {qty === 0 ? (
            <TouchableOpacity
              style={[styles.addBtn, item.stock === 0 && styles.addBtnDisabled]}
              onPress={onAdd}
              disabled={item.stock === 0}>
              <Text style={styles.addBtnText}>{item.stock > 0 ? 'ADD' : 'OUT'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQty(-1)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQty(1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    'welcome' | 'register' | 'login' | 'home' | 'cart' | 'checkout' | 'profile' | 'myorders'
  >('welcome');
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [verificationId, setVerificationId] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const recaptchaVerifier = useRef<any>(null);

  // Registration OTP states
  const [regVerificationId, setRegVerificationId] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtp, setRegOtp] = useState('');
  const [sendingRegOtp, setSendingRegOtp] = useState(false);
  const [verifyingRegOtp, setVerifyingRegOtp] = useState(false);

  // Form states
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Shopping states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const savedUser = loadLoggedInUser();
    if (savedUser) { setLoggedInUser(savedUser); setCurrentScreen('home'); }
  }, []);

  // Fetch products from Firestore
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const querySnapshot = await getDocs(collection(db, 'products'));
      const fetchedProducts: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedProducts.push({
          id: data.id || fetchedProducts.length + 1,
          name: data.name || '',
          brand: data.brand || '',
          category: data.category || '',
          price: data.price || 0,
          originalPrice: data.originalPrice,
          stock: data.stock || 0,
          badge: data.badge,
          imageUrl: data.imageUrl || '',
          weight: data.weight || '',
          emoji: data.emoji,
        });
      });
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Could not load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Step 1: Validate form and send OTP to phone
  const sendRegOTP = async () => {
    if (!regName.trim()) { Alert.alert('Error', 'Please enter your name'); return; }
    if (regPhone.length !== 10) { Alert.alert('Error', 'Please enter a valid 10-digit phone number'); return; }
    if (!regEmail.trim() || !regEmail.includes('@')) { Alert.alert('Error', 'Please enter a valid email'); return; }
    if (!regAddress.trim()) { Alert.alert('Error', 'Please enter your address'); return; }
    if (!regPassword.trim() || regPassword.length < 4) { Alert.alert('Error', 'Password must be at least 4 characters'); return; }

    const existingUser = await checkUserExistsFirebase(regPhone);
    if (existingUser) {
      Alert.alert('Already Registered', 'This number is already registered! Please login instead.',
        [{ text: 'Login', onPress: () => setCurrentScreen('login') }, { text: 'Cancel', style: 'cancel' }]);
      return;
    }

    setSendingRegOtp(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const id = await phoneProvider.verifyPhoneNumber('+91' + regPhone, recaptchaVerifier.current);
      setRegVerificationId(id);
      setRegOtpSent(true);
      Alert.alert('OTP Sent! 📱', 'Verification code sent to +91 ' + regPhone + '. Enter OTP to complete registration!');
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') Alert.alert('Too Many Requests', 'Please wait a few minutes and try again.');
      else Alert.alert('Error', 'Could not send OTP: ' + error.message);
    } finally { setSendingRegOtp(false); }
  };

  // Step 2: Verify OTP and create account
  const handleRegister = async () => {
    if (regOtp.length < 6) { Alert.alert('Error', 'Please enter the 6-digit OTP from SMS'); return; }
    if (!regVerificationId) { Alert.alert('Error', 'Please request OTP first'); return; }

    setVerifyingRegOtp(true);
    try {
      const credential = PhoneAuthProvider.credential(regVerificationId, regOtp);
      await signInWithCredential(auth, credential);

      const newUser: User = { name: regName, phone: regPhone, email: regEmail, address: regAddress, password: regPassword };
      const success = await addUserToFirebase(regPhone, newUser);
      if (!success) { setVerifyingRegOtp(false); return; }

      setLoggedInUser(newUser);
      saveLoggedInUser(newUser);
      setRegName(''); setRegPhone(''); setRegEmail(''); setRegAddress(''); setRegPassword('');
      setRegOtp(''); setRegOtpSent(false); setRegVerificationId('');
      setCurrentScreen('home');
    } catch (error: any) {
      if (error.code === 'auth/invalid-verification-code') Alert.alert('Wrong OTP', 'Please check your SMS and try again.');
      else if (error.code === 'auth/code-expired') { Alert.alert('OTP Expired', 'Please request a new one.'); setRegOtpSent(false); setRegOtp(''); }
      else Alert.alert('Error', 'Verification failed. Please try again.');
      setRegOtp('');
    } finally { setVerifyingRegOtp(false); }
  };
  const sendOTP = async () => {
    if (loginPhone.length !== 10) { Alert.alert('Error', 'Please enter a valid 10-digit phone number'); return; }
    const user = await checkUserExistsFirebase(loginPhone);
    if (!user) {
      Alert.alert('Not Registered', 'This phone number is not registered. Please register first!',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Register Now', onPress: () => setCurrentScreen('register') }]);
      return;
    }
    setSendingOtp(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const id = await phoneProvider.verifyPhoneNumber('+91' + loginPhone, recaptchaVerifier.current);
      setVerificationId(id);
      setOtpSent(true);
      Alert.alert('OTP Sent!', 'Verification code sent to +91 ' + loginPhone + '. Please check your SMS!');
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') Alert.alert('Too Many Requests', 'Please wait a few minutes and try again.');
      else Alert.alert('Error', 'Could not send OTP: ' + error.message);
    } finally { setSendingOtp(false); }
  };

  const handleLogin = async () => {
    if (otp.length < 6) { Alert.alert('Error', 'Please enter the 6-digit OTP'); return; }
    if (!verificationId) { Alert.alert('Error', 'Please request OTP first'); return; }
    setVerifyingOtp(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential);
      const user = await checkUserExistsFirebase(loginPhone);
      if (!user) { Alert.alert('Error', 'User not found. Please register first.'); return; }
      setLoggedInUser(user);
      saveLoggedInUser(user);
      setCurrentScreen('home');
      setOtpSent(false); setOtp(''); setLoginPhone(''); setVerificationId('');
      Alert.alert('Welcome back!', user.name + ', you are logged in!');
    } catch (error: any) {
      if (error.code === 'auth/invalid-verification-code') Alert.alert('Wrong OTP', 'Please check your SMS and try again.');
      else if (error.code === 'auth/code-expired') { Alert.alert('OTP Expired', 'Please request a new one.'); setOtpSent(false); setOtp(''); }
      else Alert.alert('Failed', 'Could not verify OTP. Please try again.');
      setOtp('');
    } finally { setVerifyingOtp(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => {
        setLoggedInUser(null); clearLoggedInUser(); setCart([]);
        setSelectedCategory('All'); setSearchQuery('');
        setLoginPhone(''); setOtp(''); setOtpSent(false); setVerificationId('');
        setCurrentScreen('welcome');
      }}
    ]);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    else setCart([...cart, { ...product, quantity: 1 }]);
  };

  const updateQuantity = (id: number, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter((item): item is CartItem => item !== null));
  };

  const removeFromCart = (id: number) => setCart(cart.filter(item => item.id !== id));
  const clearCart = () => setCart([]);

  const getCartQuantity = (productId: number) => {
    const item = cart.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      item={item}
      qty={getCartQuantity(item.id)}
      onAdd={() => addToCart(item)}
      onUpdateQty={(change) => updateQuantity(item.id, change)}
    />
  );

    
  // Reusable Bottom Navigation Component
  const BottomNavigation = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('home')}>
        <Text style={styles.navIcon}>🏠</Text>
        <Text style={[styles.navLabel, currentScreen === 'home' && styles.navLabelActive]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => Alert.alert('Coming Soon', 'Explore feature coming soon!')}>
        <Text style={styles.navIcon}>▶️</Text>
        <Text style={styles.navLabel}>Explore</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('cart')}>
        <Text style={styles.navIcon}>🛒</Text>
        <Text style={[styles.navLabel, currentScreen === 'cart' && styles.navLabelActive]}>Cart</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('myorders')}>
        <Text style={styles.navIcon}>📋</Text>
        <Text style={[styles.navLabel, currentScreen === 'myorders' && styles.navLabelActive]}>Orders</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('profile')}>
        <Text style={styles.navIcon}>👤</Text>
        <Text style={[styles.navLabel, currentScreen === 'profile' && styles.navLabelActive]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  // ========== SCREENS ==========

  if (currentScreen === 'myorders') return <MyOrdersScreen userPhone={loggedInUser?.phone || ''} goBack={() => setCurrentScreen('profile')} />;
  if (currentScreen === 'checkout') return (
    <CheckoutScreen cart={cart} cartTotal={cartTotal} goBack={() => setCurrentScreen('cart')}
      clearCart={clearCart} goToHome={() => setCurrentScreen('home')}
      userPhone={loggedInUser?.phone || ''} userName={loggedInUser?.name || ''} userAddress={loggedInUser?.address || ''} />
  );
  if (currentScreen === 'cart') return (
    <CartScreen cart={cart} updateQuantity={updateQuantity} removeFromCart={removeFromCart}
      clearCart={clearCart} goBack={() => setCurrentScreen('home')} goToCheckout={() => setCurrentScreen('checkout')} />
  );

  // WELCOME
  if (currentScreen === 'welcome') {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeTop}>
          <View style={styles.welcomeLogoBox}>
            <Text style={styles.welcomeLogo}>🛒</Text>
          </View>
          <Text style={styles.welcomeTitle}>Ankit Store</Text>
          <Text style={styles.welcomeTagline}>Groceries delivered in minutes!</Text>
          <View style={styles.welcomeTags}>
            <View style={styles.tag}><Text style={styles.tagText}>⚡ Fast Delivery</Text></View>
            <View style={styles.tag}><Text style={styles.tagText}>🌿 Fresh Products</Text></View>
            <View style={styles.tag}><Text style={styles.tagText}>💰 Best Prices</Text></View>
          </View>
        </View>
        <View style={styles.welcomeBottom}>
          <TouchableOpacity style={styles.blinkitBtn} onPress={() => setCurrentScreen('register')}>
            <Text style={styles.blinkitBtnText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.blinkitOutlineBtn} onPress={() => setCurrentScreen('login')}>
            <Text style={styles.blinkitOutlineBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // REGISTER
  if (currentScreen === 'register') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F5F5F5' }}>

        {/* RecaptchaVerifier needed for registration OTP too! */}
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification={true}
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.authHeader}>
            <TouchableOpacity onPress={() => { setCurrentScreen('welcome'); setRegOtpSent(false); setRegOtp(''); }} style={styles.authBack}>
              <Text style={styles.authBackText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.authTitle}>{regOtpSent ? 'Verify Phone' : 'Create Account'}</Text>
          </View>

          <View style={styles.authForm}>
            {!regOtpSent ? (
              // ===== STEP 1: FILL DETAILS =====
              <>
                <View style={styles.otpIllustration}>
                  <Text style={styles.otpEmoji}>📝</Text>
                  <Text style={styles.otpTitle}>Create Account</Text>
                  <Text style={styles.otpSubtitle}>Fill details & verify your phone number</Text>
                </View>

                {[
                  { label: 'Full Name', value: regName, setter: setRegName, placeholder: 'Your full name', keyboard: 'default' as const },
                  { label: 'Email', value: regEmail, setter: setRegEmail, placeholder: 'your@email.com', keyboard: 'email-address' as const },
                  { label: 'Delivery Address', value: regAddress, setter: setRegAddress, placeholder: 'House no, Street, City, Pincode', keyboard: 'default' as const },
                  { label: 'Password', value: regPassword, setter: setRegPassword, placeholder: 'Min 4 characters', keyboard: 'default' as const, secure: true },
                ].map((field, i) => (
                  <View key={i} style={styles.fieldBox}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput style={styles.fieldInput} placeholder={field.placeholder} value={field.value}
                      onChangeText={field.setter} keyboardType={field.keyboard}
                      secureTextEntry={field.secure} placeholderTextColor="#999" autoCapitalize="none" />
                  </View>
                ))}

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+91</Text></View>
                    <TextInput style={styles.phoneField} placeholder="10-digit number" keyboardType="phone-pad"
                      maxLength={10} value={regPhone} onChangeText={setRegPhone} placeholderTextColor="#999" />
                  </View>
                  <Text style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                    📱 OTP will be sent to this number
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.blinkitBtn, sendingRegOtp && styles.btnDisabled]}
                  onPress={sendRegOTP}
                  disabled={sendingRegOtp}>
                  {sendingRegOtp ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#1A3C2E" size="small" />
                      <Text style={styles.blinkitBtnText}>Sending OTP...</Text>
                    </View>
                  ) : (
                    <Text style={styles.blinkitBtnText}>Send OTP to Verify →</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              // ===== STEP 2: VERIFY OTP =====
              <>
                <View style={styles.otpIllustration}>
                  <Text style={styles.otpEmoji}>✉️</Text>
                  <Text style={styles.otpTitle}>Verify Phone</Text>
                  <Text style={styles.otpSubtitle}>OTP sent to +91 {regPhone}</Text>
                </View>

                {/* Phone summary card */}
                <View style={{ backgroundColor: '#F0F9F4', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1.5, borderColor: '#C8E6C9' }}>
                  <Text style={{ fontSize: 13, color: '#279F5E', fontWeight: '700', marginBottom: 4 }}>✅ Details Saved</Text>
                  <Text style={{ fontSize: 14, color: '#1A3C2E', fontWeight: '800' }}>{regName}</Text>
                  <Text style={{ fontSize: 13, color: '#666' }}>+91 {regPhone} · {regEmail}</Text>
                </View>

                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Enter OTP from SMS</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.otpInput]}
                    placeholder="6-digit code"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={regOtp}
                    onChangeText={setRegOtp}
                    placeholderTextColor="#999"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.blinkitBtn, verifyingRegOtp && styles.btnDisabled]}
                  onPress={handleRegister}
                  disabled={verifyingRegOtp}>
                  {verifyingRegOtp ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#1A3C2E" size="small" />
                      <Text style={styles.blinkitBtnText}>Creating Account...</Text>
                    </View>
                  ) : (
                    <Text style={styles.blinkitBtnText}>Verify & Create Account ✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setRegOtpSent(false); setRegOtp(''); setRegVerificationId(''); }}
                  style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ color: '#666' }}>← Change Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={sendRegOTP}
                  disabled={sendingRegOtp}
                  style={{ alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ color: '#279F5E', fontWeight: '700' }}>
                    {sendingRegOtp ? 'Sending...' : '🔄 Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setCurrentScreen('login')} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: '#666' }}>Already have an account? <Text style={{ color: '#1A3C2E', fontWeight: 'bold' }}>Login</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // LOGIN
  if (currentScreen === 'login') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={firebaseConfig} attemptInvisibleVerification={true} />
        <View style={styles.authHeader}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')} style={styles.authBack}>
            <Text style={styles.authBackText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.authTitle}>{otpSent ? 'Enter OTP' : 'Login'}</Text>
        </View>
        <View style={styles.authForm}>
          {!otpSent ? (
            <>
              <View style={styles.otpIllustration}>
                <Text style={styles.otpEmoji}>📱</Text>
                <Text style={styles.otpTitle}>Phone Verification</Text>
                <Text style={styles.otpSubtitle}>We'll send a real OTP to your phone!</Text>
              </View>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+91</Text></View>
                  <TextInput style={styles.phoneField} placeholder="10-digit number" keyboardType="phone-pad"
                    maxLength={10} value={loginPhone} onChangeText={setLoginPhone} placeholderTextColor="#999" />
                </View>
              </View>
              <TouchableOpacity style={[styles.blinkitBtn, sendingOtp && styles.btnDisabled]} onPress={sendOTP} disabled={sendingOtp}>
                {sendingOtp
                  ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color="#1A3C2E" size="small" /><Text style={styles.blinkitBtnText}>Sending OTP...</Text></View>
                  : <Text style={styles.blinkitBtnText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.otpIllustration}>
                <Text style={styles.otpEmoji}>✉️</Text>
                <Text style={styles.otpTitle}>Check Your SMS</Text>
                <Text style={styles.otpSubtitle}>OTP sent to +91 {loginPhone}</Text>
              </View>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Enter OTP</Text>
                <TextInput style={[styles.fieldInput, styles.otpInput]} placeholder="6-digit code"
                  keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} placeholderTextColor="#999" />
              </View>
              <TouchableOpacity style={[styles.blinkitBtn, verifyingOtp && styles.btnDisabled]} onPress={handleLogin} disabled={verifyingOtp}>
                {verifyingOtp
                  ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color="#1A3C2E" size="small" /><Text style={styles.blinkitBtnText}>Verifying...</Text></View>
                  : <Text style={styles.blinkitBtnText}>Verify & Login</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); setVerificationId(''); }} style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={{ color: '#666' }}>← Change Number</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => setCurrentScreen('register')} style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: '#666' }}>Don't have an account? <Text style={{ color: '#1A3C2E', fontWeight: 'bold' }}>Register</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // PROFILE
  if (currentScreen === 'profile') {
    const menuItems = [
      { icon: '📦', title: 'My Orders', sub: 'View order history', action: () => setCurrentScreen('myorders') },
      { icon: '📍', title: 'My Address', sub: loggedInUser?.address || '', action: () => Alert.alert('Address', loggedInUser?.address) },
      { icon: '📧', title: 'Email', sub: loggedInUser?.email || '', action: () => {} },
      { icon: '📱', title: 'Phone', sub: '+91 ' + (loggedInUser?.phone || ''), action: () => {} },
      { icon: '💳', title: 'Payment Methods', sub: 'Cash on Delivery', action: () => Alert.alert('Payments', 'Coming soon!') },
      { icon: '❓', title: 'Help & Support', sub: 'support@ankitstore.com', action: () => Alert.alert('Support', 'support@ankitstore.com') },
    ];
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={() => setCurrentScreen('home')} style={styles.authBack}>
            <Text style={{ fontSize: 24, color: 'white' }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.authTitle, { color: 'white' }]}>My Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}><Text style={{ fontSize: 40 }}>👤</Text></View>
          <Text style={styles.profileName}>{loggedInUser?.name}</Text>
          <Text style={styles.profilePhone}>+91 {loggedInUser?.phone}</Text>
        </View>
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={i} style={[styles.menuRow, i < menuItems.length - 1 && styles.menuRowBorder]} onPress={item.action}>
                <View style={styles.menuIcon}><Text style={{ fontSize: 22 }}>{item.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                <Text style={{ fontSize: 20, color: '#CCC' }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>🚪  Logout</Text>
          </TouchableOpacity>
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Bottom Navigation - Always Visible */}
        <BottomNavigation />
      </View>
    );
  }

  // HOME SCREEN
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.deliveryLabel}>⚡ Delivery in 10 minutes</Text>
            <Text style={styles.locationText}>📍 {loggedInUser?.address?.split(',')[0] || 'Your Location'}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => setCurrentScreen('profile')}>
            <Text style={{ fontSize: 22 }}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartHeaderBtn} onPress={() => setCurrentScreen('cart')}>
            <Text style={{ fontSize: 22 }}>🛒</Text>
            {cartItemsCount > 0 && (
              <View style={styles.cartHeaderBadge}>
                <Text style={styles.cartHeaderBadgeText}>{cartItemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search brands, products..." value={searchQuery}
          onChangeText={setSearchQuery} placeholderTextColor="#999" />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={{ fontSize: 18, color: '#999' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Promo Banner */}
      {!searchQuery && (
        <View style={styles.promoBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>🎉 Welcome Offer!</Text>
            <Text style={styles.promoSubtitle}>Get fresh groceries delivered fast</Text>
            <Text style={styles.promoCode}>Free delivery on first order!</Text>
          </View>
          <Text style={styles.promoEmoji}>🛍️</Text>
        </View>
      )}

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat.id} style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
            onPress={() => setSelectedCategory(cat.id)}>
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={[styles.catLabel, selectedCategory === cat.id && styles.catLabelActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: cartItemsCount > 0 ? 100 : 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={{ fontSize: 18, color: '#666', marginTop: 12 }}>No products found</Text>
          </View>
        }
      />

      {/* Cart Summary Bar */}
      {cartItemsCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => setCurrentScreen('cart')}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBarBadge}><Text style={styles.cartBarBadgeText}>{cartItemsCount}</Text></View>
            <Text style={styles.cartBarLabel}>items in basket</Text>
          </View>
          <Text style={styles.cartBarTotal}>₹{cartTotal}  →</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  // Welcome
  welcomeContainer: { flex: 1, backgroundColor: '#1A3C2E' },
  welcomeTop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  welcomeLogoBox: { width: 100, height: 100, borderRadius: 24, backgroundColor: '#F8CB46', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  welcomeLogo: { fontSize: 52 },
  welcomeTitle: { fontSize: 42, fontWeight: '900', color: '#F8CB46', letterSpacing: 1, marginBottom: 8 },
  welcomeTagline: { fontSize: 16, color: '#A8D5B5', marginBottom: 32, textAlign: 'center' },
  welcomeTags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  tag: { backgroundColor: 'rgba(248,203,70,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(248,203,70,0.3)' },
  tagText: { color: '#F8CB46', fontSize: 13, fontWeight: '600' },
  welcomeBottom: { padding: 24, gap: 12 },
  blinkitBtn: { backgroundColor: '#F8CB46', height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  blinkitBtnText: { color: '#1A3C2E', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  blinkitOutlineBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F8CB46' },
  blinkitOutlineBtnText: { color: '#F8CB46', fontSize: 18, fontWeight: '700' },
  btnDisabled: { backgroundColor: '#CCC' },

  // Auth
  authHeader: { backgroundColor: '#1A3C2E', paddingTop: 54, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  authBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  authBackText: { fontSize: 22, color: 'white' },
  authTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  authForm: { padding: 20 },
  fieldBox: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { backgroundColor: 'white', height: 54, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#222', borderWidth: 1.5, borderColor: '#E5E5E5' },
  phoneRow: { flexDirection: 'row', gap: 10 },
  phonePrefix: { backgroundColor: 'white', height: 54, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#E5E5E5' },
  phonePrefixText: { fontSize: 16, fontWeight: '700', color: '#222' },
  phoneField: { flex: 1, backgroundColor: 'white', height: 54, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#222', borderWidth: 1.5, borderColor: '#E5E5E5' },
  otpIllustration: { alignItems: 'center', paddingVertical: 24 },
  otpEmoji: { fontSize: 56, marginBottom: 12 },
  otpTitle: { fontSize: 22, fontWeight: '800', color: '#1A3C2E', marginBottom: 6 },
  otpSubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  otpInput: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 8, color: '#1A3C2E' },

  // Profile
  profileHeader: { backgroundColor: '#1A3C2E', paddingTop: 54, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileCard: { backgroundColor: 'white', margin: 16, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F9F4', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#1A3C2E', marginBottom: 4 },
  profilePhone: { fontSize: 15, color: '#666' },
  menuCard: { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F9F4', justifyContent: 'center', alignItems: 'center' },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#999' },
  logoutBtn: { margin: 16, backgroundColor: '#FFF0F0', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD0D0' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#D32F2F' },

  // Home
  homeHeader: { backgroundColor: '#1A3C2E', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  homeHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deliveryLabel: { fontSize: 13, color: '#F8CB46', fontWeight: '700', marginBottom: 2 },
  locationText: { fontSize: 14, color: 'white', fontWeight: '600' },
  profileBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  cartHeaderBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F8CB46', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cartHeaderBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3E3E', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: 'white' },
  cartHeaderBadgeText: { color: 'white', fontSize: 11, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 12, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#EBEBEB', height: 50 },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#222' },
  promoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A3C2E', marginHorizontal: 12, borderRadius: 16, padding: 16, marginBottom: 4 },
  promoTitle: { fontSize: 16, fontWeight: '800', color: '#F8CB46', marginBottom: 4 },
  promoSubtitle: { fontSize: 13, color: '#A8D5B5', marginBottom: 4 },
  promoCode: { fontSize: 12, color: '#F8CB46', fontWeight: '700' },
  promoEmoji: { fontSize: 48 },
  catScroll: { maxHeight: 72, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  catChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8, backgroundColor: '#F5F5F5', minWidth: 64 },
  catChipActive: { backgroundColor: '#1A3C2E' },
  catEmoji: { fontSize: 20, marginBottom: 2 },
  catLabel: { fontSize: 11, fontWeight: '700', color: '#666' },
  catLabelActive: { color: '#F8CB46' },

  // Product Card
  productCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, margin: 6, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  productImageBox: { height: 150, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', position: 'relative', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  productImage: { width: '85%', height: '85%' },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  discountBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FF3E3E', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  discountText: { fontSize: 10, fontWeight: '800', color: 'white' },
  productInfo: { padding: 12 },
  productWeight: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 3 },
  productName: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 2, minHeight: 34 },
  productBrand: { fontSize: 11, color: '#279F5E', fontWeight: '600', marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 17, fontWeight: '800', color: '#1A3C2E' },
  originalPrice: { fontSize: 12, color: '#999', textDecorationLine: 'line-through' },
  addBtn: { backgroundColor: '#F8CB46', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addBtnDisabled: { backgroundColor: '#E0E0E0' },
  addBtnText: { fontSize: 14, fontWeight: '800', color: '#1A3C2E' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A3C2E', borderRadius: 10, overflow: 'hidden' },
  qtyBtn: { width: 32, height: 34, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: '#F8CB46' },
  qtyText: { fontSize: 15, fontWeight: '800', color: 'white', minWidth: 24, textAlign: 'center' },

  // Cart Bar
  cartBar: { position: 'absolute', bottom: 85, left: 0, right: 0, backgroundColor: '#1A3C2E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 24 },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBarBadge: { backgroundColor: '#F8CB46', borderRadius: 8, minWidth: 28, height: 28, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  cartBarBadgeText: { color: '#1A3C2E', fontSize: 14, fontWeight: '800' },
  cartBarLabel: { color: 'white', fontSize: 14, fontWeight: '600' },
  cartBarTotal: { color: '#F8CB46', fontSize: 18, fontWeight: '800' },

  // Bottom Navigation
  bottomNav: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: 'white', 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    paddingTop: 10,
    paddingBottom: 35,  // Increased to 35 to avoid phone navigation
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 4,
  },
  navIcon: { 
    fontSize: 22, 
    marginBottom: 2,
  },
  navLabel: { 
    fontSize: 11, 
    color: '#999', 
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#1A3C2E',
    fontWeight: '800',
  },
});