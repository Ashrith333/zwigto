import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { orderService, restaurantService, authService, menuService } from '../../services';
import { Order, RestaurantProfile, OrderStatus } from '../../../shared/api-contracts';
import { theme } from '../../theme/theme';
import { BottomNavBar } from '../../components/BottomNavBar';

export const RestaurantHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  // Refresh dashboard when screen comes into focus (e.g., after updating order status)
  useFocusEffect(
    React.useCallback(() => {
      loadDashboard();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const loadDashboard = async () => {
    try {
      const rest = await restaurantService.getMyRestaurant();
      
      // If no restaurant exists, redirect to form to create one
      if (!rest) {
        setLoading(false);
        (navigation as any).navigate('RestaurantForm');
        return;
      }
      
      setRestaurant(rest);
      
      // Check if setup is needed (no description or no menu items)
      try {
        // Restaurant owner view: show all items including disabled
        const menuItems = await menuService.getMenuItems(rest.id, true, true);
        const needsSetupCheck = !rest.description || menuItems.length === 0;
        setNeedsSetup(needsSetupCheck);
      } catch (menuError) {
        // If menu items fail to load, still allow dashboard to show
        console.warn('Failed to load menu items:', menuError);
        setNeedsSetup(!rest.description);
      }

      // Load all orders for earnings calculation
      try {
        const orders = await orderService.getRestaurantOrders();
        console.log('Dashboard: Loaded orders:', orders.length);
        if (orders.length > 0) {
          console.log('Dashboard: Sample order:', {
            id: orders[0].id?.substring(0, 8),
            status: orders[0].status,
            created_at: orders[0].created_at,
            total_amount: orders[0].total_amount
          });
        }
        setAllOrders(orders);
      } catch (orderError) {
        // If orders fail to load, still allow dashboard to show
        console.warn('Failed to load orders:', orderError);
        setAllOrders([]);
      }
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      const errorMessage = error?.message || 'Failed to load dashboard';
      
      // If token is invalid, redirect to login
      if (errorMessage.includes('token') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid')) {
        console.warn('Token invalid, logging out');
        await authService.logout();
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => {
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'UnifiedAuth' }],
                });
              },
            },
          ]
        );
      } else {
        // For other errors (like no restaurant), don't log out, just show error
        console.warn('Dashboard load error (non-auth):', errorMessage);
        // Don't show alert for "no restaurant" case - that's handled by redirecting to setup
        if (!errorMessage.includes('not linked') && !errorMessage.includes('null')) {
          Alert.alert('Error', errorMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditRestaurant = () => {
    (navigation as any).navigate('RestaurantForm');
  };

  const handleManageOrders = () => {
    (navigation as any).navigate('OrderManagement');
  };

  const handleManageMenu = () => {
    (navigation as any).navigate('MenuManagement');
  };

  const handleProfile = () => {
    (navigation as any).navigate('RestaurantProfile');
  };

  const handlePayments = () => {
    // Payment details are now in RestaurantForm - navigate there
    (navigation as any).navigate('RestaurantForm');
  };

  const handleRatingAndOrderHistory = () => {
    (navigation as any).navigate('RatingAndOrderHistory');
  };

  const handleDeleteRestaurant = async () => {
    if (!restaurant) return;

    Alert.alert(
      'Delete Restaurant',
      'Are you sure you want to delete your restaurant? This action cannot be undone. All menu items, orders, and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await restaurantService.deleteRestaurant(restaurant.id);
              // Clear restaurant state and reload dashboard
              setRestaurant(null);
              setLoading(false);
              // Reload dashboard to show the "no restaurant" screen with create option
              await loadDashboard();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete restaurant');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            (navigation as any).reset({
              index: 0,
              routes: [{ name: 'UnifiedAuth' }],
            });
          },
        },
      ]
    );
  };

  const handleToggleStatus = async () => {
    if (!restaurant) return;
    
    try {
      let updatedRestaurant;
      if (restaurant.status === 'ACTIVE') {
        // Pause restaurant
        updatedRestaurant = await restaurantService.pauseRestaurant(restaurant.id);
        Alert.alert('Success', 'Restaurant paused');
      } else if (restaurant.status === 'PAUSED') {
        // Activate restaurant
        updatedRestaurant = await restaurantService.activateRestaurant(restaurant.id);
        Alert.alert('Success', 'Restaurant activated');
      } else {
        Alert.alert('Info', 'Cannot change status. Restaurant is pending approval or rejected.');
        return;
      }
      
      // Update local state with server response
      setRestaurant(updatedRestaurant);
    } catch (error: any) {
      console.error('Failed to update restaurant status:', error);
      Alert.alert('Error', error?.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 100 + Math.max(insets.bottom, 8) }}
        >
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Restaurant Dashboard</Text>
                <Text style={styles.subtitle}>No restaurant found</Text>
              </View>
            </View>
          </SafeAreaView>
          <View style={styles.noRestaurantContainer}>
            <Text style={styles.noRestaurantTitle}>No Restaurant Found</Text>
            <Text style={styles.noRestaurantSubtext}>
              You don't have a restaurant yet. Create one to get started!
            </Text>
            <TouchableOpacity
              style={styles.createRestaurantButton}
              onPress={() => (navigation as any).navigate('RestaurantForm')}
            >
              <Text style={styles.createRestaurantButtonText}>Create Restaurant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadDashboard}
            >
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <BottomNavBar currentScreen="Home" homeRoute="RestaurantHome" />
      </View>
    );
  }

  // Helper function to check if a date is today
  const isToday = (dateString: string): boolean => {
    if (!dateString) return false;
    const orderDate = new Date(dateString);
    const today = new Date();
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  };

  // Helper function to check if a date is in current month
  const isCurrentMonth = (dateString: string): boolean => {
    if (!dateString) return false;
    const orderDate = new Date(dateString);
    const now = new Date();
    return (
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    );
  };

  // Filter today's orders from allOrders (always use fresh data)
  const todayOrdersList = allOrders.filter((order) => {
    if (!order.created_at) return false;
    const isTodayOrder = isToday(order.created_at);
    return isTodayOrder;
  });

  console.log('Dashboard: Total orders:', allOrders.length);
  console.log('Dashboard: Today orders:', todayOrdersList.length);
  console.log('Dashboard: Today orders breakdown:', {
    new: todayOrdersList.filter(o => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.PENDING).length,
    preparing: todayOrdersList.filter(o => o.status === OrderStatus.PREPARING).length,
    ready: todayOrdersList.filter(o => o.status === OrderStatus.READY).length,
    pickedUp: todayOrdersList.filter(o => o.status === OrderStatus.PICKED_UP).length,
  });

  // Calculate earnings
  const calculateDailyEarnings = () => {
    const todayCompletedOrders = todayOrdersList.filter(
      (order) => order.status === OrderStatus.PICKED_UP
    );
    const total = todayCompletedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    console.log('Dashboard: Daily earnings:', total, 'from', todayCompletedOrders.length, 'orders');
    return total;
  };

  const calculateMonthlyEarnings = () => {
    const monthlyCompletedOrders = allOrders.filter(
      (order) => 
        order.created_at && 
        isCurrentMonth(order.created_at) &&
        order.status === OrderStatus.PICKED_UP
    );
    const total = monthlyCompletedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    console.log('Dashboard: Monthly earnings:', total, 'from', monthlyCompletedOrders.length, 'orders');
    return total;
  };

  const dailyEarnings = calculateDailyEarnings();
  const monthlyEarnings = calculateMonthlyEarnings();

  // Calculate order stats from today's orders (using fresh allOrders data)
  const newOrders = todayOrdersList.filter(o => 
    o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.PENDING
  );
  const preparingOrders = todayOrdersList.filter(o => o.status === OrderStatus.PREPARING);
  const readyOrders = todayOrdersList.filter(o => o.status === OrderStatus.READY);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 100 + Math.max(insets.bottom, 8) }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{restaurant.name}</Text>
              <Text style={styles.subtitle}>Restaurant Dashboard</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Restaurant Status:</Text>
                <TouchableOpacity
                  style={[
                    styles.statusButton, 
                    restaurant.status === 'ACTIVE' 
                      ? styles.activeButton 
                      : restaurant.status === 'REJECTED'
                      ? styles.rejectedButton
                      : styles.pausedButton
                  ]}
                  onPress={handleToggleStatus}
                  disabled={restaurant.status === 'PENDING' || restaurant.status === 'REJECTED'}
                >
                  <Text style={styles.statusButtonText}>
                    {restaurant.status === 'ACTIVE' 
                      ? 'Open' 
                      : restaurant.status === 'PAUSED' 
                      ? 'Paused' 
                      : restaurant.status === 'REJECTED'
                      ? 'Rejected'
                      : 'Pending'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {restaurant.status === 'PENDING' && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>Restaurant pending admin approval</Text>
          </View>
        )}
        
        {restaurant.status === 'REJECTED' && (
          <View style={styles.rejectedBanner}>
            <Text style={styles.rejectedText}>❌ Restaurant has been rejected</Text>
            {restaurant.rejection_reason && (
              <Text style={styles.rejectionReason}>
                Reason: {restaurant.rejection_reason}
              </Text>
            )}
          </View>
        )}

        {/* Earnings Stats */}
        <View style={styles.earningsSection}>
          <View style={styles.earningsCard}>
            <View style={styles.earningsIconContainer}>
              <Ionicons name="cash-outline" size={24} color="#34C759" />
            </View>
            <View style={styles.earningsContent}>
              <Text style={styles.earningsLabel}>Daily Earnings</Text>
              <Text style={styles.earningsAmount}>₹{dailyEarnings.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.earningsCard}>
            <View style={styles.earningsIconContainer}>
              <Ionicons name="wallet-outline" size={24} color="#007AFF" />
            </View>
            <View style={styles.earningsContent}>
              <Text style={styles.earningsLabel}>Monthly Earnings</Text>
              <Text style={styles.earningsAmount}>₹{monthlyEarnings.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Order Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.statNumber}>{newOrders.length}</Text>
            <Text style={styles.statLabel}>New Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color="#FF9500" />
            <Text style={styles.statNumber}>{preparingOrders.length}</Text>
            <Text style={styles.statLabel}>Preparing</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
            <Text style={styles.statNumber}>{readyOrders.length}</Text>
            <Text style={styles.statLabel}>Ready</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.statNumber}>{todayOrdersList.length}</Text>
            <Text style={styles.statLabel}>Total Today</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleManageOrders}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="cube-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonText}>Manage Orders</Text>
              <Text style={styles.actionButtonSubtext}>View and update order status</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleManageMenu}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="restaurant-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonText}>Manage Menu</Text>
              <Text style={styles.actionButtonSubtext}>Add, edit, or remove items</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleEditRestaurant}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonText}>Edit Restaurant</Text>
              <Text style={styles.actionButtonSubtext}>Edit all restaurant details including payment info</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleRatingAndOrderHistory}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="star-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonText}>Rating & History</Text>
              <Text style={styles.actionButtonSubtext}>View ratings, reviews, and order history</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDeleteRestaurant}
          >
            <View style={styles.actionButtonIcon}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Restaurant</Text>
              <Text style={[styles.actionButtonSubtext, styles.deleteButtonSubtext]}>
                Permanently delete your restaurant and all associated data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavBar currentScreen="Home" homeRoute="RestaurantHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flex: 1,
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
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    marginLeft: theme.spacing.md,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    marginBottom: 8,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#34C759',
  },
  pausedButton: {
    backgroundColor: '#FF9500',
  },
  rejectedButton: {
    backgroundColor: '#FF3B30',
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    marginTop: 0,
  },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    color: '#E65100',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectedBanner: {
    backgroundColor: '#F8D7DA',
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#DC3545',
  },
  rejectedText: {
    color: '#721C24',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  rejectionReason: {
    color: '#721C24',
    fontSize: 11,
    fontStyle: 'italic',
  },
  earningsSection: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  earningsCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  earningsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  earningsContent: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: '47%',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  actionButton: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  deleteButtonSubtext: {
    color: '#FF3B30',
    opacity: 0.8,
  },
  recentOrdersContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderStatus: {
    fontSize: 12,
    color: '#666',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  noRestaurantContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noRestaurantTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  noRestaurantSubtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  createRestaurantButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  createRestaurantButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

