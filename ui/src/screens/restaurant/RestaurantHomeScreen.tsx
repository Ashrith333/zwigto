import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { orderService, restaurantService, authService, menuService } from '../../services';
import { Order, RestaurantProfile, OrderStatus } from '../../../shared/api-contracts';
import { theme } from '../../theme/theme';
import { BottomNavBar } from '../../components/BottomNavBar';

export const RestaurantHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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

  const newOrders = todayOrders.filter(o => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.PENDING);
  const preparingOrders = todayOrders.filter(o => o.status === OrderStatus.PREPARING);
  const readyOrders = todayOrders.filter(o => o.status === OrderStatus.READY);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 100 + Math.max(insets.bottom, 8) }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
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

          <TouchableOpacity style={styles.actionButton} onPress={handleRatingAndOrderHistory}>
            <Text style={styles.actionButtonText}>⭐ Rating and Order History</Text>
            <Text style={styles.actionButtonSubtext}>View ratings, reviews, and order history</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDeleteRestaurant}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑️ Delete Restaurant</Text>
            <Text style={[styles.actionButtonSubtext, styles.deleteButtonSubtext]}>
              Permanently delete your restaurant and all associated data
            </Text>
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
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
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

