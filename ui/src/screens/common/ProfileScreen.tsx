import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService, authService, restaurantService, orderService } from '../../services';
import { UserProfile, UserRole, Order, OrderStatus } from '../../../shared/api-contracts';
import { BottomNavBar } from '../../components/BottomNavBar';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const [showDefaultDropdown, setShowDefaultDropdown] = useState(false);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [hadRestaurant, setHadRestaurant] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPerPage = 5;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Load orders if user is a customer
    if (profile && (profile.role === UserRole.USER || !profile.role)) {
      loadOrders();
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      const userProfile = await userService.getProfile();
      setProfile(userProfile);
      setName(userProfile.name || '');
      
      // Check if user ever had a restaurant (persisted in AsyncStorage)
      try {
        const hadRestaurantStored = await AsyncStorage.getItem('had_restaurant');
        if (hadRestaurantStored === 'true') {
          setHadRestaurant(true);
        }
      } catch (error) {
        // Ignore storage errors
      }
      
      // Check if user owns a restaurant (regardless of role)
      try {
        const restaurant = await restaurantService.getMyRestaurant();
        const hasRest = !!restaurant;
        setHasRestaurant(hasRest);
        // If user has a restaurant, mark that they had one (persist for future reference after deletion)
        if (hasRest) {
          setHadRestaurant(true);
          await AsyncStorage.setItem('had_restaurant', 'true');
        }
      } catch (error) {
        // If error, assume no restaurant
        setHasRestaurant(false);
        console.log('No restaurant found for user');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load profile');
      console.error('Failed to load profile:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const myOrders = await orderService.getMyOrders();
      setOrders(myOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PICKED_UP:
        return '#4CAF50';
      case OrderStatus.READY:
        return '#FF9800';
      case OrderStatus.CANCELLED:
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setLoading(true);
    try {
      await userService.updateProfile(name.trim(), undefined);
      Alert.alert('Success', 'Profile updated successfully');
      await loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultView = async (role: UserRole) => {
    setLoading(true);
    try {
      await userService.setDefaultRole(role);
      // Reload profile to get updated default_role
      await loadProfile();
      Alert.alert('Success', 'Default view updated successfully. You will be taken to this section when you login next time.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update default view');
      console.error('Failed to update default role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToSection = (role: UserRole) => {
    setShowNavDropdown(false);
    if (role === UserRole.USER) {
      (navigation as any).navigate('UserHome');
    } else if (role === UserRole.RESTAURANT) {
      (navigation as any).navigate('RestaurantHome');
    } else if (role === UserRole.ADMIN) {
      (navigation as any).navigate('AdminHome');
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    if (role === UserRole.USER) {
      return '👤 Customer Section';
    } else if (role === UserRole.RESTAURANT) {
      return '🍽️ Restaurant Owner Section';
    } else {
      return '⚙️ Admin Section';
    }
  };

  const getDefaultRoleLabel = (role: UserRole): string => {
    if (role === UserRole.USER) {
      return "I'm a Customer";
    } else if (role === UserRole.RESTAURANT) {
      return "I'm a Restaurant Owner";
    } else {
      return "I'm an Admin";
    }
  };

  const getCurrentDefaultLabel = (): string => {
    if (!profile?.default_role) {
      return 'Select default view...';
    }
    return getDefaultRoleLabel(profile.default_role);
  };

  const getCurrentSectionLabel = (): string => {
    // Get the current route name from navigation state
    const state = (navigation as any).getState?.();
    const currentRoute = state?.routes?.[state?.index];
    const currentRouteName = currentRoute?.name || route.name;
    
    // Determine which section we're currently in based on route name
    if (currentRouteName === 'UserHome') {
      return getRoleLabel(UserRole.USER);
    } else if (currentRouteName === 'RestaurantHome') {
      return getRoleLabel(UserRole.RESTAURANT);
    } else if (currentRouteName === 'AdminHome') {
      return getRoleLabel(UserRole.ADMIN);
    }
    
    // Default to showing based on profile role if route doesn't match
    if (profile?.role === UserRole.USER) {
      return getRoleLabel(UserRole.USER);
    } else if (profile?.role === UserRole.RESTAURANT) {
      return getRoleLabel(UserRole.RESTAURANT);
    } else if (profile?.role === UserRole.ADMIN) {
      return getRoleLabel(UserRole.ADMIN);
    }
    
    return 'Select section...';
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          (navigation as any).navigate('UnifiedAuth');
        },
      },
    ]);
  };

  const checkAdminAccess = (phone: string): boolean => {
    // Normalize phone number for comparison - remove all non-digits
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    const adminPhone = '9676936825';
    
    // Check if phone ends with admin phone (handles +91, 91, or just the number)
    const isAdmin = normalizedPhone === adminPhone || 
                    normalizedPhone.endsWith(adminPhone) ||
                    normalizedPhone === `91${adminPhone}` ||
                    normalizedPhone === `919676936825`;
    
    return isAdmin;
  };

  const getAvailableRoles = (): UserRole[] => {
    const roles: UserRole[] = [UserRole.USER];
    
    // Always show USER section
    // Show RESTAURANT if:
    // 1. User's role is RESTAURANT or ADMIN, OR
    // 2. User owns a restaurant (has entry in restaurant_users table), OR
    // 3. User previously had a restaurant (hadRestaurant flag)
    // This ensures users can still navigate to restaurant section after deletion to create a new one
    // Any authenticated user can create a restaurant, so we should allow navigation
    if (profile?.role === UserRole.RESTAURANT || 
        profile?.role === UserRole.ADMIN || 
        hasRestaurant ||
        hadRestaurant) {
      roles.push(UserRole.RESTAURANT);
    }
    
    // Show ADMIN only if user is ADMIN (check both role and phone)
    const isAdmin = profile?.role === UserRole.ADMIN || (profile?.phone && checkAdminAccess(profile.phone));
    if (isAdmin) {
      roles.push(UserRole.ADMIN);
    }
    
    return roles;
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 100 + Math.max(insets.bottom, 8) }}
        onScrollBeginDrag={() => {
          // Close dropdowns when scrolling
          setShowNavDropdown(false);
          setShowDefaultDropdown(false);
        }}
      >
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={profile.phone} editable={false} />
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
        />
        <TouchableOpacity
          style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSaveProfile}
          disabled={loading || !name.trim()}
        >
          <Text style={styles.buttonText}>Save Name</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Navigate to Sections</Text>
        <Text style={styles.sectionDescription}>
          Switch between different sections of the app.
        </Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={[styles.dropdownButton, loading && styles.buttonDisabled]}
            onPress={() => setShowNavDropdown(!showNavDropdown)}
            disabled={loading}
          >
            <Text style={styles.dropdownButtonText}>{getCurrentSectionLabel()}</Text>
            <Text style={styles.dropdownArrow}>{showNavDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showNavDropdown && (
            <View style={styles.dropdownList}>
              {getAvailableRoles().map((role, index, array) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.dropdownItem,
                    index === array.length - 1 && styles.dropdownItemLast,
                  ]}
                  onPress={() => handleNavigateToSection(role)}
                >
                  <Text style={styles.dropdownItemText}>{getRoleLabel(role)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Set Default View</Text>
        <Text style={styles.sectionDescription}>
          Select your default view. This will be your default page when you login next time.
        </Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={[
              styles.dropdownButton,
              profile.default_role && styles.dropdownButtonActive,
              loading && styles.buttonDisabled,
            ]}
            onPress={() => setShowDefaultDropdown(!showDefaultDropdown)}
            disabled={loading}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                profile.default_role && styles.dropdownButtonTextActive,
              ]}
            >
              {getCurrentDefaultLabel()}
            </Text>
            <Text style={styles.dropdownArrow}>
              {showDefaultDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showDefaultDropdown && (
            <View style={styles.dropdownList}>
              {getAvailableRoles().map((role, index, array) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.dropdownItem,
                    index === array.length - 1 && styles.dropdownItemLast,
                    profile.default_role === role && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    handleSetDefaultView(role);
                    setShowDefaultDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      profile.default_role === role && styles.dropdownItemTextActive,
                    ]}
                  >
                    {getDefaultRoleLabel(role)}
                    {profile.default_role === role && ' ✓'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {(profile?.role === UserRole.USER || !profile?.role) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setOrdersExpanded(!ordersExpanded)}
          >
            <Text style={styles.sectionTitle}>Orders</Text>
            <Text style={styles.expandIcon}>{ordersExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          {ordersExpanded && (
            <>
              {loadingOrders ? (
                <Text style={styles.loadingText}>Loading orders...</Text>
              ) : orders.length === 0 ? (
                <Text style={styles.emptyText}>No orders yet</Text>
              ) : (
                <>
                  <View style={styles.ordersList}>
                    {orders
                      .slice(0, ordersPage * ordersPerPage)
                      .map((order) => (
                        <TouchableOpacity
                          key={order.id}
                          style={styles.orderCard}
                          onPress={() => (navigation as any).navigate('OrderTracking', { orderId: order.id })}
                        >
                          <View style={styles.orderHeader}>
                            <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: getStatusColor(order.status) },
                              ]}
                            >
                              <Text style={styles.statusText}>{order.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.orderAmount}>₹{order.total_amount}</Text>
                          <Text style={styles.orderDate}>
                            {new Date(order.created_at).toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                  {orders.length > ordersPage * ordersPerPage && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => setOrdersPage(ordersPage + 1)}
                    >
                      <Text style={styles.loadMoreText}>▶ Load More Orders</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <TouchableOpacity
          style={[styles.button, styles.changePasswordButton]}
          onPress={() => setShowChangePassword(true)}
        >
          <Text style={styles.buttonText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showChangePassword}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              secureTextEntry
            />
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry
            />
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
      <BottomNavBar 
        currentScreen="Profile" 
        homeRoute={
          profile?.role === UserRole.RESTAURANT 
            ? 'RestaurantHome' 
            : profile?.role === UserRole.ADMIN 
            ? 'AdminHome' 
            : 'UserHome'
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
  scrollContent: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  expandIcon: {
    fontSize: 16,
    color: '#666',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  changePasswordButton: {
    backgroundColor: '#34C759',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdownButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  dropdownButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemActive: {
    backgroundColor: '#E3F2FD',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
  ordersList: {
    marginTop: 10,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
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
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  loadMoreButton: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});

