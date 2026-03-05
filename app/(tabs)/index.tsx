import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../config/firebase';
import CartScreen from './cart';
import CheckoutScreen from './checkout';
import MyOrdersScreen from './Myorders';

interface Product {
  id: number; name: string; brand: string; category: string;
  price: number; originalPrice?: number; stock: number;
  badge?: string; imageUrl: string; weight: string; emoji?: string;
}
interface CartItem extends Product { quantity: number; }
interface User { name: string; phone: string; email: string; address: string; uid?: string; }
export type { CartItem };

const addUserToFirebase = async (uid: string, user: User): Promise<boolean> => {
  try { await setDoc(doc(db, 'users', uid), user); return true; }
  catch { Alert.alert('Error', 'Failed to save user.'); return false; }
};

const getUserFromFirebase = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) return userDoc.data() as User;
    return null;
  } catch { return null; }
};

let _userCache: User | null = null;
const saveUser = (u: User) => { _userCache = u; };
const clearUser = () => { _userCache = null; };

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

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  BESTSELLER: { bg: '#F8CB46', text: '#1A3C2E' },
  SALE: { bg: '#FF3E3E', text: '#FFFFFF' },
  FRESH: { bg: '#279F5E', text: '#FFFFFF' },
  POPULAR: { bg: '#FF6B35', text: '#FFFFFF' },
  ORGANIC: { bg: '#5C9E31', text: '#FFFFFF' },
  HOT: { bg: '#FF3E3E', text: '#FFFFFF' },
  NEW: { bg: '#7B2FBE', text: '#FFFFFF' },
};

const CAT_EMOJI: Record<string, string> = {
  'Rice & Grains': '🌾', 'Dal & Pulses': '🫘', Dairy: '🥛',
  Vegetables: '🥬', 'Atta & Flour': '🌿', Oils: '🫙', Spices: '🌶️', Bakery: '🍞',
};

