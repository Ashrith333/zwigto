import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { orderService, restaurantService, websocketService } from '../../services';
import { Order, OrderStatus } from '../../../shared/api-contracts';
import { theme } from '../../theme/theme';
import { getOrderIdDisplay } from '../../utils/orderId';

export const OrderManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Store all orders for filtering
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef(searchQuery);
  const [autoAccept, setAutoAccept] = useState(true); // Default to ON
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [settingsButtonLayout, setSettingsButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const settingsButtonRef = useRef<View | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'value' | 'items'>('latest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortButtonLayout, setSortButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const sortButtonRef = useRef<View | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoAcceptRef = useRef(true); // Ref for WebSocket handler
  const [statusDropdownOrderId, setStatusDropdownOrderId] = useState<string | null>(null);
  const [statusDropdownLayout, setStatusDropdownLayout] = useState<{ [key: string]: { x: number; y: number; width: number; height: number } }>({});
  const statusDropdownRefs = useRef<{ [key: string]: View | null }>({});
  
  // Load auto-accept preference from storage
  useEffect(() => {
    const loadAutoAcceptPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('auto_accept_orders');
        if (saved !== null) {
          const isEnabled = saved === 'true';
          setAutoAccept(isEnabled);
          autoAcceptRef.current = isEnabled;
        } else {
          // Default to true if not set
          setAutoAccept(true);
          autoAcceptRef.current = true;
          await AsyncStorage.setItem('auto_accept_orders', 'true');
        }
      } catch (error) {
        console.error('Failed to load auto-accept preference:', error);
      }
    };
    loadAutoAcceptPreference();
  }, []);
  
  // Keep searchQueryRef in sync
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);
  
  // Keep autoAcceptRef in sync
  useEffect(() => {
    autoAcceptRef.current = autoAccept;
  }, [autoAccept]);
  
  // Save auto-accept preference when changed
  const handleAutoAcceptToggle = async (value: boolean) => {
    setAutoAccept(value);
    autoAcceptRef.current = value;
    try {
      await AsyncStorage.setItem('auto_accept_orders', value.toString());
    } catch (error) {
      console.error('Failed to save auto-accept preference:', error);
    }
  };

  const applySorting = (ordersToSort: Order[]): Order[] => {
    const sorted = [...ordersToSort];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'latest':
          // Latest first = descending by time
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'oldest':
          // Oldest first = ascending by time
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'value':
          comparison = (a.total_amount || 0) - (b.total_amount || 0);
          break;
        case 'items':
          const aItemCount = a.items?.length || 0;
          const bItemCount = b.items?.length || 0;
          comparison = aItemCount - bItemCount;
          break;
      }
      
      // Apply sort order for value and items (latest/oldest have fixed direction)
      if (sortBy === 'value' || sortBy === 'items') {
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      
      return comparison;
    });
    
    return sorted;
  };

  const applySearchFilter = (ordersToFilter: Order[], query: string) => {
    let filtered = ordersToFilter;
    
    // Filter out cancelled orders (always hide rejected orders)
    filtered = filtered.filter(order => order.status !== OrderStatus.CANCELLED);
    
    // Apply search query filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase().trim();
      filtered = filtered.filter(order => {
        const orderId = getOrderIdDisplay(order.id).toLowerCase();
        const userName = (order.user_name || '').toLowerCase();
        return orderId.includes(lowerQuery) || userName.includes(lowerQuery);
      });
    }
    
    // Apply sorting
    const sorted = applySorting(filtered);
    setOrders(sorted);
  };

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
      
      // Filter to show pending, confirmed, preparing, ready orders (not picked up, cancelled handled by toggle)
      const activeOrders = restaurantOrders.filter(
        (order) => order.status !== OrderStatus.PICKED_UP
      );
      console.log('Active orders after filtering:', activeOrders.length);
      
      setAllOrders(activeOrders); // Store all orders
      
      // Apply sorting and search filter
      const sorted = applySorting(activeOrders);
      applySearchFilter(sorted, searchQuery);
      
      // Subscribe to WebSocket updates for this restaurant
      if (restaurant.id) {
        websocketService.subscribeToRestaurantOrders(restaurant.id, async (updatedOrder) => {
          // Auto-accept new pending orders immediately if enabled
          if (autoAcceptRef.current && updatedOrder.status === OrderStatus.PENDING) {
            try {
              await orderService.updateOrderStatus(updatedOrder.id, { status: OrderStatus.CONFIRMED });
              console.log('Auto-accepted new order via WebSocket:', updatedOrder.id);
              // Update the order status to CONFIRMED after auto-accepting
              updatedOrder.status = OrderStatus.CONFIRMED;
            } catch (error: any) {
              // Ignore errors for orders that are already confirmed or invalid transitions
              if (error?.message?.includes('Invalid status transition')) {
                console.log('Order already processed via WebSocket, skipping:', updatedOrder.id);
                // Order might already be confirmed, update status accordingly
                updatedOrder.status = OrderStatus.CONFIRMED;
              } else {
                console.error('Failed to auto-accept order via WebSocket:', error);
              }
            }
          }
          
          // Update allOrders first
          setAllOrders((prevAllOrders) => {
            const existingIndex = prevAllOrders.findIndex(o => o.id === updatedOrder.id);
            
            // Filter out picked up orders (cancelled orders are handled by toggle)
            if (updatedOrder.status === OrderStatus.PICKED_UP) {
              if (existingIndex >= 0) {
                const filtered = prevAllOrders.filter(o => o.id !== updatedOrder.id);
                // Apply search filter to updated list using current searchQuery
                applySearchFilter(filtered, searchQueryRef.current);
                return filtered;
              }
              return prevAllOrders;
            }
            
            let updatedAllOrders;
            if (existingIndex >= 0) {
              // Update existing order
              updatedAllOrders = [...prevAllOrders];
              updatedAllOrders[existingIndex] = updatedOrder;
            } else {
              // Add new order
              updatedAllOrders = [...prevAllOrders, updatedOrder];
            }
            
            // Apply sorting and search filter using current searchQuery
            const sorted = applySorting(updatedAllOrders);
            applySearchFilter(sorted, searchQueryRef.current);
            return sorted;
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

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    const sorted = applySorting(allOrders);
    applySearchFilter(sorted, text);
  };

  // Reapply sorting when sortBy or sortOrder changes
  useEffect(() => {
    if (allOrders.length > 0) {
      const sorted = applySorting(allOrders);
      applySearchFilter(sorted, searchQuery);
    }
  }, [sortBy, sortOrder]);

  // Auto-accept pending orders when enabled (for orders loaded on refresh)
  useEffect(() => {
    if (!autoAccept || allOrders.length === 0) return;

    const autoAcceptOrders = async () => {
      // Only accept orders that are actually PENDING (not already CONFIRMED or other statuses)
      const pendingOrders = allOrders.filter(o => o.status === OrderStatus.PENDING);
      if (pendingOrders.length === 0) return;

      for (const order of pendingOrders) {
        // Double check status before accepting
        if (order.status === OrderStatus.PENDING) {
          try {
            await orderService.updateOrderStatus(order.id, { status: OrderStatus.CONFIRMED });
            console.log('Auto-accepted order on load:', order.id);
          } catch (error: any) {
            // Ignore errors for orders that are already confirmed or invalid transitions
            if (error?.message?.includes('Invalid status transition')) {
              console.log('Order already processed, skipping:', order.id);
            } else {
              console.error('Failed to auto-accept order:', error);
            }
          }
        }
      }
      
      // Reload after auto-accepting
      if (pendingOrders.length > 0) {
        setTimeout(() => loadOrders(), 1000);
      }
    };

    autoAcceptOrders();
  }, [autoAccept, allOrders.length]); // Only trigger when order count changes, not on every order update

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
    
    // Set up auto-refresh if enabled (every 10 seconds)
    if (autoRefreshEnabled) {
      autoRefreshIntervalRef.current = setInterval(() => {
        loadOrders();
      }, 10000); // Refresh every 10 seconds
    }
    
    return () => {
      // Clear auto-refresh interval
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      // Unsubscribe from WebSocket when component unmounts
      if (restaurantId) {
        websocketService.unsubscribeFromRestaurant(restaurantId).catch(console.error);
      }
    };
  }, [autoRefreshEnabled, autoAccept]);
  
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

  const getAvailableStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
    switch (currentStatus) {
      case OrderStatus.PENDING:
        // Can go directly to CONFIRMED, PREPARING, or READY (backend handles intermediate statuses)
        return [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLED];
      case OrderStatus.CONFIRMED:
        // Can go directly to PREPARING or READY (backend handles intermediate statuses)
        return [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLED];
      case OrderStatus.PREPARING:
        // Can only go to READY (next step)
        return [OrderStatus.READY, OrderStatus.CANCELLED];
      case OrderStatus.READY:
        // Can go to PICKED_UP
        return [OrderStatus.PICKED_UP, OrderStatus.CANCELLED];
      default:
        return [];
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, currentStatus: OrderStatus) => {
    try {
      if (newStatus === OrderStatus.PICKED_UP) {
        handleMarkPickedUp(orderId);
        setStatusDropdownOrderId(null);
        return;
      } else if (newStatus === OrderStatus.CANCELLED) {
        // Show confirmation popup for cancellation
        Alert.alert(
          'Cancel Order',
          'Are you sure you want to cancel this order?',
          [
            { text: 'No', style: 'cancel', onPress: () => setStatusDropdownOrderId(null) },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                try {
                  await handleReject(orderId);
                  setStatusDropdownOrderId(null);
                } catch (error) {
                  console.error('Failed to cancel order:', error);
                }
              },
            },
          ]
        );
        return;
      }

      // Handle sequential status transitions
      const statusSequence: OrderStatus[] = [];
      
      // Build the sequence of status transitions needed
      if (currentStatus === OrderStatus.PENDING) {
        if (newStatus === OrderStatus.CONFIRMED) {
          statusSequence.push(OrderStatus.CONFIRMED);
        } else if (newStatus === OrderStatus.PREPARING) {
          statusSequence.push(OrderStatus.CONFIRMED, OrderStatus.PREPARING);
        } else if (newStatus === OrderStatus.READY) {
          statusSequence.push(OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY);
        }
      } else if (currentStatus === OrderStatus.CONFIRMED) {
        if (newStatus === OrderStatus.PREPARING) {
          statusSequence.push(OrderStatus.PREPARING);
        } else if (newStatus === OrderStatus.READY) {
          statusSequence.push(OrderStatus.PREPARING, OrderStatus.READY);
        }
      } else if (currentStatus === OrderStatus.PREPARING) {
        if (newStatus === OrderStatus.READY) {
          statusSequence.push(OrderStatus.READY);
        }
      } else {
        // Direct transition if already in sequence
        statusSequence.push(newStatus);
      }

      // Execute all status transitions sequentially
      for (const status of statusSequence) {
        try {
          await orderService.updateOrderStatus(orderId, { status });
          // Small delay between transitions to ensure backend processes them
          if (statusSequence.length > 1 && status !== statusSequence[statusSequence.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error: any) {
          // If a transition fails, it might be because the status was already updated
          // Check if it's an "Invalid status transition" error
          if (error?.message?.includes('Invalid status transition')) {
            console.log(`Status ${status} already applied, continuing...`);
            // Try to continue with next status
            continue;
          } else {
            throw error;
          }
        }
      }

      await loadOrders();
      Alert.alert('Success', `Order status updated to ${getStatusLabel(newStatus)}`);
      setStatusDropdownOrderId(null);
    } catch (error) {
      console.error('Failed to update order status:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update order status');
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

  const getStatusIcon = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'time-outline';
      case OrderStatus.CONFIRMED:
        return 'checkmark-circle-outline';
      case OrderStatus.PREPARING:
        return 'restaurant-outline';
      case OrderStatus.READY:
        return 'checkmark-done-circle-outline';
      default:
        return 'cube-outline';
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Pending';
      case OrderStatus.CONFIRMED:
        return 'Confirmed';
      case OrderStatus.PREPARING:
        return 'Preparing';
      case OrderStatus.READY:
        return 'Ready';
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="cube-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.title}>Order Management</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="refresh" 
                size={22} 
                color={refreshing ? theme.colors.textTertiary : theme.colors.primary} 
              />
            </TouchableOpacity>
            {allOrders.length > 0 && (
              <View style={styles.orderCountBadge}>
                <Text style={styles.orderCountText}>{allOrders.length}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Order ID or Customer Name"
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchChange('')}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            ref={(ref) => {
              sortButtonRef.current = ref;
            }}
            onLayout={() => {
              setTimeout(() => {
                sortButtonRef.current?.measureInWindow((x, y, width, height) => {
                  setSortButtonLayout({ x, y, width, height });
                });
              }, 0);
            }}
            style={styles.sortButton}
            onPress={() => {
              sortButtonRef.current?.measureInWindow((x, y, width, height) => {
                setSortButtonLayout({ x, y, width, height });
                setShowSortDropdown(!showSortDropdown);
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            ref={(ref) => {
              settingsButtonRef.current = ref;
            }}
            onLayout={() => {
              setTimeout(() => {
                settingsButtonRef.current?.measureInWindow((x, y, width, height) => {
                  setSettingsButtonLayout({ x, y, width, height });
                });
              }, 0);
            }}
            style={styles.settingsButton}
            onPress={() => {
              settingsButtonRef.current?.measureInWindow((x, y, width, height) => {
                setSettingsButtonLayout({ x, y, width, height });
                setShowSettingsDropdown(!showSettingsDropdown);
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
      <FlatList
        data={orders}
        keyExtractor={(item, index) => item.id || `order-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const orderIdDisplay = getOrderIdDisplay(item.id);
          const availableStatuses = getAvailableStatuses(item.status);
          const isStatusDropdownOpen = statusDropdownOrderId === item.id;
          
          return (
            <View style={styles.orderCard}>
              <View style={styles.orderCardHeader}>
                <View style={styles.orderInfo}>
                  <View style={styles.orderIdRow}>
                    <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.orderId}>#{orderIdDisplay}</Text>
                    {item.user_name && (
                      <>
                        <Text style={styles.separator}>•</Text>
                        <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.userName}>{item.user_name}</Text>
                      </>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  ref={(ref) => {
                    if (ref) {
                      statusDropdownRefs.current[item.id] = ref;
                    }
                  }}
                  onLayout={() => {
                    // Measure position when layout changes
                    setTimeout(() => {
                      statusDropdownRefs.current[item.id]?.measureInWindow((x, y, width, height) => {
                        setStatusDropdownLayout((prev) => ({
                          ...prev,
                          [item.id]: { x, y, width, height },
                        }));
                      });
                    }, 0);
                  }}
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
                  onPress={() => {
                    if (availableStatuses.length > 0) {
                      // Measure position when opening dropdown
                      statusDropdownRefs.current[item.id]?.measureInWindow((x, y, width, height) => {
                        setStatusDropdownLayout((prev) => ({
                          ...prev,
                          [item.id]: { x, y, width, height },
                        }));
                        setStatusDropdownOrderId(isStatusDropdownOpen ? null : item.id);
                      });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={getStatusIcon(item.status)} size={12} color={theme.colors.textInverse} />
                  <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                  {availableStatuses.length > 0 && (
                    <Ionicons name="chevron-down" size={12} color={theme.colors.textInverse} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={14} color={theme.colors.success} />
                    <Text style={styles.orderAmount}>₹{(item.total_amount || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.orderDate}>
                      {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons 
                      name={item.payment_method === 'CASH_ON_PICKUP' ? 'cash-outline' : 'card-outline'} 
                      size={12} 
                      color={theme.colors.textSecondary} 
                    />
                    <Text style={styles.paymentStatus}>
                      {item.payment_method === 'CASH_ON_PICKUP' ? 'Cash' : 'Online'}
                    </Text>
                  </View>
                </View>
              </View>

              {item.items && item.items.length > 0 && (
                <View style={styles.itemsContainer}>
                  <View style={styles.itemsHeader}>
                    <Ionicons name="list-outline" size={14} color={theme.colors.textPrimary} />
                    <Text style={styles.itemsTitle}>Items ({item.items.length})</Text>
                  </View>
                  {item.items.slice(0, 3).map((orderItem, index) => (
                    <View key={orderItem.id || `item-${index}-${orderItem.menu_item_id}`} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{orderItem.menu_item_name || 'Item'}</Text>
                        <Text style={styles.itemQuantity}>Qty: {orderItem.quantity}</Text>
                      </View>
                      <Text style={styles.itemPrice}>₹{((orderItem.price || 0) * orderItem.quantity).toFixed(2)}</Text>
                    </View>
                  ))}
                  {item.items.length > 3 && (
                    <Text style={styles.moreItemsText}>+{item.items.length - 3} more items</Text>
                  )}
                </View>
              )}

            </View>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No orders found' : 'No active orders'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'New orders will appear here'}
              </Text>
            </View>
          )
        }
      />
      
      {/* Sort Dropdown Modal */}
      {showSortDropdown && (
        <Modal
          visible={showSortDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSortDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowSortDropdown(false)}
          >
            <View
              style={[
                styles.sortDropdownList,
                {
                  position: 'absolute',
                  top: sortButtonLayout.y + sortButtonLayout.height + 4,
                  right: theme.spacing.md,
                  width: 200,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.sortDropdownTitle}>Sort By</Text>
              {([
                { key: 'latest', label: 'Latest Orders First' },
                { key: 'oldest', label: 'Oldest Orders First' },
                { key: 'value', label: 'Order Value' },
                { key: 'items', label: 'Number of Items' },
              ] as const).map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOptionItem,
                    sortBy === option.key && styles.sortOptionItemActive,
                  ]}
                  onPress={() => {
                    if (sortBy === option.key && (option.key === 'value' || option.key === 'items')) {
                      // Toggle sort order only for value and items
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(option.key as 'latest' | 'oldest' | 'value' | 'items');
                      setSortOrder('desc'); // Default to descending for value and items
                    }
                    // Reapply sorting and filtering
                    const sorted = applySorting(allOrders);
                    applySearchFilter(sorted, searchQuery);
                    setShowSortDropdown(false);
                  }}
                >
                  <Ionicons 
                    name={sortBy === option.key ? 'radio-button-on' : 'radio-button-off'} 
                    size={18} 
                    color={sortBy === option.key ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.key && styles.sortOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                  {sortBy === option.key && (option.key === 'value' || option.key === 'items') && (
                    <Ionicons 
                      name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                      size={16} 
                      color={theme.colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      
      {/* Settings Dropdown Modal */}
      {showSettingsDropdown && (
        <Modal
          visible={showSettingsDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSettingsDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowSettingsDropdown(false)}
          >
            <View
              style={[
                styles.settingsDropdownList,
                {
                  position: 'absolute',
                  top: settingsButtonLayout.y + settingsButtonLayout.height + 4,
                  right: theme.spacing.md,
                  width: 240,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => handleAutoAcceptToggle(!autoAccept)}
                activeOpacity={0.7}
              >
                <View style={styles.settingContent}>
                  <Ionicons 
                    name={autoAccept ? 'checkmark-circle' : 'checkmark-circle-outline'} 
                    size={20} 
                    color={autoAccept ? theme.colors.success : theme.colors.textSecondary} 
                  />
                  <Text style={styles.settingLabel}>Auto-Accept Orders</Text>
                </View>
                <View style={[styles.toggleSwitch, autoAccept && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleThumb, autoAccept && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                activeOpacity={0.7}
              >
                <View style={styles.settingContent}>
                  <Ionicons 
                    name={autoRefreshEnabled ? 'sync' : 'sync-outline'} 
                    size={20} 
                    color={autoRefreshEnabled ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={styles.settingLabel}>Auto-Refresh (10s)</Text>
                </View>
                <View style={[styles.toggleSwitch, autoRefreshEnabled && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleThumb, autoRefreshEnabled && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      
      {/* Status Dropdown Modal - Rendered outside FlatList for proper z-index */}
      {statusDropdownOrderId && statusDropdownLayout[statusDropdownOrderId] && (() => {
        const item = orders.find(o => o.id === statusDropdownOrderId);
        if (!item) return null;
        const availableStatuses = getAvailableStatuses(item.status);
        const layout = statusDropdownLayout[statusDropdownOrderId];
        
        return (
          <Modal
            visible={!!statusDropdownOrderId}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setStatusDropdownOrderId(null)}
          >
            <TouchableOpacity
              style={styles.dropdownOverlay}
              activeOpacity={1}
              onPress={() => setStatusDropdownOrderId(null)}
            >
              <View
                style={[
                  styles.statusDropdownList,
                  {
                    position: 'absolute',
                    top: layout.y + layout.height + 4,
                    left: Math.max(theme.spacing.md, layout.x + layout.width - 180),
                    width: 180,
                  },
                ]}
                onStartShouldSetResponder={() => true}
              >
                {availableStatuses.map((status, index, array) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusDropdownItem,
                      index === array.length - 1 && styles.statusDropdownItemLast,
                    ]}
                    onPress={() => handleStatusChange(item.id, status, item.status)}
                  >
                    <Ionicons 
                      name={getStatusIcon(status)} 
                      size={14} 
                      color={getStatusColor(status)} 
                    />
                    <Text style={styles.statusDropdownItemText}>
                      {getStatusLabel(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        );
      })()}

      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPinModal(false);
          setPinInput('');
          setPendingOrderId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="lock-closed" size={32} color={theme.colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Verify Customer PIN</Text>
              <Text style={styles.modalSubtitle}>
                Please ask the customer for their 4-digit PIN to confirm order pickup
              </Text>
            </View>
            <View style={styles.pinInputContainer}>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="0000"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={false}
                returnKeyType="done"
                blurOnSubmit={true}
                autoFocus={true}
              />
              <Text style={styles.pinHint}>Enter 4-digit PIN</Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setPendingOrderId(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, (updatingStatus || pinInput.length !== 4) && styles.modalButtonDisabled]}
                onPress={handleConfirmPickup}
                disabled={updatingStatus || pinInput.length !== 4}
                activeOpacity={0.7}
              >
                {updatingStatus ? (
                  <Text style={styles.modalButtonText}>Processing...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.textInverse} />
                    <Text style={styles.modalButtonText}>Confirm</Text>
                  </>
                )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    fontSize: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  refreshButton: {
    padding: theme.spacing.xs,
  },
  orderCountBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCountText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: theme.spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    minWidth: 0, // Allow flex to shrink below content size
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  sortButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    flexShrink: 0, // Prevent button from shrinking
  },
  settingsButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    flexShrink: 0, // Prevent button from shrinking
  },
  sortDropdownList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
    paddingVertical: theme.spacing.xs,
  },
  sortDropdownTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontSize: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  sortOptionItemActive: {
    backgroundColor: theme.colors.background,
  },
  sortOptionText: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  sortOptionTextActive: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  settingsDropdownList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
    paddingVertical: theme.spacing.xs,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  settingLabel: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontSize: 13,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
  orderCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  orderInfo: {
    flex: 1,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  orderId: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  separator: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginHorizontal: 2,
  },
  userName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    minWidth: 100,
  },
  statusText: {
    ...theme.typography.smallBold,
    color: theme.colors.textInverse,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderDetails: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  orderAmount: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  orderDate: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  paymentStatus: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  itemsContainer: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  itemsTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontSize: 12,
    marginBottom: 1,
  },
  itemQuantity: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  itemPrice: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontSize: 12,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  statusDropdownList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
  },
  statusDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  statusDropdownItemLast: {
    borderBottomWidth: 0,
  },
  statusDropdownItemText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  moreItemsText: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontSize: 20,
  },
  modalSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.sm,
  },
  pinInputContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  pinInput: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.xs,
  },
  pinHint: {
    ...theme.typography.small,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    fontSize: 11,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    minHeight: 48,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  confirmButton: {
    backgroundColor: theme.colors.success,
  },
  modalCancelButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  modalButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textInverse,
    fontSize: 15,
  },
});

