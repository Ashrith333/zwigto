import React, { useState, useEffect, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService, authService, restaurantService, orderService } from '../../services';
import { UserProfile, UserRole, Order, OrderStatus } from '../../../shared/api-contracts';
import { BottomNavBar } from '../../components/BottomNavBar';
import { theme } from '../../theme/theme';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const [showDefaultDropdown, setShowDefaultDropdown] = useState(false);
  const [navDropdownLayout, setNavDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [defaultDropdownLayout, setDefaultDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const navDropdownRef = useRef<View>(null);
  const defaultDropdownRef = useRef<View>(null);
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
    // Load orders for all roles
    if (profile) {
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
        showsVerticalScrollIndicator={false}
      >
      {/* Modern Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile.name || profile.phone || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.profileName}>
          {profile.name || 'User'}
        </Text>
        <Text style={styles.profilePhone}>{profile.phone}</Text>
        {profile.default_role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {profile.default_role === UserRole.USER ? '👤 Customer' :
               profile.default_role === UserRole.RESTAURANT ? '🍽️ Restaurant Owner' :
               '⚙️ Admin'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput 
              style={[styles.input, styles.inputDisabled]} 
              value={profile.phone} 
              editable={false} 
            />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.saveButton, 
              (name.trim() === (profile.name || '')) && styles.saveButtonDisabled,
              loading && styles.buttonDisabled
            ]}
            onPress={handleSaveProfile}
            disabled={loading || !name.trim() || name.trim() === (profile.name || '')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="checkmark" 
              size={14} 
              color={(name.trim() === (profile.name || '')) ? theme.colors.textSecondary : "#fff"} 
              style={styles.buttonIcon} 
            />
            <Text style={[
              styles.buttonText,
              (name.trim() === (profile.name || '')) && styles.saveButtonTextDisabled
            ]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.changePasswordButton]}
            onPress={() => setShowChangePassword(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="key-outline" size={14} color={theme.colors.textPrimary} style={styles.buttonIcon} />
            <Text style={styles.buttonTextWhite}>Password</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={14} color={theme.colors.textPrimary} style={styles.buttonIcon} />
            <Text style={styles.buttonTextWhite}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="navigate-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Navigate to Sections</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Switch between different sections of the app
        </Text>
        <View 
          style={styles.dropdownContainer}
          ref={navDropdownRef}
          collapsable={false}
          onLayout={() => {
            if (navDropdownRef.current) {
              navDropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
                setNavDropdownLayout({ x: pageX, y: pageY, width, height });
              });
            }
          }}
        >
          <TouchableOpacity
            style={[styles.dropdownButton, loading && styles.buttonDisabled]}
            onPress={() => {
              if (navDropdownRef.current) {
                navDropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
                  setNavDropdownLayout({ x: pageX, y: pageY, width, height });
                });
              }
              setShowNavDropdown(!showNavDropdown);
            }}
            disabled={loading}
          >
            <Text style={styles.dropdownButtonText}>{getCurrentSectionLabel()}</Text>
            <Text style={styles.dropdownArrow}>{showNavDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="home-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Set Default View</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Choose your default landing page for future logins
        </Text>
        <View 
          style={styles.dropdownContainer}
          ref={defaultDropdownRef}
          collapsable={false}
          onLayout={() => {
            if (defaultDropdownRef.current) {
              defaultDropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
                setDefaultDropdownLayout({ x: pageX, y: pageY, width, height });
              });
            }
          }}
        >
          <TouchableOpacity
            style={[
              styles.dropdownButton,
              profile.default_role && styles.dropdownButtonActive,
              loading && styles.buttonDisabled,
            ]}
            onPress={() => {
              if (defaultDropdownRef.current) {
                defaultDropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
                  setDefaultDropdownLayout({ x: pageX, y: pageY, width, height });
                });
              }
              setShowDefaultDropdown(!showDefaultDropdown);
            }}
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
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Orders</Text>
          <TouchableOpacity
            onPress={() => setOrdersExpanded(!ordersExpanded)}
            activeOpacity={0.7}
            style={styles.expandButton}
          >
            <Ionicons 
              name={ordersExpanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color={theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
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


      <Modal
        visible={showChangePassword}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Password</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => {
                  setShowChangePassword(false);
                  setShowForgotPassword(true);
                }}
                style={styles.forgotPasswordLink}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.modalCancelButton]}
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
                style={[styles.button, styles.modalUpdateButton, loading && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Navigate to Sections Dropdown Modal */}
      <Modal
        visible={showNavDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNavDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowNavDropdown(false)}
        >
          <View
            style={[
              styles.dropdownList,
              {
                position: 'absolute',
                top: navDropdownLayout.y + navDropdownLayout.height + 4,
                left: navDropdownLayout.x,
                width: navDropdownLayout.width,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {getAvailableRoles().map((role, index, array) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.dropdownItem,
                  index === array.length - 1 && styles.dropdownItemLast,
                ]}
                onPress={() => {
                  handleNavigateToSection(role);
                  setShowNavDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{getRoleLabel(role)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Set Default View Dropdown Modal */}
      <Modal
        visible={showDefaultDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDefaultDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowDefaultDropdown(false)}
        >
          <View
            style={[
              styles.dropdownList,
              {
                position: 'absolute',
                top: defaultDropdownLayout.y + defaultDropdownLayout.height + 4,
                left: defaultDropdownLayout.x,
                width: defaultDropdownLayout.width,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
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
        </TouchableOpacity>
      </Modal>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPassword}
        onClose={() => {
          setShowForgotPassword(false);
        }}
        userPhone={profile?.phone}
      />

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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: theme.colors.primary,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...theme.shadows.md,
  },
  avatarContainer: {
    marginBottom: theme.spacing.xs,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing.xs,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    marginTop: 2,
  },
  roleBadgeText: {
    ...theme.typography.smallBold,
    color: '#fff',
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  expandButton: {
    marginLeft: 'auto',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 2,
  },
  inputIcon: {
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 0,
  },
  inputDisabled: {
    backgroundColor: theme.colors.background,
    color: theme.colors.textSecondary,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
    minHeight: 36,
  },
  buttonIcon: {
    marginRight: theme.spacing.xs,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    flex: 0.5,
    marginTop: 0,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  buttonThird: {
    flex: 1,
    marginTop: 0,
  },
  buttonHalf: {
    flex: 1,
    marginTop: 0,
  },
  changePasswordButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    flex: 1.2,
    marginTop: 0,
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    flex: 0.9,
    marginTop: 0,
  },
  buttonTextWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cancelButton: {
    backgroundColor: theme.colors.textTertiary,
  },
  modalCancelButton: {
    backgroundColor: theme.colors.textTertiary,
    flex: 1,
    marginTop: 0,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
  },
  modalUpdateButton: {
    backgroundColor: theme.colors.primary,
    flex: 1,
    marginTop: 0,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dropdownButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#E3F2FD',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    flex: 1,
  },
  dropdownButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownList: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.lg,
    elevation: 25,
  },
  dropdownItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemActive: {
    backgroundColor: '#E3F2FD',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textPrimary,
  },
  dropdownItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  modalInputGroup: {
    marginBottom: theme.spacing.md,
  },
  modalInput: {
    width: '100%',
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
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
    marginTop: theme.spacing.sm,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    ...theme.shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.round,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: theme.colors.textPrimary,
  },
  orderDate: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  loadMoreButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadMoreText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
});

// Forgot Password Modal Component
const ForgotPasswordModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  userPhone?: string;
}> = ({ visible, onClose, userPhone }) => {
  const [phone, setPhone] = useState(userPhone || '+91');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (userPhone) {
      setPhone(userPhone);
    }
  }, [userPhone]);

  const handleRequestOtp = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    setLoading(true);
    try {
      await authService.requestPasswordReset(formattedPhone);
      Alert.alert('Success', 'OTP sent to your phone number');
      setStep('otp');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    setLoading(true);
    try {
      await authService.resetPassword(formattedPhone, otp, newPassword);
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'OK', onPress: onClose },
      ]);
      // Reset form
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('phone');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('phone');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Reset Password</Text>

          {step === 'phone' && (
            <>
              <View style={styles.modalInputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="+91XXXXXXXXXX"
                  value={phone}
                  onChangeText={(text) => {
                    if (text.length > 0 && !text.startsWith('+')) {
                      setPhone(`+91${text}`);
                    } else {
                      setPhone(text);
                    }
                  }}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!userPhone}
                />
              </View>
              <TouchableOpacity
                style={[styles.button, styles.modalUpdateButton, loading && styles.buttonDisabled]}
                onPress={handleRequestOtp}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <View style={styles.modalInputGroup}>
                <Text style={styles.label}>Enter OTP sent to {phone}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.button, styles.modalUpdateButton, (loading || !otp) && styles.buttonDisabled]}
                onPress={() => {
                  if (otp.length === 6) {
                    setStep('password');
                  } else {
                    Alert.alert('Error', 'Please enter a valid 6-digit OTP');
                  }
                }}
                disabled={loading || !otp}
              >
                <Text style={styles.buttonText}>Verify OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.linkButton}>
                <Text style={styles.linkText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'password' && (
            <>
              <View style={styles.modalInputGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.modalInputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity
                style={[styles.button, styles.modalUpdateButton, (loading || !newPassword || !confirmPassword) && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading || !newPassword || !confirmPassword}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('otp')} style={styles.linkButton}>
                <Text style={styles.linkText}>Back to OTP</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={handleClose} style={styles.linkButton}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

