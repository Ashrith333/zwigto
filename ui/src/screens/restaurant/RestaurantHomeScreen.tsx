import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { orderService, restaurantService, authService, menuService } from '../../services';
import { Order, RestaurantProfile, OrderStatus } from '../../../shared/api-contracts';

export const RestaurantHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

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

      // Load today's orders
      try {
        const orders = await orderService.getRestaurantOrders();
        const today = new Date().toISOString().split('T')[0];
        const todayOrdersList = orders.filter((order) =>
          order.created_at.startsWith(today)
        );
        setTodayOrders(todayOrdersList);
      } catch (orderError) {
        // If orders fail to load, still allow dashboard to show
        console.warn('Failed to load orders:', orderError);
        setTodayOrders([]);
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

  const handleRatings = () => {
    (navigation as any).navigate('RestaurantRatings');
  };

  const handleOrderHistory = () => {
    (navigation as any).navigate('RestaurantOrderHistory');
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
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Restaurant not found</Text>
        <Text style={styles.errorSubtext}>
          You are not linked to any restaurant. Please contact admin.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadDashboard}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const newOrders = todayOrders.filter(o => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.PENDING);
  const preparingOrders = todayOrders.filter(o => o.status === OrderStatus.PREPARING);
  const readyOrders = todayOrders.filter(o => o.status === OrderStatus.READY);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{restaurant.name}</Text>
          <Text style={styles.subtitle}>Restaurant Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
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
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{newOrders.length}</Text>
          <Text style={styles.statLabel}>New Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{preparingOrders.length}</Text>
          <Text style={styles.statLabel}>Preparing</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{readyOrders.length}</Text>
          <Text style={styles.statLabel}>Ready</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{todayOrders.length}</Text>
          <Text style={styles.statLabel}>Total Today</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleManageOrders}>
          <Text style={styles.actionButtonText}>📦 Manage Orders</Text>
          <Text style={styles.actionButtonSubtext}>View and update order status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleManageMenu}>
          <Text style={styles.actionButtonText}>🍽️ Manage Menu</Text>
          <Text style={styles.actionButtonSubtext}>Add, edit, or remove items</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleEditRestaurant}>
          <Text style={styles.actionButtonText}>✏️ Edit Restaurant</Text>
          <Text style={styles.actionButtonSubtext}>Edit all restaurant details including payment info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleRatings}>
          <Text style={styles.actionButtonText}>⭐ Ratings & Feedback</Text>
          <Text style={styles.actionButtonSubtext}>View customer reviews</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleOrderHistory}>
          <Text style={styles.actionButtonText}>📋 Order History</Text>
          <Text style={styles.actionButtonSubtext}>View past orders</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
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
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#34C759',
  },
  pausedButton: {
    backgroundColor: '#FF9500',
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectedBanner: {
    backgroundColor: '#F8D7DA',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  rejectedText: {
    color: '#721C24',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  rejectionReason: {
    color: '#721C24',
    fontSize: 12,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#666',
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
});

