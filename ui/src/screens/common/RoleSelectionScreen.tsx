import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService } from '../../services';
import { UserRole, UserProfile } from '../../../shared/api-contracts';

export const RoleSelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const checkAdminAccess = (phone: string): boolean => {
    // Normalize phone number for comparison - remove all non-digits
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    const adminPhone = '9676936825';
    
    // Check if phone ends with admin phone (handles +91, 91, or just the number)
    const isAdmin = normalizedPhone === adminPhone || 
                    normalizedPhone.endsWith(adminPhone) ||
                    normalizedPhone === `91${adminPhone}` ||
                    normalizedPhone === `919676936825`;
    
    console.log('Admin check:', {
      originalPhone: phone,
      normalizedPhone,
      adminPhone,
      isAdmin,
    });
    
    return isAdmin;
  };

  const loadUserProfile = async () => {
    try {
      // Try to get phone from stored auth data first (in case profile fetch fails)
      const authData = await AsyncStorage.getItem('auth_user_data');
      let phoneFromAuth = null;
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          phoneFromAuth = parsed.phone;
          if (phoneFromAuth && checkAdminAccess(phoneFromAuth)) {
            setShowAdmin(true);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      const profile = await userService.getProfile();
      setUserProfile(profile);
      
      // Check admin access with profile phone
      const isAdmin = checkAdminAccess(profile.phone);
      setShowAdmin(isAdmin);
      
      // Store user data for future use
      await AsyncStorage.setItem('auth_user_data', JSON.stringify({
        phone: profile.phone,
        role: profile.role,
      }));
    } catch (error: any) {
      console.error('Failed to load user profile:', error);
      
      // If profile fetch fails but we have phone from auth, use that
      if (phoneFromAuth) {
        const isAdmin = checkAdminAccess(phoneFromAuth);
        setShowAdmin(isAdmin);
      } else {
        setShowAdmin(false);
      }
      
      // If token is invalid, redirect to login
      if (error?.message?.includes('token') || error?.message?.includes('Unauthorized')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => {
                (navigation as any).navigate('UnifiedAuth');
              },
            },
          ]
        );
      }
    }
  };

  const handleRoleSelection = async (role: UserRole) => {
    setLoading(true);
    try {
      // Save default role if not already set
      if (!userProfile?.default_role) {
        try {
          await userService.setDefaultRole(role);
        } catch (error) {
          console.error('Failed to save default role:', error);
          // Continue with navigation even if save fails
        }
      }

      // Navigate based on role
      if (role === UserRole.USER) {
        (navigation as any).navigate('UserHome');
      } else if (role === UserRole.RESTAURANT) {
        (navigation as any).navigate('RestaurantHome');
      } else if (role === UserRole.ADMIN) {
        (navigation as any).navigate('AdminHome');
      }
    } catch (error) {
      // If navigation fails, still allow navigation based on selection
      if (role === UserRole.USER) {
        (navigation as any).navigate('UserHome');
      } else if (role === UserRole.RESTAURANT) {
        (navigation as any).navigate('RestaurantHome');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Zwigto</Text>
      <Text style={styles.subtitle}>How would you like to continue?</Text>

      <TouchableOpacity
        style={[styles.button, styles.userButton, loading && styles.buttonDisabled]}
        onPress={() => handleRoleSelection(UserRole.USER)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>I'm a Customer</Text>
        <Text style={styles.buttonSubtext}>Browse restaurants and order food</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.restaurantButton, loading && styles.buttonDisabled]}
        onPress={() => handleRoleSelection(UserRole.RESTAURANT)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>I'm a Restaurant Owner</Text>
        <Text style={styles.buttonSubtext}>Manage orders and menu</Text>
      </TouchableOpacity>

      {showAdmin && (
        <TouchableOpacity
          style={[styles.button, styles.adminButton, loading && styles.buttonDisabled]}
          onPress={() => handleRoleSelection(UserRole.ADMIN)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>I'm an Admin</Text>
          <Text style={styles.buttonSubtext}>Platform management</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  button: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userButton: {
    backgroundColor: '#007AFF',
  },
  restaurantButton: {
    backgroundColor: '#34C759',
  },
  adminButton: {
    backgroundColor: '#FF9500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
});

