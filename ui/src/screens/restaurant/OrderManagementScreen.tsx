import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { orderService, restaurantService } from '../../services';
import { Order, OrderStatus } from '../../../shared/api-contracts';

export const OrderManagementScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const restaurant = await restaurantService.getMyRestaurant();
      setRestaurantId(restaurant.id);
      
      const restaurantOrders = await orderService.getRestaurantOrders();
      // Filter to show pending, confirmed, preparing, ready orders (not picked up or cancelled)
      const activeOrders = restaurantOrders.filter(
        (order) => order.status !== OrderStatus.PICKED_UP && order.status !== OrderStatus.CANCELLED
      );
      // Sort by created_at descending (newest first)
      const sortedOrders = activeOrders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(sortedOrders);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      const errorMessage = error?.message || 'Failed to load orders';
      if (!errorMessage.includes('not linked')) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, { status: newStatus });
      await loadOrders();
      Alert.alert('Success', 'Order status updated');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update order');
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleAccept = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, { status: OrderStatus.CONFIRMED });
      Alert.alert('Success', 'Order accepted');
      loadOrders();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept order');
    }
  };

  const handleReject = async (orderId: string) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await orderService.updateOrderStatus(orderId, { status: OrderStatus.CANCELLED });
              Alert.alert('Success', 'Order rejected');
              loadOrders();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject order');
            }
          },
        },
      ]
    );
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case OrderStatus.CONFIRMED:
        return OrderStatus.PREPARING;
      case OrderStatus.PREPARING:
        return OrderStatus.READY;
      case OrderStatus.READY:
        return OrderStatus.PICKED_UP;
      default:
        return null;
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PENDING:
        return '#FF9500';
      case OrderStatus.CONFIRMED:
        return '#007AFF';
      case OrderStatus.PREPARING:
        return '#FF9500';
      case OrderStatus.READY:
        return '#34C759';
      case OrderStatus.PICKED_UP:
        return '#34C759';
      default:
        return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Management</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const nextStatus = getNextStatus(item.status);
          return (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.orderAmount}>₹{item.total_amount.toFixed(2)}</Text>
              <Text style={styles.orderDate}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
              <Text style={styles.paymentStatus}>Payment: Paid</Text>
              
              <View style={styles.actionsRow}>
                {item.status === OrderStatus.PENDING && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(item.id)}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAccept(item.id)}
                    >
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </>
                )}
                {nextStatus && item.status !== OrderStatus.PENDING && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.updateButton]}
                    onPress={() => updateOrderStatus(item.id, nextStatus)}
                  >
                    <Text style={styles.actionButtonText}>
                      Mark as {nextStatus.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>No orders</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  paymentStatus: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 4,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
});

