import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { orderService, adminService } from '../../services';
import { Order } from '../../../shared/api-contracts';

export const OrderOversightScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const allOrders = await orderService.getMyOrders();
      // Filter out completed/cancelled orders
      const activeOrders = allOrders.filter(
        (o) => o.status !== 'PICKED_UP' && o.status !== 'CANCELLED'
      );
      setOrders(activeOrders);
    } catch (error) {
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.cancelOrder(orderId);
              Alert.alert('Success', 'Order cancelled');
              loadOrders();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const handleRefund = async (orderId: string) => {
    Alert.alert(
      'Trigger Refund',
      'This will initiate a refund for this order. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          onPress: async () => {
            try {
              await adminService.triggerRefund(orderId);
              Alert.alert('Success', 'Refund initiated');
            } catch (error) {
              Alert.alert('Error', 'Failed to trigger refund');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#007AFF';
      case 'PREPARING':
        return '#FF9500';
      case 'READY':
        return '#34C759';
      default:
        return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            
            <Text style={styles.orderDetails}>Restaurant: {item.restaurant_id.slice(0, 8)}</Text>
            <Text style={styles.orderDetails}>User: {item.user_id.slice(0, 8)}</Text>
            <Text style={styles.orderAmount}>₹{item.total_amount.toFixed(2)}</Text>
            <Text style={styles.orderDate}>
              Created: {new Date(item.created_at).toLocaleString()}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => handleCancel(item.id)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.refundButton]}
                onPress={() => handleRefund(item.id)}
              >
                <Text style={styles.buttonText}>Refund</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No active orders</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  refundButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

