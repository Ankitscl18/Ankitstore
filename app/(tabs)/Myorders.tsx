import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../config/firebase';

// UPDATED OrderItem - matches new product structure with imageUrl
interface OrderItem {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  quantity: number;
  weight: string;
  imageUrl: string;
  itemTotal: number;
}

interface Order {
  id: string;
  userPhone: string;
  userName: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  orderStatus: string;
  paymentStatus: string;
  orderDate: string;
  createdAt?: any;
}

interface MyOrdersScreenProps {
  userPhone: string;
  goBack: () => void;
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

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'Pending':       return { color: '#FF8C00', bg: '#FFF3E0', emoji: '⏳' };
    case 'Confirmed':     return { color: '#1976D2', bg: '#E3F2FD', emoji: '✅' };
    case 'Out for Delivery': return { color: '#7B1FA2', bg: '#F3E5F5', emoji: '🚚' };
    case 'Delivered':     return { color: '#279F5E', bg: '#E8F5E9', emoji: '🎉' };
    case 'Cancelled':     return { color: '#D32F2F', bg: '#FFEBEE', emoji: '❌' };
    default:              return { color: '#757575', bg: '#F5F5F5', emoji: '📦' };
  }
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return dateString; }
};

// Product image component with fallback
function ProductImage({ item }: { item: OrderItem }) {
  const [imgError, setImgError] = useState(false);
  return (
    <View style={styles.itemImgBox}>
      {item.imageUrl && !imgError ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.itemImg}
          resizeMode="contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={{ fontSize: 28 }}>{getCategoryEmoji(item.category)}</Text>
      )}
    </View>
  );
}


// Bottom Navigation Component
const BottomNav = ({ currentScreen, goBack }: { currentScreen: string; goBack: () => void }) => (
  <View style={navStyles.bottomNav}>
    <TouchableOpacity style={navStyles.navItem} onPress={goBack}>
      <Text style={navStyles.navIcon}>🏠</Text>
      <Text style={navStyles.navLabel}>Home</Text>
    </TouchableOpacity>
    <TouchableOpacity style={navStyles.navItem}>
      <Text style={navStyles.navIcon}>▶️</Text>
      <Text style={navStyles.navLabel}>Explore</Text>
    </TouchableOpacity>
    <TouchableOpacity style={navStyles.navItem} onPress={goBack}>
      <Text style={navStyles.navIcon}>🛒</Text>
      <Text style={navStyles.navLabel}>Cart</Text>
    </TouchableOpacity>
    <TouchableOpacity style={navStyles.navItem}>
      <Text style={navStyles.navIcon}>📋</Text>
      <Text style={[navStyles.navLabel, navStyles.navLabelActive]}>Orders</Text>
    </TouchableOpacity>
    <TouchableOpacity style={navStyles.navItem} onPress={goBack}>
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
    paddingTop: 10, paddingBottom: 35,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 10,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navIcon: { fontSize: 22, marginBottom: 2 },
  navLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  navLabelActive: { color: '#1A3C2E', fontWeight: '800' },
});

