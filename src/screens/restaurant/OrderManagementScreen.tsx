import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { orderService } from '../../services';
import { Order, OrderStatus } from '../../../shared/api-contracts';
import { restaurantService } from '../../services';

interface OrderManagementScreenProps {
  restaurantId: string;
}

export const OrderManagementScreen: React.FC<OrderManagementScreenProps> = ({
  restaurantId,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const restaurantOrders = await orderService.getMyOrders();
      const filteredOrders = restaurantOrders.filter(
        (order) => order.restaurant_id === restaurantId
      );
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
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
  }, [restaurantId]);

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case OrderStatus.PENDING:
        return OrderStatus.CONFIRMED;
      case OrderStatus.CONFIRMED:
        return OrderStatus.PREPARING;
      case OrderStatus.PREPARING:
        return OrderStatus.READY;
      default:
        return null;
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
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              <Text style={styles.orderAmount}>₹{item.total_amount}</Text>
              <Text style={styles.orderDate}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
              {nextStatus && (
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={() => updateOrderStatus(item.id, nextStatus)}
                >
                  <Text style={styles.updateButtonText}>
                    Mark as {nextStatus}
                  </Text>
                </TouchableOpacity>
              )}
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
  statusText: {
    fontSize: 14,
    color: '#666',
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
  updateButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
});

