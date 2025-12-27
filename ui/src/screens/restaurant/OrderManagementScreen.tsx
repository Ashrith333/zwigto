import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { orderService, restaurantService, websocketService } from '../../services';
import { Order, OrderStatus } from '../../../shared/api-contracts';
import { theme } from '../../theme/theme';

export const OrderManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const restaurant = await restaurantService.getMyRestaurant();
      if (!restaurant) {
        console.log('No restaurant found for user');
        setOrders([]);
        return;
      }
      
      console.log('Loading orders for restaurant:', restaurant.id);
      setRestaurantId(restaurant.id);
      
      const restaurantOrders = await orderService.getRestaurantOrders();
      console.log('Received orders from API:', restaurantOrders.length);
      
      // Filter to show pending, confirmed, preparing, ready orders (not picked up or cancelled)
      const activeOrders = restaurantOrders.filter(
        (order) => order.status !== OrderStatus.PICKED_UP && order.status !== OrderStatus.CANCELLED
      );
      console.log('Active orders after filtering:', activeOrders.length);
      
      // Sort by created_at descending (newest first)
      const sortedOrders = activeOrders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(sortedOrders);
      
      // Subscribe to WebSocket updates for this restaurant
      if (restaurant.id) {
        websocketService.subscribeToRestaurantOrders(restaurant.id, (updatedOrder) => {
          // Update or add order to the list
          setOrders((prevOrders) => {
            const existingIndex = prevOrders.findIndex(o => o.id === updatedOrder.id);
            
            // Filter out picked up or cancelled orders
            if (updatedOrder.status === OrderStatus.PICKED_UP || updatedOrder.status === OrderStatus.CANCELLED) {
              if (existingIndex >= 0) {
                // Remove from list
                return prevOrders.filter(o => o.id !== updatedOrder.id);
              }
              return prevOrders;
            }
            
            if (existingIndex >= 0) {
              // Update existing order
              const newOrders = [...prevOrders];
              newOrders[existingIndex] = updatedOrder;
              return newOrders.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            } else {
              // Add new order
              return [...prevOrders, updatedOrder].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            }
          });
        }).catch((error) => {
          console.error('Failed to subscribe to restaurant order updates:', error);
        });
      }
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || 'Failed to load orders';
      if (!errorMessage.includes('not linked')) {
        Alert.alert('Error', errorMessage);
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, customerPin?: string) => {
    try {
      await orderService.updateOrderStatus(orderId, { 
        status: newStatus,
        customer_pin: customerPin,
      });
      await loadOrders();
      Alert.alert('Success', 'Order status updated');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update order');
    }
  };

  const handleMarkPickedUp = (orderId: string) => {
    setPendingOrderId(orderId);
    setShowPinModal(true);
    setPinInput('');
  };

  const handleConfirmPickup = async () => {
    if (!pendingOrderId || pinInput.length !== 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit PIN');
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateOrderStatus(pendingOrderId, OrderStatus.PICKED_UP, pinInput);
      setShowPinModal(false);
      setPinInput('');
      setPendingOrderId(null);
    } catch (error) {
      // Error already handled in updateOrderStatus
      setPinInput('');
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    loadOrders();
    
    return () => {
      // Unsubscribe from WebSocket when component unmounts
      if (restaurantId) {
        websocketService.unsubscribeFromRestaurant(restaurantId).catch(console.error);
      }
    };
  }, []);
  
  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [])
  );

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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Order Management</Text>
        </View>
      </SafeAreaView>
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
              <Text style={styles.paymentStatus}>
                Payment: {item.payment_method === 'CASH_ON_PICKUP' ? '💵 Cash on Pickup' : '💳 Online'}
              </Text>
              {item.items && item.items.length > 0 && (
                <View style={styles.itemsContainer}>
                  <Text style={styles.itemsTitle}>Items:</Text>
                  {item.items.map((orderItem) => (
                    <Text key={orderItem.id} style={styles.itemText}>
                      • {orderItem.menu_item_name || 'Item'} x {orderItem.quantity}
                    </Text>
                  ))}
                </View>
              )}
              
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
                    onPress={() => {
                      if (nextStatus === OrderStatus.PICKED_UP) {
                        handleMarkPickedUp(item.id);
                      } else {
                        updateOrderStatus(item.id, nextStatus);
                      }
                    }}
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

      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPinModal(false);
          setPinInput('');
          setPendingOrderId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Customer PIN</Text>
            <Text style={styles.modalSubtitle}>Please ask the customer for their 4-digit PIN to mark order as picked up</Text>
            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="Enter 4-digit PIN"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry={false}
              returnKeyType="done"
              blurOnSubmit={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setPendingOrderId(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, (updatingStatus || pinInput.length !== 4) && styles.modalButtonDisabled]}
                onPress={handleConfirmPickup}
                disabled={updatingStatus || pinInput.length !== 4}
              >
                <Text style={styles.modalButtonText}>
                  {updatingStatus ? 'Processing...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    backgroundColor: theme.colors.surface,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
  },
  statusText: {
    ...theme.typography.smallBold,
    color: theme.colors.textInverse,
  },
  paymentStatus: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 4,
    marginBottom: 8,
  },
  itemsContainer: {
    marginTop: 8,
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  itemText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
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
    backgroundColor: theme.colors.success,
  },
  rejectButton: {
    backgroundColor: theme.colors.error,
  },
  updateButton: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
  },
  orderAmount: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  orderDate: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  pinInput: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