export default function MyOrdersScreen({ userPhone, goBack }: MyOrdersScreenProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'orders'), where('userPhone', '==', userPhone));
      const snapshot = await getDocs(q);
      const fetched: Order[] = [];
      snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() as Omit<Order, 'id'> }));
      fetched.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setOrders(fetched);
    } catch (error) {
      Alert.alert('Error', 'Could not load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const renderOrder = ({ item }: { item: Order }) => {
    const statusConfig = getStatusConfig(item.orderStatus);
    return (
      <View style={styles.orderCard}>

        {/* Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{item.id.substring(0, 8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>🕐 {formatDate(item.orderDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.emoji} {item.orderStatus}
            </Text>
          </View>
        </View>

        {/* Items with REAL IMAGES */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionLabel}>📦  ITEMS ORDERED</Text>
          {item.items && item.items.map((product, index) => (
            <View key={index} style={[
              styles.orderItem,
              index < item.items.length - 1 && styles.orderItemBorder
            ]}>
              <ProductImage item={product} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{product.name}</Text>
                {product.brand && (
                  <Text style={styles.itemBrand}>{product.brand}
                    {product.weight ? ` · ${product.weight}` : ''}
                  </Text>
                )}
                <View style={styles.itemBottom}>
                  <View style={styles.qtyTag}>
                    <Text style={styles.qtyTagText}>x{product.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>₹{product.price * product.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📍  DELIVERY ADDRESS</Text>
          <Text style={styles.addressText}>{item.deliveryAddress}</Text>
        </View>

        {/* Bill Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>💰  BILL DETAILS</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Items Total</Text>
            <Text style={styles.billValue}>₹{item.subtotal}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={[styles.billValue, item.deliveryFee === 0 && styles.freeText]}>
              {item.deliveryFee === 0 ? 'FREE 🎉' : `₹${item.deliveryFee}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{item.total}</Text>
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.paymentBar}>
          <View style={styles.paymentLeft}>
            <Text style={styles.paymentMethod}>💳  {item.paymentMethod}</Text>
          </View>
          <View style={[
            styles.paymentStatusBadge,
            { backgroundColor: item.paymentStatus === 'Paid' ? '#E8F5E9' : '#FFF3E0' }
          ]}>
            <Text style={[
              styles.paymentStatusText,
              { color: item.paymentStatus === 'Paid' ? '#279F5E' : '#FF8C00' }
            ]}>
              {item.paymentStatus === 'Paid' ? '✅ Paid' : '⏳ ' + item.paymentStatus}
            </Text>
          </View>
        </View>

      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>My Orders</Text>
          {orders.length > 0 && (
            <Text style={styles.headerSub}>{orders.length} order{orders.length > 1 ? 's' : ''} placed</Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchOrders}>
          <Text style={{ fontSize: 20 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#F8CB46" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 80, marginBottom: 20 }}>📦</Text>
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptySub}>Your order history will appear here</Text>
              <TouchableOpacity style={styles.shopBtn} onPress={goBack}>
                <Text style={styles.shopBtnText}>Start Shopping →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Bottom Navigation - Always Visible */}
      <BottomNav currentScreen="myorders" goBack={goBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    backgroundColor: '#1A3C2E', paddingTop: 54, paddingBottom: 20,
    paddingHorizontal: 20, flexDirection: 'row',
    alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 22, color: 'white' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  headerSub: { fontSize: 12, color: '#A8D5B5', marginTop: 2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Loading
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: '#666' },

  list: { padding: 16, paddingBottom: 100 },

  // Order Card
  orderCard: {
    backgroundColor: 'white', borderRadius: 20,
    marginBottom: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  orderId: { fontSize: 16, fontWeight: '900', color: '#1A3C2E', marginBottom: 4 },
  orderDate: { fontSize: 12, color: '#999' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '800' },

  // Section
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#999',
    letterSpacing: 1.5, marginBottom: 14,
  },
  itemsSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },

  // Order Item with Image
  orderItem: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  orderItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  itemImgBox: {
    width: 68, height: 68, borderRadius: 12,
    backgroundColor: '#FAFAFA', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  itemImg: { width: '100%', height: '100%' },
  itemDetails: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 3 },
  itemBrand: { fontSize: 12, color: '#279F5E', fontWeight: '600', marginBottom: 8 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyTag: {
    backgroundColor: '#1A3C2E', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 8,
  },
  qtyTagText: { fontSize: 13, fontWeight: '800', color: '#F8CB46' },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },

  // Address
  addressText: { fontSize: 14, color: '#444', lineHeight: 20 },

  // Bill
  billRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  billLabel: { fontSize: 14, color: '#666' },
  billValue: { fontSize: 14, fontWeight: '600', color: '#222' },
  freeText: { color: '#279F5E', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#1A3C2E' },

  // Payment Bar
  paymentBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
    backgroundColor: '#FAFAFA',
  },
  paymentLeft: { flex: 1 },
  paymentMethod: { fontSize: 14, fontWeight: '600', color: '#444' },
  paymentStatusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  paymentStatusText: { fontSize: 13, fontWeight: '700' },

  // Empty
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#1A3C2E', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#999', marginBottom: 32 },
  shopBtn: {
    backgroundColor: '#F8CB46', paddingHorizontal: 32,
    paddingVertical: 14, borderRadius: 14,
  },
  shopBtnText: { color: '#1A3C2E', fontSize: 16, fontWeight: '800' },
});