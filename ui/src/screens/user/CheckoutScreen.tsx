import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { orderService } from '../../services';
import { CreateOrderRequest, MenuItem, RestaurantProfile } from '../../../shared/api-contracts';

export const CheckoutScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { restaurantId, restaurant, cart, menuItems } = route.params as {
    restaurantId: string;
    restaurant: RestaurantProfile;
    cart: Record<string, number>;
    menuItems: MenuItem[];
  };

  const [loading, setLoading] = useState(false);

  // Calculate cart items with details
  const cartItems = menuItems
    .filter(item => cart[item.id] > 0)
    .map(item => ({
      ...item,
      quantity: cart[item.id],
    }));

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const orderRequest: CreateOrderRequest = {
        restaurant_id: restaurantId,
        // No payment_id for cash on pickup
        total_amount: totalAmount,
        items: cartItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
        })),
        // Route polyline optional for now
      };

      const order = await orderService.createOrder(orderRequest);
      
      // Navigate directly to order tracking screen
      // Reset navigation stack: UserHome -> OrderTracking
      (navigation as any).reset({
        index: 1,
        routes: [
          { name: 'UserHome' },
          { name: 'OrderTracking', params: { orderId: order.id } },
        ],
      });
      
      // Show success message after navigation
      setTimeout(() => {
        Alert.alert(
          'Order Placed!',
          `Your order #${order.id.substring(0, 8)} has been placed. Pay ₹${totalAmount.toFixed(2)} on pickup.`
        );
      }, 500);
    } catch (error: any) {
      console.error('Failed to place order:', error);
      Alert.alert('Error', error?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{restaurant?.name}</Text>
        <Text style={styles.restaurantAddress}>{restaurant?.address}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {cartItems.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.orderItemInfo}>
              <Text style={styles.orderItemName}>{item.name}</Text>
              <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
            </View>
            <Text style={styles.orderItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
        </View>
        <Text style={styles.paymentNote}>💵 Pay cash on pickup</Text>
      </View>

      <TouchableOpacity
        style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
        onPress={handlePlaceOrder}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.placeOrderButtonText}>Place Order</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  restaurantInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  placeOrderButton: {
    backgroundColor: '#34C759',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

