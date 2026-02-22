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

interface CartItem {
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
  quantity: number;
}

interface CartScreenProps {
  cart: CartItem[];
  updateQuantity: (id: number, change: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  goBack: () => void;
  goToCheckout: () => void;
}

export default function CartScreen({ 
  cart, 
  updateQuantity, 
  removeFromCart, 
  clearCart, 
  goBack,
  goToCheckout 
}: CartScreenProps) {
  const [deliveryCharge] = useState(20);
  const [promoApplied, setPromoApplied] = useState(false);
  const [imageErrors, setImageErrors] = useState<{[key: number]: boolean}>({});

  const handleRemoveItem = (id: number, name: string) => {
    Alert.alert(
      'Remove Item',
      `Remove ${name} from your basket?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(id) }
      ]
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = promoApplied ? 50 : 0;
  const finalDeliveryCharge = subtotal >= 500 ? 0 : deliveryCharge;
  const total = subtotal - discount + finalDeliveryCharge;

  const applyPromo = () => {
    if (!promoApplied) {
      setPromoApplied(true);
      Alert.alert('Success!', 'Promo code applied! You saved ₹50');
    }
  };

  const placeOrder = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Basket', 'Please add items to your basket first!');
      return;
    }
    goToCheckout();
  };

  if (cart.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Basket</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your basket is empty</Text>
          <Text style={styles.emptySubtitle}>Add some fresh products to get started!</Text>
          <TouchableOpacity style={styles.shopButton} onPress={goBack}>
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={goBack}>
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>▶️</Text>
            <Text style={styles.navLabel}>Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>🛒</Text>
            <Text style={[styles.navLabel, styles.navLabelActive]}>Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navLabel}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Basket</Text>
        <View style={styles.itemCount}>
          <Text style={styles.itemCountText}>{cart.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryEmoji}>⚡</Text>
          <View style={styles.deliveryTextContainer}>
            <Text style={styles.deliveryTitle}>Delivery in 10 minutes</Text>
            <Text style={styles.deliverySubtitle}>Ultra-fast delivery to your door</Text>
          </View>
        </View>

        <View style={styles.itemsContainer}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>{cart.length} {cart.length === 1 ? 'Item' : 'Items'}</Text>
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {cart.map((item, index) => (
            <View key={item.id} style={[styles.cartItem, index < cart.length - 1 && styles.cartItemBorder]}>
              <View style={styles.itemImageContainer}>
                {!imageErrors[item.id] ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.itemImage}
                    resizeMode="contain"
                    onError={() => setImageErrors(prev => ({...prev, [item.id]: true}))}
                  />
                ) : (
                  <Text style={styles.itemImagePlaceholder}>
                    {item.category === 'Rice & Grains' ? '🌾' :
                     item.category === 'Dal & Pulses' ? '🫘' :
                     item.category === 'Dairy' ? '🥛' :
                     item.category === 'Vegetables' ? '🥬' :
                     item.category === 'Atta & Flour' ? '🌿' :
                     item.category === 'Oils' ? '🫙' :
                     item.category === 'Spices' ? '🌶️' :
                     item.category === 'Bakery' ? '🍞' : '📦'}
                  </Text>
                )}
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemWeight}>{item.weight}</Text>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemBrand}>{item.brand}</Text>
                
                <View style={styles.itemBottom}>
                  <View>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                    {item.originalPrice && (
                      <Text style={styles.itemOriginalPrice}>₹{item.originalPrice}</Text>
                    )}
                  </View>

                  <View style={styles.quantityControl}>
                    <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.id, -1)}>
                      <Text style={styles.quantityButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.id, 1)}>
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.itemTotalRow}>
                  <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(item.id, item.name)}>
                    <Text style={styles.removeButton}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.promoContainer}>
          <Text style={styles.promoEmoji}>🎁</Text>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Have a promo code?</Text>
            {!promoApplied ? (
              <TouchableOpacity style={styles.promoButton} onPress={applyPromo}>
                <Text style={styles.promoButtonText}>Apply FRESH50</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.promoApplied}>
                <Text style={styles.promoAppliedText}>✓ FRESH50 Applied - ₹50 saved!</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.billContainer}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Items Total</Text>
            <Text style={styles.billValue}>₹{subtotal}</Text>
          </View>

          {promoApplied && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, styles.discountLabel]}>Promo Discount</Text>
              <Text style={[styles.billValue, styles.discountValue]}>− ₹{discount}</Text>
            </View>
          )}

          <View style={styles.billRow}>
            <View>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              {subtotal >= 500 && (
                <Text style={styles.freeDeliveryText}>🎉 Free on orders ₹500+</Text>
              )}
            </View>
            <Text style={[styles.billValue, finalDeliveryCharge === 0 && styles.freeText]}>
              {finalDeliveryCharge === 0 ? 'FREE' : `₹${finalDeliveryCharge}`}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.billRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{total}</Text>
          </View>

          <View style={styles.savingsBox}>
            <Text style={styles.savingsText}>
              💰 You're saving ₹{discount + (subtotal >= 500 ? deliveryCharge : 0)} on this order
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* PLACE ORDER - Sits DIRECTLY on top of nav, NO gap */}
      <View style={styles.placeOrderBar}>
        <View>
          <Text style={styles.payLabel}>To Pay</Text>
          <Text style={styles.payAmount}>₹{total}</Text>
        </View>
        <TouchableOpacity style={styles.placeOrderBtn} onPress={placeOrder}>
          <Text style={styles.placeOrderText}>Place Order →</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM NAV - Exactly like paint.jpeg */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={goBack}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>▶️</Text>
          <Text style={styles.navLabel}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🛒</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#1A3C2E',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 24, color: 'white' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  placeholder: { width: 40 },
  itemCount: {
    backgroundColor: '#F8CB46',
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  itemCountText: { color: '#1A3C2E', fontSize: 14, fontWeight: '800' },
  content: { flex: 1 },
  deliveryInfo: {
    backgroundColor: 'white',
    margin: 12,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  deliveryEmoji: { fontSize: 28, marginRight: 10 },
  deliveryTextContainer: { flex: 1 },
  deliveryTitle: { fontSize: 15, fontWeight: '700', color: '#1A3C2E', marginBottom: 2 },
  deliverySubtitle: { fontSize: 12, color: '#666' },
  itemsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },
  clearText: { fontSize: 13, color: '#FF3E3E', fontWeight: '600' },
  cartItem: { flexDirection: 'row', paddingVertical: 12 },
  cartItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImage: { width: '100%', height: '100%' },
  itemImagePlaceholder: { fontSize: 40 },
  itemInfo: { flex: 1 },
  itemWeight: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 2 },
  itemBrand: { fontSize: 11, color: '#279F5E', fontWeight: '600', marginBottom: 8 },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },
  itemOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A3C2E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: { width: 30, height: 32, justifyContent: 'center', alignItems: 'center' },
  quantityButtonText: { fontSize: 18, fontWeight: '700', color: '#F8CB46' },
  quantityText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
    minWidth: 24,
    textAlign: 'center',
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTotal: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },
  removeButton: { fontSize: 13, color: '#FF3E3E', fontWeight: '600' },
  promoContainer: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  promoEmoji: { fontSize: 26, marginRight: 10 },
  promoContent: { flex: 1 },
  promoTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  promoButton: {
    backgroundColor: '#F8CB46',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promoButtonText: { fontSize: 13, fontWeight: '700', color: '#1A3C2E' },
  promoApplied: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promoAppliedText: { fontSize: 13, fontWeight: '700', color: '#279F5E' },
  billContainer: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  billLabel: { fontSize: 14, color: '#666' },
  billValue: { fontSize: 14, fontWeight: '600', color: '#222' },
  discountLabel: { color: '#279F5E' },
  discountValue: { color: '#279F5E' },
  freeDeliveryText: { fontSize: 11, color: '#279F5E', marginTop: 2 },
  freeText: { color: '#279F5E', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1A3C2E' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#1A3C2E' },
  savingsBox: {
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  savingsText: { fontSize: 12, color: '#7A5C00', fontWeight: '600', textAlign: 'center' },

  // PLACE ORDER BAR - DIRECTLY touches bottom nav
  placeOrderBar: {
    position: 'absolute',
    bottom: 48,  // Sits ON TOP of nav (nav is 48px tall)
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#000',  // BLACK line like paint.jpeg
  },
  payLabel: { fontSize: 11, color: '#999' },
  payAmount: { fontSize: 18, fontWeight: '800', color: '#1A3C2E' },
  placeOrderBtn: {
    backgroundColor: '#F8CB46',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  placeOrderText: { fontSize: 14, fontWeight: '800', color: '#1A3C2E' },

  // BOTTOM NAV - EXACT like paint.jpeg
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,  // Compact
    backgroundColor: 'white',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',  // BLACK line like paint.jpeg
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: { fontSize: 18, marginBottom: 1 },
  navLabel: { fontSize: 9, color: '#999', fontWeight: '600' },
  navLabelActive: { color: '#1A3C2E', fontWeight: '800' },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingBottom: 80,
  },
  emptyEmoji: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1A3C2E', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  shopButton: {
    backgroundColor: '#F8CB46',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopButtonText: { color: '#1A3C2E', fontSize: 16, fontWeight: '800' },
});