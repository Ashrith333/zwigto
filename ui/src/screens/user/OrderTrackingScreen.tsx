import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { orderService, userService } from '../../services';
import { Order, OrderStatus } from '../../../shared/api-contracts';

export const OrderTrackingScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = route.params as { orderId?: string };
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPin, setUserPin] = useState<string | null>(null);

  useEffect(() => {
    loadUserPin();
    if (orderId) {
      loadOrder();
    } else {
      // If no orderId, show all user orders
      loadMyOrders();
    }
  }, [orderId]);

  const loadUserPin = async () => {
    try {
      const profile = await userService.getProfile();
      setUserPin(profile.default_pin || null);
    } catch (error) {
      console.error('Failed to load user PIN:', error);
    }
  };

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      const orderData = await orderService.getOrder(orderId);
      setOrder(orderData);
    } catch (error: any) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMyOrders = async () => {
    try {
      const orders = await orderService.getMyOrders();
      // Show most recent order or first order
      if (orders && orders.length > 0) {
        setOrder(orders[0]);
      }
    } catch (error: any) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (orderId) {
      loadOrder();
    } else {
      loadMyOrders();
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return '#FF9800';
      case 'CONFIRMED':
        return '#2196F3';
      case 'PREPARING':
        return '#9C27B0';
      case 'READY':
        return '#4CAF50';
      case 'PICKED_UP':
        return '#4CAF50';
      case 'CANCELLED':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Waiting for restaurant to accept';
      case 'CONFIRMED':
        return 'Order confirmed';
      case 'PREPARING':
        return 'Preparing your order';
      case 'READY':
        return 'Ready for pickup';
      case 'PICKED_UP':
        return 'Order picked up';
      case 'CANCELLED':
        return 'Order cancelled';
      default:
        return status;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Calculating...';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No order found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
        <Text style={styles.orderId}>Order #{order.id.substring(0, 8)}</Text>
      </View>

      {order.estimated_ready_time && order.status !== 'PICKED_UP' && order.status !== 'CANCELLED' && (
        <View style={styles.etaCard}>
          <Text style={styles.etaLabel}>Estimated Ready Time</Text>
          <Text style={styles.etaTime}>{formatTime(order.estimated_ready_time)}</Text>
        </View>
      )}

      {order.items && order.items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.menu_item_name || 'Item'}</Text>
                <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.orderItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{order.total_amount.toFixed(2)}</Text>
        </View>
        <Text style={styles.paymentMethod}>
          {order.payment_method === 'CASH_ON_PICKUP' ? '💵 Cash on Pickup' : '💳 Online Payment'}
        </Text>
      </View>

      {order.status === 'READY' && userPin && (
        <View style={styles.pinCard}>
          <Text style={styles.pinLabel}>Your Default PIN</Text>
          <Text style={styles.pinValue}>{userPin}</Text>
          <Text style={styles.pinNote}>Show this 4-digit PIN to the restaurant when collecting your order</Text>
          <Text style={styles.pinNoteSmall}>Note: Restaurant will verify your PIN before marking order as picked up</Text>
        </View>
      )}

      <FlatList
        data={[]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={null}
      />
    </View>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderId: {
    fontSize: 14,
    color: '#666',
  },
  etaCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  etaTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
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
  paymentMethod: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  pinCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  pinValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    letterSpacing: 8,
    marginBottom: 8,
  },
  pinNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  pinNoteSmall: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