function ProductCard({ item, qty, onAdd, onUpdateQty }: {
  item: Product; qty: number; onAdd: () => void; onUpdateQty: (n: number) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const badge = item.badge ? BADGE_COLORS[item.badge] : null;
  const discount = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;
  return (
    <View style={s.productCard}>
      <View style={s.productImageBox}>
        {!imgError
          ? <Image source={{ uri: item.imageUrl }} style={s.productImage} resizeMode="contain" onError={() => setImgError(true)} />
          : <Text style={{ fontSize: 48 }}>{CAT_EMOJI[item.category] || '📦'}</Text>}
        {badge && <View style={[s.badge, { backgroundColor: badge.bg }]}><Text style={[s.badgeText, { color: badge.text }]}>{item.badge}</Text></View>}
        {discount > 0 && <View style={s.discountBadge}><Text style={s.discountText}>{discount}% OFF</Text></View>}
      </View>
      <View style={s.productInfo}>
        <Text style={s.productWeight}>{item.weight}</Text>
        <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={s.productBrand}>{item.brand}</Text>
        <View style={s.priceRow}>
          <View>
            <Text style={s.productPrice}>₹{item.price}</Text>
            {item.originalPrice && <Text style={s.originalPrice}>₹{item.originalPrice}</Text>}
          </View>
          {qty === 0
            ? <TouchableOpacity style={[s.addBtn, item.stock === 0 && s.addBtnDisabled]} onPress={onAdd} disabled={item.stock === 0}>
                <Text style={s.addBtnText}>{item.stock > 0 ? 'ADD' : 'OUT'}</Text>
              </TouchableOpacity>
            : <View style={s.qtyControl}>
                <TouchableOpacity style={s.qtyBtn} onPress={() => onUpdateQty(-1)}><Text style={s.qtyBtnText}>−</Text></TouchableOpacity>
                <Text style={s.qtyText}>{qty}</Text>
                <TouchableOpacity style={s.qtyBtn} onPress={() => onUpdateQty(1)}><Text style={s.qtyBtnText}>+</Text></TouchableOpacity>
              </View>}
        </View>
      </View>
    </View>
  );
}

type Screen = 'welcome' | 'register' | 'login' | 'home' | 'cart' | 'checkout' | 'profile' | 'myorders';

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [user, setUser] = useState<User | null>(null);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [selCat, setSelCat] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const unsub = (auth as any).onAuthStateChanged(async (fu: any) => {
      if (fu) {
        const ud = await getUserFromFirebase(fu.uid);
        if (ud) { setUser(ud); saveUser(ud); setScreen('home'); }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingProducts(true);
        const snap = await getDocs(collection(db, 'products'));
        const list: Product[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({
            id: data.id || list.length + 1, name: data.name || '',
            brand: data.brand || '', category: data.category || '',
            price: data.price || 0, originalPrice: data.originalPrice,
            stock: data.stock || 0, badge: data.badge,
            imageUrl: data.imageUrl || '', weight: data.weight || '',
          });
        });
        setProducts(list);
      } catch { Alert.alert('Error', 'Could not load products'); }
      finally { setLoadingProducts(false); }
    })();
  }, []);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const filtered = products.filter(p =>
    (selCat === 'All' || p.category === selCat) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const handleRegister = async () => {
    if (!regName.trim()) { Alert.alert('Error', 'Enter your name'); return; }
    if (regPhone.length !== 10) { Alert.alert('Error', 'Enter valid 10-digit phone'); return; }
    if (!regEmail.includes('@')) { Alert.alert('Error', 'Enter valid email'); return; }
    if (!regAddress.trim()) { Alert.alert('Error', 'Enter your address'); return; }
    if (regPassword.length < 6) { Alert.alert('Error', 'Password min 6 characters'); return; }
    setRegLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      const newUser: User = { name: regName, phone: regPhone, email: regEmail.trim(), address: regAddress, uid: cred.user.uid };
      await addUserToFirebase(cred.user.uid, newUser);
      setUser(newUser); saveUser(newUser);
      setRegName(''); setRegPhone(''); setRegEmail(''); setRegAddress(''); setRegPassword('');
      setScreen('home');
      Alert.alert('Welcome! 🎉', 'Account created!');
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') Alert.alert('Already Registered', 'Email exists!', [{ text: 'Login', onPress: () => setScreen('login') }, { text: 'Cancel', style: 'cancel' }]);
      else if (e.code === 'auth/weak-password') Alert.alert('Weak Password', 'Use at least 6 characters.');
      else Alert.alert('Error', e.message);
    } finally { setRegLoading(false); }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim()) { Alert.alert('Error', 'Enter email'); return; }
    if (!loginPassword.trim()) { Alert.alert('Error', 'Enter password'); return; }
    setLoginLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const ud = await getUserFromFirebase(cred.user.uid);
      if (!ud) { Alert.alert('Error', 'User not found. Register again.'); return; }
      setUser(ud); saveUser(ud);
      setLoginEmail(''); setLoginPassword('');
      setScreen('home');
      Alert.alert('Welcome back! 👋', ud.name + ' logged in!');
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found')
        Alert.alert('Login Failed', 'Email or password incorrect.');
      else if (e.code === 'auth/too-many-requests') Alert.alert('Locked', 'Too many attempts. Try later.');
      else Alert.alert('Error', e.message);
    } finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await (auth as any).signOut();
        setUser(null); clearUser(); setCart([]); setSelCat('All'); setSearch('');
        setScreen('welcome');
      }},
    ]);
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...p, quantity: 1 }];
    });
  };

  const updateQty = (id: number, change: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + change } : i).filter(i => i.quantity > 0) as CartItem[]);
  };

  const Nav = () => (
    <View style={s.bottomNav}>
      {([
        { icon: '🏠', label: 'Home', sc: 'home' as Screen },
        { icon: '▶️', label: 'Explore', sc: null as Screen | null },
        { icon: '🛒', label: 'Cart', sc: 'cart' as Screen },
        { icon: '📋', label: 'Orders', sc: 'myorders' as Screen },
        { icon: '👤', label: 'Profile', sc: 'profile' as Screen },
      ] as { icon: string; label: string; sc: Screen | null }[]).map((item, i) => (
        <TouchableOpacity key={i} style={s.navItem} onPress={() => item.sc ? setScreen(item.sc) : Alert.alert('Coming Soon', 'Explore coming soon!')}>
          <Text style={s.navIcon}>{item.icon}</Text>
          <Text style={[s.navLabel, screen === item.sc && s.navLabelActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (screen === 'myorders') return <MyOrdersScreen userPhone={user?.phone || ''} goBack={() => setScreen('profile')} />;
  if (screen === 'checkout') return <CheckoutScreen cart={cart} cartTotal={cartTotal} goBack={() => setScreen('cart')} clearCart={() => setCart([])} goToHome={() => setScreen('home')} userPhone={user?.phone || ''} userName={user?.name || ''} userAddress={user?.address || ''} />;
  if (screen === 'cart') return <CartScreen cart={cart} updateQuantity={updateQty} removeFromCart={(id) => setCart(c => c.filter(i => i.id !== id))} clearCart={() => setCart([])} goBack={() => setScreen('home')} goToCheckout={() => setScreen('checkout')} />;

  if (screen === 'welcome') return (
    <View style={s.welcomeContainer}>
      <View style={s.welcomeTop}>
        <View style={s.welcomeLogoBox}><Text style={{ fontSize: 52 }}>🛒</Text></View>
        <Text style={s.welcomeTitle}>Ankit Store</Text>
        <Text style={s.welcomeTagline}>Groceries delivered in minutes!</Text>
        <View style={s.welcomeTags}>
          {['⚡ Fast Delivery', '🌿 Fresh Products', '💰 Best Prices'].map((t, i) => (
            <View key={i} style={s.tag}><Text style={s.tagText}>{t}</Text></View>
          ))}
        </View>
      </View>
      <View style={s.welcomeBottom}>
        <TouchableOpacity style={s.blinkitBtn} onPress={() => setScreen('register')}><Text style={s.blinkitBtnText}>Create Account</Text></TouchableOpacity>
        <TouchableOpacity style={s.blinkitOutlineBtn} onPress={() => setScreen('login')}><Text style={s.blinkitOutlineBtnText}>Login</Text></TouchableOpacity>
      </View>
    </View>
  );

  if (screen === 'register') return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.authHeader}>
          <TouchableOpacity onPress={() => setScreen('welcome')} style={s.authBack}><Text style={s.authBackText}>←</Text></TouchableOpacity>
          <Text style={s.authTitle}>Create Account</Text>
        </View>
        <View style={s.authForm}>
          <View style={s.otpIllustration}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>📝</Text>
            <Text style={s.otpTitle}>Create Account</Text>
            <Text style={s.otpSubtitle}>Fill your details to get started</Text>
          </View>
          <View style={s.fieldBox}>
            <Text style={s.fieldLabel}>Full Name</Text>
            <TextInput style={s.fieldInput} placeholder="Your full name" value={regName} onChangeText={setRegName} placeholderTextColor="#999" />
          </View>
          <View style={s.fieldBox}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput style={s.fieldInput} placeholder="your@email.com" value={regEmail} onChangeText={setRegEmail} keyboardType="email-address" placeholderTextColor="#999" autoCapitalize="none" />
          </View>
          <View style={s.fieldBox}>
            <Text style={s.fieldLabel}>Delivery Address</Text>
            <TextInput style={s.fieldInput} placeholder="House no, Street, City, Pincode" value={regAddress} onChangeText={setRegAddress} placeholderTextColor="#999" />
          </View>
          <View style={s.fieldBox}>
            <Text style={s.fieldLabel}>Phone Number</Text>
            <View style={s.phoneRow}>
              <View style={s.phonePrefix}><Text style={s.phonePrefixText}>+91</Text></View>
              <TextInput style={s.phoneField} placeholder="10-digit number" keyboardType="phone-pad" maxLength={10} value={regPhone} onChangeText={setRegPhone} placeholderTextColor="#999" />
            </View>
          </View>
          <View style={s.fieldBox}>
            <Text style={s.fieldLabel}>Password</Text>
            <View style={{ position: 'relative' }}>
              <TextInput style={s.fieldInput} placeholder="Min 6 characters" value={regPassword} onChangeText={setRegPassword} secureTextEntry={!showRegPwd} placeholderTextColor="#999" autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowRegPwd(!showRegPwd)} style={{ position: 'absolute', right: 14, top: 16 }}>
                <Text style={{ fontSize: 18 }}>{showRegPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={[s.blinkitBtn, regLoading && s.btnDisabled]} onPress={handleRegister} disabled={regLoading}>
            {regLoading
              ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color="#1A3C2E" size="small" /><Text style={s.blinkitBtnText}>Creating...</Text></View>
              : <Text style={s.blinkitBtnText}>Create Account →</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('login')} style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: '#666' }}>Already have an account? <Text style={{ color: '#1A3C2E', fontWeight: 'bold' }}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (screen === 'login') return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <ScrollView>
        <View style={s.authHeader}>
          <TouchableOpacity onPress={() => setScreen('welcome')} style={s.authBack}><Text style={s.authBackText}>←</Text></TouchableOpacity>
          <Text style={s.authTitle}>Login</Text>
        </View>
        <View style={s.authForm}>
          <View style={s.otpIllustration}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>🔐</Text>
            <Text style={s.otpTitle}>Welcome Back!</Text>
            <Text style={s.otpSubtitle}>Login with email and password</Text>
          </View>
          <View style={s.fieldBox}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput style={s.fieldInput} placeholder="your@email.com" value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" placeholderTextColor="#999" autoCapitalize="none" />
          </View>
          <View style={s.fieldBox}>
            <Text style={s.fieldLabel}>Password</Text>
            <View style={{ position: 'relative' }}>
              <TextInput style={s.fieldInput} placeholder="Your password" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry={!showLoginPwd} placeholderTextColor="#999" autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowLoginPwd(!showLoginPwd)} style={{ position: 'absolute', right: 14, top: 16 }}>
                <Text style={{ fontSize: 18 }}>{showLoginPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={[s.blinkitBtn, loginLoading && s.btnDisabled]} onPress={handleLogin} disabled={loginLoading}>
            {loginLoading
              ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color="#1A3C2E" size="small" /><Text style={s.blinkitBtnText}>Logging in...</Text></View>
              : <Text style={s.blinkitBtnText}>Login →</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('register')} style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: '#666' }}>Don't have an account? <Text style={{ color: '#1A3C2E', fontWeight: 'bold' }}>Register</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (screen === 'profile') {
    const menuItems = [
      { icon: '📦', title: 'My Orders', sub: 'View order history', action: () => setScreen('myorders') },
      { icon: '📍', title: 'My Address', sub: user?.address || '', action: () => Alert.alert('Address', user?.address || '') },
      { icon: '📧', title: 'Email', sub: user?.email || '', action: () => {} },
      { icon: '📱', title: 'Phone', sub: '+91 ' + (user?.phone || ''), action: () => {} },
      { icon: '💳', title: 'Payment Methods', sub: 'Cash on Delivery', action: () => Alert.alert('Payments', 'Coming soon!') },
      { icon: '❓', title: 'Help & Support', sub: 'support@ankitstore.com', action: () => Alert.alert('Support', 'support@ankitstore.com') },
    ];
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <View style={s.profileHeader}>
          <TouchableOpacity onPress={() => setScreen('home')} style={s.authBack}><Text style={{ fontSize: 24, color: 'white' }}>←</Text></TouchableOpacity>
          <Text style={[s.authTitle, { color: 'white' }]}>My Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.profileCard}>
          <View style={s.profileAvatar}><Text style={{ fontSize: 40 }}>👤</Text></View>
          <Text style={s.profileName}>{user?.name}</Text>
          <Text style={s.profilePhone}>{user?.email}</Text>
        </View>
        <ScrollView style={{ flex: 1 }}>
          <View style={s.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity key={i} style={[s.menuRow, i < menuItems.length - 1 && s.menuRowBorder]} onPress={item.action}>
                <View style={s.menuIcon}><Text style={{ fontSize: 22 }}>{item.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuTitle}>{item.title}</Text>
                  <Text style={s.menuSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                <Text style={{ fontSize: 20, color: '#CCC' }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutText}>🚪  Logout</Text>
          </TouchableOpacity>
          <View style={{ height: 80 }} />
        </ScrollView>
        <Nav />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <View style={s.homeHeader}>
        <View style={s.homeHeaderTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.deliveryLabel}>⚡ Delivery in 10 minutes</Text>
            <Text style={s.locationText}>📍 {user?.address?.split(',')[0] || 'Your Location'}</Text>
          </View>
          <TouchableOpacity style={s.profileBtn} onPress={() => setScreen('profile')}><Text style={{ fontSize: 22 }}>👤</Text></TouchableOpacity>
          <TouchableOpacity style={s.cartHeaderBtn} onPress={() => setScreen('cart')}>
            <Text style={{ fontSize: 22 }}>🛒</Text>
            {cartCount > 0 && <View style={s.cartHeaderBadge}><Text style={s.cartHeaderBadgeText}>{cartCount}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.searchBox}>
        <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
        <TextInput style={s.searchInput} placeholder="Search brands, products..." value={search} onChangeText={setSearch} placeholderTextColor="#999" />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ fontSize: 18, color: '#999' }}>✕</Text></TouchableOpacity>}
      </View>
      {!search && (
        <View style={s.promoBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.promoTitle}>🎉 Welcome Offer!</Text>
            <Text style={s.promoSubtitle}>Get fresh groceries delivered fast</Text>
            <Text style={s.promoCode}>Free delivery on first order!</Text>
          </View>
          <Text style={{ fontSize: 48 }}>🛍️</Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat.id} style={[s.catChip, selCat === cat.id && s.catChipActive]} onPress={() => setSelCat(cat.id)}>
            <Text style={s.catEmoji}>{cat.emoji}</Text>
            <Text style={[s.catLabel, selCat === cat.id && s.catLabelActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList
        data={filtered} keyExtractor={item => item.id.toString()} numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: cartCount > 0 ? 100 : 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ProductCard item={item} qty={cart.find(i => i.id === item.id)?.quantity || 0} onAdd={() => addToCart(item)} onUpdateQty={(c) => updateQty(item.id, c)} />}
        ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Text style={{ fontSize: 48 }}>🔍</Text><Text style={{ fontSize: 18, color: '#666', marginTop: 12 }}>No products found</Text></View>}
      />
      {cartCount > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => setScreen('cart')}>
          <View style={s.cartBarLeft}>
            <View style={s.cartBarBadge}><Text style={s.cartBarBadgeText}>{cartCount}</Text></View>
            <Text style={s.cartBarLabel}>items in basket</Text>
          </View>
          <Text style={s.cartBarTotal}>₹{cartTotal}  →</Text>
        </TouchableOpacity>
      )}
      <Nav />
    </View>
  );
}

