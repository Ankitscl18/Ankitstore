import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CartItem } from './index';

// FIREBASE IMPORTS
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface CheckoutScreenProps {
  cart: CartItem[];
  cartTotal: number;
  goBack: () => void;
  clearCart: () => void;
  goToHome: () => void;
  userPhone: string;
  userName: string;
  userAddress: string;
}

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

// Bottom Navigation Component
const BottomNav = ({ goToHome }: { goToHome: () => void }) => (
  <View style={navStyles.bottomNav}>
    <TouchableOpacity style={navStyles.navItem} onPress={goToHome}>
      <Text style={navStyles.navIcon}>🏠</Text>
      <Text style={navStyles.navLabel}>Home</Text>
    </TouchableOpacity>
    <TouchableOpacity style={navStyles.navItem}>
      <Text style={navStyles.navIcon}>▶️</Text>
      <Text style={navStyles.navLabel}>Explore</Text>
    </TouchableOpacity>
    <TouchableOpacity style={navStyles.navItem}>
      <Text style={navStyles.navIcon}>🛒</Text>
      <Text style={navStyles.navLabel}>Cart</Text>
    </TouchableOpacity>
    <TouchableOpacity style={navStyles.navItem}>
      <Text style={navStyles.navIcon}>📋</Text>
      <Text style={navStyles.navLabel}>Orders</Text>
    </TouchableOpacity>
    <TouchableOpacity style={navStyles.navItem}>
      <Text style={navStyles.navIcon}>👤</Text>
      <Text style={navStyles.navLabel}>Profile</Text>
    </TouchableOpacity>
  </View>
);

const navStyles = StyleSheet.create({
  bottomNav: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: 'white', flexDirection: 'row', 
    justifyContent: 'space-around', alignItems: 'center', 
    paddingTop: 8, paddingBottom: 28,  // Reduced padding
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 10,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  navIcon: { fontSize: 20, marginBottom: 1 },
  navLabel: { fontSize: 10, color: '#999', fontWeight: '600' },
  navLabelActive: { color: '#1A3C2E', fontWeight: '800' },
});

// SAVE ORDER TO FIREBASE
const saveOrderToFirebase = async (orderData: any) => {
  try {
    console.log('Saving order to Firebase...');
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      createdAt: serverTimestamp(),
    });
    console.log('Order saved! ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving order:', error);
    throw error;
  }
};