const s = StyleSheet.create({
  welcomeContainer: { flex: 1, backgroundColor: '#1A3C2E' },
  welcomeTop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  welcomeLogoBox: { width: 100, height: 100, borderRadius: 24, backgroundColor: '#F8CB46', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  welcomeTitle: { fontSize: 42, fontWeight: '900', color: '#F8CB46', letterSpacing: 1, marginBottom: 8 },
  welcomeTagline: { fontSize: 16, color: '#A8D5B5', marginBottom: 32, textAlign: 'center' },
  welcomeTags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  tag: { backgroundColor: 'rgba(248,203,70,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(248,203,70,0.3)' },
  tagText: { color: '#F8CB46', fontSize: 13, fontWeight: '600' },
  welcomeBottom: { padding: 24, gap: 12 },
  blinkitBtn: { backgroundColor: '#F8CB46', height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  blinkitBtnText: { color: '#1A3C2E', fontSize: 18, fontWeight: '800' },
  blinkitOutlineBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F8CB46' },
  blinkitOutlineBtnText: { color: '#F8CB46', fontSize: 18, fontWeight: '700' },
  btnDisabled: { backgroundColor: '#CCC' },
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
  otpTitle: { fontSize: 22, fontWeight: '800', color: '#1A3C2E', marginBottom: 6 },
  otpSubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  profileHeader: { backgroundColor: '#1A3C2E', paddingTop: 54, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileCard: { backgroundColor: 'white', margin: 16, borderRadius: 20, padding: 24, alignItems: 'center', elevation: 3 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F9F4', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#1A3C2E', marginBottom: 4 },
  profilePhone: { fontSize: 15, color: '#666' },
  menuCard: { backgroundColor: 'white', marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', elevation: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F9F4', justifyContent: 'center', alignItems: 'center' },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#999' },
  logoutBtn: { margin: 16, backgroundColor: '#FFF0F0', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD0D0' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#D32F2F' },
  homeHeader: { backgroundColor: '#1A3C2E', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  homeHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deliveryLabel: { fontSize: 13, color: '#F8CB46', fontWeight: '700', marginBottom: 2 },
  locationText: { fontSize: 14, color: 'white', fontWeight: '600' },
  profileBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  cartHeaderBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F8CB46', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cartHeaderBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3E3E', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: 'white' },
  cartHeaderBadgeText: { color: 'white', fontSize: 11, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 12, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#EBEBEB', height: 50 },
  searchInput: { flex: 1, fontSize: 15, color: '#222' },
  promoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A3C2E', marginHorizontal: 12, borderRadius: 16, padding: 16, marginBottom: 4 },
  promoTitle: { fontSize: 16, fontWeight: '800', color: '#F8CB46', marginBottom: 4 },
  promoSubtitle: { fontSize: 13, color: '#A8D5B5', marginBottom: 4 },
  promoCode: { fontSize: 12, color: '#F8CB46', fontWeight: '700' },
  catScroll: { maxHeight: 72, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  catChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8, backgroundColor: '#F5F5F5', minWidth: 64 },
  catChipActive: { backgroundColor: '#1A3C2E' },
  catEmoji: { fontSize: 20, marginBottom: 2 },
  catLabel: { fontSize: 11, fontWeight: '700', color: '#666' },
  catLabelActive: { color: '#F8CB46' },
  productCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, margin: 6, overflow: 'hidden', elevation: 2 },
  productImageBox: { height: 150, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', position: 'relative', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  productImage: { width: '85%', height: '85%' },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
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
  cartBar: { position: 'absolute', bottom: 85, left: 0, right: 0, backgroundColor: '#1A3C2E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 24 },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBarBadge: { backgroundColor: '#F8CB46', borderRadius: 8, minWidth: 28, height: 28, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  cartBarBadgeText: { color: '#1A3C2E', fontSize: 14, fontWeight: '800' },
  cartBarLabel: { color: 'white', fontSize: 14, fontWeight: '600' },
  cartBarTotal: { color: '#F8CB46', fontSize: 18, fontWeight: '800' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 10, paddingBottom: 35, borderTopWidth: 1, borderTopColor: '#F0F0F0', elevation: 10 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navIcon: { fontSize: 22, marginBottom: 2 },
  navLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  navLabelActive: { color: '#1A3C2E', fontWeight: '800' },
});