export default function CheckoutScreen({
  cart, cartTotal, goBack, clearCart,
  goToHome, userPhone, userName, userAddress,
}: CheckoutScreenProps) {
  const [selectedPayment, setSelectedPayment] = useState<'cod' | null>('cod');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [imageErrors, setImageErrors] = useState<{[key: number]: boolean}>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');

  const deliveryFee = cartTotal >= 500 ? 0 : 40;
  const finalTotal = cartTotal + deliveryFee;
  const savings = cart.reduce((sum, item) =>
    sum + (item.originalPrice ? (item.originalPrice - item.price) * item.quantity : 0), 0);

  const handlePlaceOrder = async () => {
    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderData = {
        userPhone: userPhone || '',
        userName: userName || '',
        deliveryAddress: userAddress || '',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          brand: item.brand || '',
          category: item.category || '',
          price: item.price,
          quantity: item.quantity,
          weight: item.weight || '',
          imageUrl: item.imageUrl || '',
          itemTotal: item.price * item.quantity,
        })),
        subtotal: cartTotal,
        deliveryFee: deliveryFee,
        total: finalTotal,
        paymentMethod: 'Cash on Delivery',
        orderStatus: 'Pending',
        paymentStatus: 'Unpaid',
        orderDate: new Date().toISOString(),
      };

      const orderId = await saveOrderToFirebase(orderData);

      clearCart();
      setPlacedOrderId(orderId.substring(0, 8).toUpperCase());
      setOrderSuccess(true);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Order Failed', 'Could not place your order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // ===== ORDER SUCCESS SCREEN WITH BOTTOM NAV =====
  if (orderSuccess) {
    return (
      <View style={styles.successContainer}>
        <ScrollView contentContainerStyle={styles.successScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successContent}>
            {/* Animated checkmark area */}
            <View style={styles.successCircleOuter}>
              <View style={styles.successCircleInner}>
                <Text style={styles.successCheck}>✓</Text>
              </View>
            </View>

            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successSubtitle}>Your order is confirmed and will arrive in 10 minutes!</Text>

            {/* Order ID Card */}
            <View style={styles.successOrderCard}>
              <Text style={styles.successOrderLabel}>ORDER ID</Text>
              <Text style={styles.successOrderId}>#{placedOrderId}</Text>
              <View style={styles.successDivider} />
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>Total Paid</Text>
                <Text style={styles.successRowValue}>₹{finalTotal}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>Payment</Text>
                <Text style={styles.successRowValue}>Cash on Delivery</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>Delivery to</Text>
                <Text style={styles.successRowValue} numberOfLines={1}>{userAddress.split(',')[0]}</Text>
              </View>
            </View>

            {/* Status Timeline */}
            <View style={styles.timelineContainer}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]}><Text style={{fontSize:12}}>✓</Text></View>
                <Text style={[styles.timelineText, styles.timelineTextActive]}>Order Placed</Text>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot}><Text style={{fontSize:12, color:'#CCC'}}>○</Text></View>
                <Text style={styles.timelineText}>Confirmed</Text>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot}><Text style={{fontSize:12, color:'#CCC'}}>○</Text></View>
                <Text style={styles.timelineText}>On the way</Text>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot}><Text style={{fontSize:12, color:'#CCC'}}>○</Text></View>
                <Text style={styles.timelineText}>Delivered</Text>
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity style={styles.successPrimaryBtn} onPress={goToHome}>
              <Text style={styles.successPrimaryBtnText}>Track My Order →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.successSecondaryBtn} onPress={goToHome}>
              <Text style={styles.successSecondaryBtnText}>Continue Shopping</Text>
            </TouchableOpacity>

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>

        {/* Bottom Navigation - ADDED TO SUCCESS SCREEN */}
        <BottomNav goToHome={goToHome} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSub}>{cart.length} items · ₹{finalTotal}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>⚡ 10 min</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📍</Text>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <View style={styles.addressCard}>
            <View style={styles.addressTop}>
              <View style={styles.addressIconBox}>
                <Text style={{ fontSize: 24 }}>🏠</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressName}>{userName}</Text>
                <Text style={styles.addressText}>{userAddress}</Text>
                <Text style={styles.addressPhone}>+91 {userPhone}</Text>
              </View>
            </View>
            <View style={styles.deliveryTimeBadge}>
              <Text style={styles.deliveryTimeText}>⚡ Estimated delivery: 10-15 minutes</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🛒</Text>
            <Text style={styles.sectionTitle}>Order Summary ({cart.length} items)</Text>
          </View>
          <View style={styles.orderCard}>
            {cart.map((item, index) => (
              <View key={item.id} style={[
                styles.orderItem,
                index < cart.length - 1 && styles.orderItemBorder
              ]}>
                <View style={styles.itemImageBox}>
                  {!imageErrors[item.id] ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.itemImage}
                      resizeMode="contain"
                      onError={() => setImageErrors(prev => ({...prev, [item.id]: true}))}
                    />
                  ) : (
                    <Text style={{ fontSize: 32 }}>{getCategoryEmoji(item.category)}</Text>
                  )}
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemBrand}>{item.brand} · {item.weight}</Text>
                  <View style={styles.itemPriceRow}>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>x{item.quantity}</Text>
                    </View>
                    <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bill Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🧾</Text>
            <Text style={styles.sectionTitle}>Bill Summary</Text>
          </View>
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Items Total</Text>
              <Text style={styles.billValue}>₹{cartTotal}</Text>
            </View>
            {savings > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#279F5E' }]}>Product Savings</Text>
                <Text style={[styles.billValue, { color: '#279F5E' }]}>− ₹{savings}</Text>
              </View>
            )}
            <View style={styles.billRow}>
              <View>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                {cartTotal >= 500 && (
                  <Text style={{ fontSize: 11, color: '#279F5E' }}>Free above ₹500!</Text>
                )}
              </View>
              <Text style={[styles.billValue, deliveryFee === 0 && { color: '#279F5E', fontWeight: '700' }]}>
                {deliveryFee === 0 ? 'FREE 🎉' : `₹${deliveryFee}`}
              </Text>
            </View>
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.billTotal}>Total Amount</Text>
              <Text style={styles.billTotalValue}>₹{finalTotal}</Text>
            </View>
            {(savings > 0 || deliveryFee === 0) && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>
                  💰 You saved ₹{savings + (deliveryFee === 0 ? 40 : 0)} on this order!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💳</Text>
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>

          {/* COD Option */}
          <TouchableOpacity
            style={[styles.paymentCard, selectedPayment === 'cod' && styles.paymentCardActive]}
            onPress={() => setSelectedPayment('cod')}>
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, selectedPayment === 'cod' && styles.paymentIconBoxActive]}>
                <Text style={{ fontSize: 26 }}>💵</Text>
              </View>
              <View>
                <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                <Text style={styles.paymentSub}>Pay when your order arrives</Text>
              </View>
            </View>
            <View style={[styles.radio, selectedPayment === 'cod' && styles.radioActive]}>
              {selectedPayment === 'cod' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Online Payment - Coming Soon */}
          <View style={[styles.paymentCard, styles.paymentCardDisabled]}>
            <View style={styles.paymentLeft}>
              <View style={styles.paymentIconBox}>
                <Text style={{ fontSize: 26 }}>📱</Text>
              </View>
              <View>
                <Text style={[styles.paymentTitle, { color: '#BBB' }]}>UPI / Online Payment</Text>
                <Text style={styles.paymentSub}>Coming soon!</Text>
              </View>
            </View>
            <View style={styles.comingSoonTag}>
              <Text style={styles.comingSoonText}>SOON</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Bottom Place Order Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Text style={styles.bottomLabel}>To Pay</Text>
          <Text style={styles.bottomTotal}>₹{finalTotal}</Text>
          {deliveryFee === 0 && (
            <Text style={styles.bottomFreeDelivery}>Free delivery included!</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.placeOrderBtn, isPlacingOrder && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}>
          <Text style={styles.placeOrderText}>
            {isPlacingOrder ? 'Placing...' : 'Place Order →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation - ADDED TO CHECKOUT */}
      <BottomNav goToHome={goToHome} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flex: 1 },

  // Header
  header: {
    backgroundColor: '#1A3C2E',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 22, color: 'white' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  headerSub: { fontSize: 12, color: '#A8D5B5', marginTop: 2 },
  headerBadge: {
    marginLeft: 'auto',
    backgroundColor: '#F8CB46',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '800', color: '#1A3C2E' },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },

  // Address Card
  addressCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  addressTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  addressIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#F0F9F4',
    justifyContent: 'center', alignItems: 'center',
  },
  addressName: { fontSize: 16, fontWeight: '800', color: '#1A3C2E', marginBottom: 4 },
  addressText: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  addressPhone: { fontSize: 13, color: '#279F5E', fontWeight: '600' },
  deliveryTimeBadge: {
    backgroundColor: '#F0F9F4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  deliveryTimeText: { fontSize: 13, color: '#279F5E', fontWeight: '700' },

  // Order Items
  orderCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  orderItem: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  orderItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemImageBox: {
    width: 72, height: 72, borderRadius: 12,
    backgroundColor: '#FAFAFA', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  itemImage: { width: '100%', height: '100%' },
  itemDetails: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 3 },
  itemBrand: { fontSize: 12, color: '#279F5E', fontWeight: '600', marginBottom: 8 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBadge: {
    backgroundColor: '#1A3C2E', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 8,
  },
  qtyBadgeText: { fontSize: 13, fontWeight: '800', color: '#F8CB46' },
  itemTotal: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },

  // Bill
  billCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  billRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 8,
  },
  billLabel: { fontSize: 14, color: '#666' },
  billValue: { fontSize: 14, fontWeight: '600', color: '#222' },
  billDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  billTotal: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },
  billTotalValue: { fontSize: 20, fontWeight: '900', color: '#1A3C2E' },
  savingsBadge: {
    backgroundColor: '#FFF9E6', borderRadius: 10,
    padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: '#FFE082',
  },
  savingsText: { fontSize: 13, color: '#7A5C00', fontWeight: '700', textAlign: 'center' },

  // Payment
  paymentCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  paymentCardActive: { borderColor: '#F8CB46', backgroundColor: '#FFFBEE' },
  paymentCardDisabled: { opacity: 0.6 },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  paymentIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  paymentIconBoxActive: { backgroundColor: '#FFF9E6' },
  paymentTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 3 },
  paymentSub: { fontSize: 12, color: '#999' },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#DDD',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: '#F8CB46' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#F8CB46' },
  comingSoonTag: {
    backgroundColor: '#F0F0F0', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 8,
  },
  comingSoonText: { fontSize: 11, fontWeight: '800', color: '#999' },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 54, left: 0, right: 0, // Above bottom nav
    backgroundColor: 'white', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    padding: 12, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 10,
  },
  bottomLeft: { flex: 1 },
  bottomLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  bottomTotal: { fontSize: 22, fontWeight: '900', color: '#1A3C2E' },
  bottomFreeDelivery: { fontSize: 10, color: '#279F5E', fontWeight: '600', marginTop: 2 },
  placeOrderBtn: {
    backgroundColor: '#F8CB46', paddingHorizontal: 24,
    paddingVertical: 14, borderRadius: 14,
  },
  placeOrderBtnDisabled: { backgroundColor: '#DDD' },
  placeOrderText: { color: '#1A3C2E', fontSize: 15, fontWeight: '900' },

  // Success Screen
  successContainer: { flex: 1, backgroundColor: '#1A3C2E' },
  successScrollContent: { flexGrow: 1, paddingBottom: 100 }, // Space for bottom nav
  successContent: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 80 },
  successCircleOuter: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(248,203,70,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
  },
  successCircleInner: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#F8CB46',
    justifyContent: 'center', alignItems: 'center',
  },
  successCheck: { fontSize: 48, color: '#1A3C2E', fontWeight: '900' },
  successTitle: {
    fontSize: 38, fontWeight: '900', color: '#F8CB46',
    letterSpacing: 1, marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16, color: '#A8D5B5', textAlign: 'center',
    lineHeight: 24, marginBottom: 32,
  },
  successOrderCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20,
    width: '100%', marginBottom: 28,
  },
  successOrderLabel: {
    fontSize: 11, fontWeight: '800', color: '#999',
    letterSpacing: 2, marginBottom: 6,
  },
  successOrderId: { fontSize: 28, fontWeight: '900', color: '#1A3C2E', marginBottom: 16 },
  successDivider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 14 },
  successRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  successRowLabel: { fontSize: 13, color: '#999' },
  successRowValue: { fontSize: 14, fontWeight: '700', color: '#222', maxWidth: '55%', textAlign: 'right' },
  timelineContainer: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', marginBottom: 36,
  },
  timelineItem: { alignItems: 'center', flex: 1 },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  timelineDotActive: { backgroundColor: '#F8CB46' },
  timelineText: { fontSize: 10, color: '#7A9D8A', fontWeight: '600', textAlign: 'center' },
  timelineTextActive: { color: '#F8CB46' },
  timelineLine: { height: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  successPrimaryBtn: {
    backgroundColor: '#F8CB46', width: '100%',
    paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', marginBottom: 14,
  },
  successPrimaryBtnText: { fontSize: 18, fontWeight: '900', color: '#1A3C2E' },
  successSecondaryBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(248,203,70,0.4)',
  },
  successSecondaryBtnText: { fontSize: 16, fontWeight: '700', color: '#F8CB46' },
});